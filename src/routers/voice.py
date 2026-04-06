from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Form
from fastapi.responses import Response

from src.voice.session import session_store
from src.voice.states import BookingState, next_state, extract_party_size
from src.voice.agent import get_agent_reply
from src.voice.twiml import say_and_gather, say_and_hangup, greet

router = APIRouter(prefix="/voice", tags=["voice"])

# Replace with your real restaurant UUID once seeded in the DB
RESTAURANT_ID = "1194490b-1aa1-4500-87ce-53bd6441baec"
GATHER_URL = "/api/v1/voice/gather"


@router.post("/incoming")
async def incoming_call(
    CallSid: str = Form(...),
    From: str = Form(...),
) -> Response:
    session = session_store.get_or_create(CallSid, restaurant_id=RESTAURANT_ID)
    session.guest_phone = From
    session.state = BookingState.PARTY_SIZE
    return Response(content=greet(), media_type="application/xml")


@router.post("/gather")
async def gather(
    CallSid: str = Form(...),
    SpeechResult: Optional[str] = Form(default=None),
    Digits: Optional[str] = Form(default=None),
) -> Response:
    session = session_store.get_or_create(CallSid, restaurant_id=RESTAURANT_ID)
    user_input = (SpeechResult or Digits or "").strip()

    if not user_input:
        xml = say_and_gather(
            "Sorry, I didn't catch that. Could you repeat?",
            action=GATHER_URL,
        )
        return Response(content=xml, media_type="application/xml")

    # Extract structured data for current state before calling Claude
    if session.state == BookingState.PARTY_SIZE:
        val = extract_party_size(user_input)
        if val:
            session.party_size = val
            session.state = next_state(session.state)

    elif session.state == BookingState.DATE:
        session.slot_date = user_input
        session.state = next_state(session.state)

    elif session.state == BookingState.TIME:
        session.slot_time = user_input
        session.state = next_state(session.state)

    elif session.state == BookingState.GUEST_INFO:
        session.guest_name = user_input
        session.state = next_state(session.state)

    elif session.state == BookingState.CONFIRM:
        if any(w in user_input.lower() for w in ["yes", "confirm", "correct", "ok", "sure", "yep"]):
            session.state = BookingState.DONE
        else:
            session.state = BookingState.PARTY_SIZE
            session.party_size = None
            session.slot_date = None
            session.slot_time = None
            session.guest_name = None
            xml = say_and_gather(
                "No problem, let's start over. How many guests will be dining?",
                action=GATHER_URL,
            )
            return Response(content=xml, media_type="application/xml")

    # Get Claude's next spoken prompt
    say_text, is_done = get_agent_reply(session, user_input)

    if is_done or session.state == BookingState.DONE:
        session_store.delete(CallSid)
        farewell = say_text or "Your reservation is confirmed! We look forward to seeing you. Goodbye!"
        return Response(content=say_and_hangup(farewell), media_type="application/xml")

    xml = say_and_gather(say_text, action=GATHER_URL)
    return Response(content=xml, media_type="application/xml")
