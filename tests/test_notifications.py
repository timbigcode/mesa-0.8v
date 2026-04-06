import uuid
from datetime import date, time
from unittest.mock import patch

import pytest

from src.models import Channel, NotifChannel, NotifType
from src.modules.notifications import dispatch_notification, resolve_channel


def test_web_booking_routes_to_sms():
    channel = resolve_channel(booked_via=Channel.web)
    assert channel == NotifChannel.sms


def test_phone_booking_routes_to_sms():
    channel = resolve_channel(booked_via=Channel.phone)
    assert channel == NotifChannel.sms


def test_whatsapp_booking_routes_to_whatsapp():
    channel = resolve_channel(booked_via=Channel.whatsapp)
    assert channel == NotifChannel.whatsapp


def test_line_booking_routes_to_line():
    channel = resolve_channel(booked_via=Channel.line)
    assert channel == NotifChannel.line


def test_messenger_booking_routes_to_messenger():
    channel = resolve_channel(booked_via=Channel.messenger)
    assert channel == NotifChannel.messenger


def test_dispatch_logs_notification(db, restaurant, table):
    from src.models import Booking, BookingStatus, Guest

    guest = Guest(id=uuid.uuid4(), restaurant_id=restaurant.id, name="Frank", phone="+66800000020", preferred_channel=Channel.web)
    db.add(guest)
    db.flush()
    booking = Booking(
        id=uuid.uuid4(), restaurant_id=restaurant.id,
        guest_id=guest.id, table_id=table.id,
        slot_date=date(2026, 4, 6), slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2, status=BookingStatus.confirmed,
        booked_via=Channel.web, confirmation_code="RBK-7777",
    )
    db.add(booking)
    db.flush()

    with patch("src.modules.notifications._send_sms") as mock_sms:
        mock_sms.return_value = True
        dispatch_notification(db, booking=booking, notif_type=NotifType.confirmation)

    from src.models import NotificationLog, NotifStatus
    log = db.query(NotificationLog).filter(NotificationLog.booking_id == booking.id).first()
    assert log is not None
    assert log.status == NotifStatus.sent
    assert log.channel == NotifChannel.sms


@pytest.fixture
def booking_fixture(db, restaurant, table, lunch_slot):
    from src.modules.guests import get_or_create_guest
    from src.modules.reservations import create_booking
    from src.database import set_rls
    set_rls(db, str(restaurant.id))
    guest = get_or_create_guest(db, restaurant.id, "Alice", "+66800000001", None, Channel.web)
    return create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=date(2026, 4, 7), slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )


def test_dispatch_notification_returns_true_on_success(db, booking_fixture):
    with patch("src.modules.notifications._send_sms", return_value=True):
        result = dispatch_notification(db, booking=booking_fixture, notif_type=NotifType.confirmation)
    assert result is True


def test_dispatch_notification_returns_false_on_failure(db, booking_fixture):
    with patch("src.modules.notifications._send_sms", return_value=False):
        result = dispatch_notification(db, booking=booking_fixture, notif_type=NotifType.confirmation)
    assert result is False


def test_booking_out_has_notification_sent_default_true():
    from datetime import datetime
    from src.schemas.booking import BookingOut
    b = BookingOut(
        id=uuid.uuid4(),
        table_id=uuid.uuid4(),
        guest_id=uuid.uuid4(),
        slot_date=date(2026, 4, 7),
        slot_start_time=time(12, 0),
        duration_minutes=90,
        party_size=2,
        status="confirmed",
        special_requests=None,
        booked_via="web",
        confirmation_code="RBK-1234",
        created_at=datetime.now(),
    )
    assert b.notification_sent is True
