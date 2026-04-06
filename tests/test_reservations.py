import uuid
from datetime import date, datetime, time, timezone, timedelta

import pytest

from src.errors import (
    CancellationTooLateError,
    DuplicateBookingError,
    OutsideBookingHorizonError,
    SlotUnavailableError,
    TableCapacityExceededError,
)
from src.models import Booking, BookingStatus, Channel, Guest, WaitlistStatus
from src.modules.reservations import cancel_booking, create_booking


@pytest.fixture
def guest(db, restaurant):
    from src.modules.guests import get_or_create_guest
    return get_or_create_guest(db, restaurant.id, "Alice", "+66800000001", None, Channel.web)


@pytest.fixture
def guest2(db, restaurant):
    from src.modules.guests import get_or_create_guest
    return get_or_create_guest(db, restaurant.id, "Guest2", "+66800000099", None, Channel.web)


def test_create_booking_succeeds(db, restaurant, table, lunch_slot, guest):
    monday = date(2026, 4, 6)
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    assert booking.status == BookingStatus.confirmed
    assert booking.confirmation_code.startswith("RBK-")


def test_create_booking_fails_capacity_exceeded(db, restaurant, table, lunch_slot, guest):
    monday = date(2026, 4, 6)
    with pytest.raises(TableCapacityExceededError):
        create_booking(
            db, restaurant=restaurant, table=table, guest=guest,
            slot_date=monday, slot_start_time=time(12, 0),
            duration_minutes=90, party_size=99,
            booked_via=Channel.web, special_requests=None,
        )


def test_create_booking_fails_outside_horizon(db, restaurant, table, lunch_slot, guest):
    far_future = date(2030, 1, 1)
    with pytest.raises(OutsideBookingHorizonError):
        create_booking(
            db, restaurant=restaurant, table=table, guest=guest,
            slot_date=far_future, slot_start_time=time(12, 0),
            duration_minutes=90, party_size=2,
            booked_via=Channel.web, special_requests=None,
        )


def test_create_booking_fails_slot_unavailable(db, restaurant, table, lunch_slot, guest):
    monday = date(2026, 4, 6)
    create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    guest2 = Guest(id=uuid.uuid4(), restaurant_id=restaurant.id, name="Bob", phone="+66800000002", preferred_channel=Channel.web)
    db.add(guest2)
    db.flush()
    with pytest.raises(SlotUnavailableError):
        create_booking(
            db, restaurant=restaurant, table=table, guest=guest2,
            slot_date=monday, slot_start_time=time(12, 0),
            duration_minutes=90, party_size=2,
            booked_via=Channel.web, special_requests=None,
        )


def test_duplicate_booking_same_guest_same_slot(db, restaurant, table, lunch_slot, guest):
    monday = date(2026, 4, 6)
    create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    from src.models import Table, LocationType
    table2 = Table(id=uuid.uuid4(), restaurant_id=restaurant.id, label="T2", capacity=4, location_type=LocationType.indoor, is_active=True)
    db.add(table2)
    db.flush()
    with pytest.raises(DuplicateBookingError):
        create_booking(
            db, restaurant=restaurant, table=table2, guest=guest,
            slot_date=monday, slot_start_time=time(12, 0),
            duration_minutes=90, party_size=2,
            booked_via=Channel.web, special_requests=None,
        )


def test_cancel_booking_within_cutoff(db, restaurant, table, lunch_slot, guest):
    monday = date(2026, 4, 6)
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    cancel_booking(db, booking, restaurant)
    assert booking.status == BookingStatus.cancelled


def test_cancel_booking_past_cutoff_raises(db, restaurant, table, lunch_slot, guest):
    import datetime as dt
    now = dt.datetime.now(tz=timezone.utc)
    soon = now + timedelta(hours=1)
    booking = Booking(
        id=uuid.uuid4(), restaurant_id=restaurant.id,
        guest_id=guest.id, table_id=table.id,
        slot_date=soon.date(), slot_start_time=soon.time().replace(microsecond=0),
        duration_minutes=90, party_size=2, status=BookingStatus.confirmed,
        booked_via=Channel.web, confirmation_code="RBK-9999",
    )
    db.add(booking)
    db.flush()
    with pytest.raises(CancellationTooLateError):
        cancel_booking(db, booking, restaurant)


def test_cancel_triggers_waitlist_promotion(db, restaurant, table, lunch_slot, guest, guest2):
    from src.modules.waitlist import join_waitlist
    monday = date(2026, 4, 6)
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    entry = join_waitlist(db, restaurant_id=restaurant.id, guest=guest2, table=table,
                          slot_date=monday, slot_start_time=time(12, 0), party_size=2)
    cancel_booking(db, booking, restaurant)
    db.refresh(entry)
    assert entry.status == WaitlistStatus.notified


def test_get_booking_by_code_found(db, restaurant, table, lunch_slot, guest):
    from src.models import Booking
    from src.database import set_rls
    monday = date(2026, 4, 6)
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    found = db.query(Booking).filter(
        Booking.confirmation_code == booking.confirmation_code,
        Booking.restaurant_id == restaurant.id,
    ).first()
    assert found is not None
    assert found.id == booking.id


def test_list_bookings_guest_name_filter(db, restaurant, table, lunch_slot, guest):
    import uuid as _uuid
    from src.models import Booking, Guest, LocationType, Table
    from src.database import set_rls

    set_rls(db, str(restaurant.id))
    monday = date(2026, 4, 6)
    create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    bob_guest = Guest(
        id=_uuid.uuid4(), restaurant_id=restaurant.id,
        name="Bob", phone="+66800000099", preferred_channel=Channel.web,
    )
    db.add(bob_guest)
    table2 = Table(
        id=_uuid.uuid4(), restaurant_id=restaurant.id,
        label="T2", capacity=4, location_type=LocationType.indoor, is_active=True,
    )
    db.add(table2)
    db.flush()
    create_booking(
        db, restaurant=restaurant, table=table2, guest=bob_guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    results = (
        db.query(Booking)
        .join(Guest, Booking.guest_id == Guest.id)
        .filter(
            Booking.restaurant_id == restaurant.id,
            Guest.name.ilike("%ali%"),
        )
        .all()
    )
    assert len(results) == 1
    assert results[0].guest_id == guest.id
