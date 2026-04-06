from __future__ import annotations
from fastapi import APIRouter, Form
from fastapi.responses import Response

from src.whatsapp.session import wa_session_store, WaState
from src.whatsapp.agent import get_wa_reply
from src.whatsapp.sender import send_whatsapp

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

RESTAURANT_ID = "00000000-0000-0000-0000-000000000001"

GREETING = (
    "👋 Welcome! I can help you book a table.\n\n"
    "Just reply *book* to make a reservation, or *cancel CONFIRM-CODE* to cancel an existing one."
)


@router.post("/incoming")
async def incoming_message(
    From: str = Form(...),
    Body: str = Form(...),
    WaId: str = Form(...),
) -> Response:
    body = Body.strip()
    session = wa_session_store.get_or_create(From, restaurant_id=RESTAURANT_ID)

    # ── Hard commands ──────────────────────────────────────────────────────
    if body.lower() in ("book", "reserve", "hi", "hello", "start", "hola"):
        session.reset()
        session.state = WaState.PARTY_SIZE
        send_whatsapp(
            to=From,
            body="Great, let's get you booked! 🍽️\n\nHow many guests will be dining?",
        )
        return Response(content="OK", media_type="text/plain")

    if body.lower().startswith("cancel "):
        code = body[7:].strip().upper()
        send_whatsapp(
            to=From,
            body=f"Got it. We'll process the cancellation for *{code}* and confirm shortly.",
        )
        return Response(content="OK", media_type="text/plain")

    # ── No active session → send greeting ─────────────────────────────────
    if session.state == WaState.IDLE:
        send_whatsapp(to=From, body=GREETING)
        return Response(content="OK", media_type="text/plain")

    # ── Active booking conversation ────────────────────────────────────────
    reply_text, next_state_str, data = get_wa_reply(session, body)

    # Apply extracted structured data to session
    if "party_size" in data:
        session.party_size = int(data["party_size"])
    if "slot_date" in data:
        session.slot_date = str(data["slot_date"])
    if "slot_time" in data:
        session.slot_time = str(data["slot_time"])
    if "guest_name" in data:
        session.guest_name = str(data["guest_name"])

    # Advance state
    try:
        session.state = WaState(next_state_str)
    except ValueError:
        session.state = WaState.IDLE

    if session.state == WaState.DONE:
        wa_session_store.delete(From)

    send_whatsapp(to=From, body=reply_text)
    return Response(content="OK", media_type="text/plain")
