from __future__ import annotations
from typing import Optional
from twilio.rest import Client
from src.config import settings

_twilio_client: Optional[Client] = None


def _get_client() -> Client:
    global _twilio_client
    if _twilio_client is None:
        _twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _twilio_client


# Expose a module-level name that tests can patch
twilio_client = _get_client


def send_whatsapp(to: str, body: str) -> str:
    """Send a WhatsApp message via Twilio. Returns message SID."""
    from_number = f"whatsapp:{settings.twilio_from_number}"
    to_number = f"whatsapp:{to}" if not to.startswith("whatsapp:") else to
    msg = _get_client().messages.create(
        from_=from_number,
        to=to_number,
        body=body,
    )
    return msg.sid
