from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from src.config import settings
from src.models import Booking, Channel, NotifChannel, NotifStatus, NotifType, NotificationLog, WaitlistEntry


def resolve_channel(booked_via: Channel) -> NotifChannel:
    mapping = {
        Channel.whatsapp: NotifChannel.whatsapp,
        Channel.line: NotifChannel.line,
        Channel.messenger: NotifChannel.messenger,
    }
    return mapping.get(booked_via, NotifChannel.sms)


def _send_sms(to: str, message: str) -> bool:
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(body=message, from_=settings.twilio_from_number, to=to)
        return True
    except Exception:
        return False


def _send_email(to: str, subject: str, body: str) -> bool:
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        message = Mail(from_email=settings.sendgrid_from_email, to_emails=to, subject=subject, plain_text_content=body)
        sg.send(message)
        return True
    except Exception:
        return False


def _send_channel_message(channel: NotifChannel, to: str, message: str) -> bool:
    """Placeholder for WhatsApp/LINE/Messenger — integrate per-channel webhook in future."""
    return True


def dispatch_notification(
    db: Session,
    booking: Booking | None = None,
    waitlist_entry: WaitlistEntry | None = None,
    notif_type: NotifType = NotifType.confirmation,
) -> bool:
    assert booking is not None or waitlist_entry is not None

    if booking:
        booked_via = booking.booked_via
        channel = resolve_channel(booked_via)
        from src.models import Guest
        guest = db.query(Guest).filter(Guest.id == booking.guest_id).first()
        message = _build_message(notif_type, booking=booking)
        target = guest.phone
    else:
        channel = NotifChannel.sms
        from src.models import Guest
        guest = db.query(Guest).filter(Guest.id == waitlist_entry.guest_id).first()
        message = "Good news! A slot has opened up. Your confirmation code will be issued when you confirm."
        target = guest.phone

    if channel == NotifChannel.sms:
        success = _send_sms(target, message)
    elif channel in (NotifChannel.whatsapp, NotifChannel.line, NotifChannel.messenger):
        success = _send_channel_message(channel, target, message)
    else:
        success = _send_email(target, "Booking Update", message)

    log = NotificationLog(
        id=uuid.uuid4(),
        booking_id=booking.id if booking else None,
        waitlist_id=waitlist_entry.id if waitlist_entry else None,
        channel=channel,
        type=notif_type,
        status=NotifStatus.sent if success else NotifStatus.failed,
        sent_at=datetime.now(tz=timezone.utc) if success else None,
    )
    db.add(log)
    db.flush()
    return success


def _build_message(notif_type: NotifType, booking: Booking) -> str:
    slot = f"{booking.slot_date} at {booking.slot_start_time.strftime('%H:%M')}"
    if notif_type == NotifType.confirmation:
        return f"Booking confirmed! Code: {booking.confirmation_code}. Table for {booking.party_size} on {slot}."
    if notif_type == NotifType.reminder:
        return f"Reminder: your booking ({booking.confirmation_code}) is tomorrow at {booking.slot_start_time.strftime('%H:%M')}."
    if notif_type == NotifType.cancellation:
        return f"Your booking {booking.confirmation_code} has been cancelled."
    return f"Booking update for {booking.confirmation_code}."
