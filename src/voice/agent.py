from __future__ import annotations
import re
from typing import TYPE_CHECKING, Tuple

import anthropic
from src.config import settings

if TYPE_CHECKING:
    from src.voice.session import CallSession

SYSTEM_PROMPT = """\
You are a friendly restaurant phone booking assistant. Your job is to collect:
1. Party size (number of guests)
2. Preferred date (say it back as YYYY-MM-DD)
3. Preferred time (say it back as HH:MM in 24-hour format)
4. Guest's full name
Then confirm the booking details and say "DONE" when confirmed.

Current state: {state}
Already collected:
- Party size: {party_size}
- Date: {slot_date}
- Time: {slot_time}
- Guest name: {guest_name}

Rules:
- Ask for ONE piece of information at a time.
- Be brief and warm — this is a phone call (max 2 short sentences).
- Always start your reply with "SAY: " followed by exactly what to say aloud.
- When all details are confirmed by the caller, end your reply with " DONE".
- If anything is unclear, ask the caller to repeat.
"""


def _build_prompt(session: "CallSession") -> str:
    return SYSTEM_PROMPT.format(
        state=session.state.value,
        party_size=session.party_size or "not yet collected",
        slot_date=session.slot_date or "not yet collected",
        slot_time=session.slot_time or "not yet collected",
        guest_name=session.guest_name or "not yet collected",
    )


def parse_agent_response(text: str) -> Tuple[str, bool]:
    """Returns (say_text, is_done)."""
    is_done = "DONE" in text.upper()
    m = re.search(r"SAY:\s*(.+?)(?:\s*DONE\s*)?$", text, re.IGNORECASE | re.DOTALL)
    say = m.group(1).strip() if m else text.strip()
    # Strip trailing DONE from the say text
    say = re.sub(r"\s*DONE\s*$", "", say, flags=re.IGNORECASE).strip()
    return say, is_done


def get_agent_reply(session: "CallSession", user_input: str) -> Tuple[str, bool]:
    """Call Claude Haiku and return (say_text, is_done)."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    messages = list(session.conversation)
    messages.append({"role": "user", "content": user_input})

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=_build_prompt(session),
        messages=messages,
    )
    reply_text = response.content[0].text
    session.conversation.append({"role": "user", "content": user_input})
    session.conversation.append({"role": "assistant", "content": reply_text})
    return parse_agent_response(reply_text)
