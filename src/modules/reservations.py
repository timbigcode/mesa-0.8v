from __future__ import annotations

import random
import string
import uuid
from datetime import date, datetime, time, timezone, timedelta

from sqlalchemy.orm import Session

from src.database import set_rls
from src.errors import (
    CancellationTooLateError,
    DuplicateBookingError,
    OutsideBookingHorizonError,
    SlotUnavailableError,
    TableCapacityExceededError,
)
from src.models import Booking, BookingStatus, Channel, Guest, Table
from src.models.restaurant import Restaurant


def _generate_code() -> str:
    suffix = "".join(random.choices(string.digits, k=4))
    return f"RBK-{suffix}"


def create_booking(
    db: Session,
    restaurant: Restaurant,
    table: Table,
    guest: Guest,
    slot_date: date,
    slot_start_time: time,
    duration_minutes: int,
    party_size: int,
    booked_via: Channel,
    special_requests: str | None,
) -> Booking:
    set_rls(db, str(restaurant.id))

    today = datetime.now(tz=timezone.utc).date()
    horizon = today + timedelta(days=restaurant.booking_horizon_days)
    if slot_date > horizon:
        raise OutsideBookingHorizonError()

    if party_size > table.capacity:
        raise TableCapacityExceededError()

    # Duplicate check: same guest, same slot (any table)
    dupe = db.query(Booking).filter(
        Booking.restaurant_id == restaurant.id,
        Booking.guest_id == guest.id,
        Booking.slot_date == slot_date,
        Booking.slot_start_time == slot_start_time,
        Booking.status == BookingStatus.confirmed,
    ).first()
    if dupe:
        raise DuplicateBookingError()

    # Slot availability check
    conflict = db.query(Booking).filter(
        Booking.restaurant_id == restaurant.id,
        Booking.table_id == table.id,
        Booking.slot_date == slot_date,
        Booking.slot_start_time == slot_start_time,
        Booking.status == BookingStatus.confirmed,
    ).first()
    if conflict:
        from src.modules.availability import get_slots_for_table, get_tables_for_slot
        available_slots = [
            str(s.start_time)
            for s in get_slots_for_table(db, restaurant, table, slot_date)
        ]
        available_tables = [
            t.label
            for t in get_tables_for_slot(db, restaurant, slot_date, slot_start_time, party_size)
        ]
        raise SlotUnavailableError(available_slots=available_slots, available_tables=available_tables)

    # Unique confirmation code
    code = _generate_code()
    while db.query(Booking).filter(Booking.confirmation_code == code).first():
        code = _generate_code()

    booking = Booking(
        id=uuid.uuid4(),
        restaurant_id=restaurant.id,
        guest_id=guest.id,
        table_id=table.id,
        slot_date=slot_date,
        slot_start_time=slot_start_time,
        duration_minutes=duration_minutes,
        party_size=party_size,
        status=BookingStatus.confirmed,
        special_requests=special_requests,
        booked_via=booked_via,
        confirmation_code=code,
    )
    db.add(booking)
    db.flush()
    return booking


def cancel_booking(db: Session, booking: Booking, restaurant: Restaurant) -> None:
    set_rls(db, str(restaurant.id))
    slot_dt = datetime.combine(booking.slot_date, booking.slot_start_time).replace(tzinfo=timezone.utc)
    cutoff = slot_dt - timedelta(hours=restaurant.cancellation_cutoff_hours)
    if datetime.now(tz=timezone.utc) > cutoff:
        raise CancellationTooLateError()
    booking.status = BookingStatus.cancelled
    db.flush()

    # Promote waitlist after cancellation
    from src.modules.waitlist import promote_waitlist
    from src.modules.notifications import dispatch_notification
    from src.models import NotifType

    promoted = promote_waitlist(
        db,
        restaurant_id=restaurant.id,
        table_id=booking.table_id,
        slot_date=booking.slot_date,
        slot_start_time=booking.slot_start_time,
    )
    if promoted:
        dispatch_notification(db, waitlist_entry=promoted, notif_type=NotifType.waitlist)
