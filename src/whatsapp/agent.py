from __future__ import annotations
import json
import re
from typing import TYPE_CHECKING, Any, Dict, Tuple

import anthropic
from src.config import settings

if TYPE_CHECKING:
    from src.whatsapp.session import WaSession

SYSTEM_PROMPT = """\
You are a WhatsApp restaurant booking assistant. Collect booking info step by step:
party size → date (YYYY-MM-DD) → time (HH:MM 24h) → guest name → confirm.

Current session:
- State: {state}
- Party size: {party_size}
- Date: {slot_date}
- Time: {slot_time}
- Guest name: {guest_name}

ALWAYS respond in exactly this format (3 lines):
REPLY: <your message to the guest — keep it short and friendly>
STATE: <next state: idle|party_size|date|time|guest_name|confirm|done>
DATA: <JSON object with any values extracted from the guest message, e.g. {{"party_size": 4}} or {{}}>

Rules:
- Ask for ONE thing at a time
- Accept natural language dates ("this Friday", "tomorrow") and normalise to YYYY-MM-DD in DATA
- Accept natural language times ("7pm", "half seven") and normalise to HH:MM in DATA
- When all data is confirmed by the guest, set STATE: done
- Use emojis sparingly to keep it warm but professional
"""


def build_system_prompt(session: "WaSession") -> str:
    return SYSTEM_PROMPT.format(
        state=session.state.value,
        party_size=session.party_size or "not set",
        slot_date=session.slot_date or "not set",
        slot_time=session.slot_time or "not set",
        guest_name=session.guest_name or "not set",
    )


def parse_wa_response(raw: str) -> Tuple[str, str, Dict[str, Any]]:
    """Parse Claude output → (reply_text, next_state, extracted_data)."""
    reply = ""
    state = "idle"
    data: Dict[str, Any] = {}

    m_reply = re.search(r"REPLY:\s*(.+?)(?=\nSTATE:|$)", raw, re.DOTALL)
    if m_reply:
        reply = m_reply.group(1).strip()

    m_state = re.search(r"STATE:\s*(\w+)", raw)
    if m_state:
        state = m_state.group(1).strip()

    m_data = re.search(r"DATA:\s*(\{.*?\})", raw, re.DOTALL)
    if m_data:
        try:
            data = json.loads(m_data.group(1))
        except json.JSONDecodeError:
            data = {}

    return reply, state, data


def get_wa_reply(
    session: "WaSession", user_message: str
) -> Tuple[str, str, Dict[str, Any]]:
    """Get Claude's reply, next state, and extracted data for a WhatsApp message."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    messages = list(session.conversation)
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=build_system_prompt(session),
        messages=messages,
    )
    raw = response.content[0].text
    session.conversation.append({"role": "user", "content": user_message})
    session.conversation.append({"role": "assistant", "content": raw})
    return parse_wa_response(raw)
