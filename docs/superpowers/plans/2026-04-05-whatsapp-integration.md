# WhatsApp Booking Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WhatsApp chatbot that lets guests book, modify, and cancel reservations via Twilio WhatsApp Business API, using Claude AI for natural-language understanding and the existing booking engine for persistence.

**Architecture:** Twilio sends incoming WhatsApp messages to a FastAPI webhook as form-encoded POST requests. A per-phone-number session (stored in-memory, keyed by `WaId`) tracks conversation state through the same state machine used by the voice bot. Claude (`claude-haiku-4-5`) interprets free-text messages and produces structured booking data + a reply message. Outbound messages are sent via `twilio.rest.Client.messages.create()`.

**Tech Stack:** Twilio Python SDK 9.x (already installed), FastAPI, Claude API (`anthropic` SDK, already installed), existing `src/modules/` business logic.

---

## File Structure

```
restaurant-booking/
  src/
    routers/
      whatsapp.py        ← Twilio WhatsApp webhook routes
    whatsapp/
      __init__.py
      session.py         ← Per-number chat session store
      agent.py           ← Claude API wrapper for WhatsApp context
      sender.py          ← Outbound message sender via Twilio
  tests/
    test_whatsapp.py     ← Unit tests for session, agent parsing, sender mock
```

---

### Task 1: Scaffold WhatsApp router

**Files:**
- Create: `restaurant-booking/src/whatsapp/__init__.py`
- Create: `restaurant-booking/src/routers/whatsapp.py`
- Modify: `restaurant-booking/src/main.py`

- [ ] **Step 1: Create `src/whatsapp/__init__.py`**

```python
# whatsapp package
```

- [ ] **Step 2: Create minimal `src/routers/whatsapp.py`**

```python
from __future__ import annotations
from fastapi import APIRouter, Form
from fastapi.responses import Response

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

@router.post("/incoming")
async def incoming_message(
    From: str = Form(...),
    Body: str = Form(...),
    WaId: str = Form(...),
) -> Response:
    return Response(content="OK", media_type="text/plain")
```

- [ ] **Step 3: Register router in `src/main.py`**

Add after the voice router registration:

```python
from src.routers import whatsapp as whatsapp_router
app.include_router(whatsapp_router.router, prefix="/api/v1")
```

- [ ] **Step 4: Verify server starts**

```bash
cd restaurant-booking
source .venv/bin/activate
uvicorn src.main:app --reload
```

Expected: `Application startup complete`

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/__init__.py src/routers/whatsapp.py src/main.py
git commit -m "feat(whatsapp): scaffold WhatsApp router"
```

---

### Task 2: WhatsApp session store

**Files:**
- Create: `restaurant-booking/src/whatsapp/session.py`
- Create: `restaurant-booking/tests/test_whatsapp.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatsapp.py
from src.whatsapp.session import WaSession, wa_session_store, WaState

def test_session_create():
    wa_session_store.clear()
    s = wa_session_store.get_or_create("+15005550006", restaurant_id="rest_001")
    assert s.wa_number == "+15005550006"
    assert s.state == WaState.IDLE

def test_session_idempotent():
    wa_session_store.clear()
    s1 = wa_session_store.get_or_create("+15005550006", restaurant_id="rest_001")
    s2 = wa_session_store.get_or_create("+15005550006", restaurant_id="rest_001")
    assert s1 is s2

def test_session_reset():
    wa_session_store.clear()
    s = wa_session_store.get_or_create("+15005550006", restaurant_id="rest_001")
    s.party_size = 4
    s.reset()
    assert s.party_size is None
    assert s.state == WaState.IDLE
```

- [ ] **Step 2: Run to verify failure**

```bash
cd restaurant-booking
source .venv/bin/activate
pytest tests/test_whatsapp.py -v
```

Expected: FAILED — missing module

- [ ] **Step 3: Create `src/whatsapp/session.py`**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

class WaState(str, Enum):
    IDLE       = "idle"
    PARTY_SIZE = "party_size"
    DATE       = "date"
    TIME       = "time"
    GUEST_NAME = "guest_name"
    CONFIRM    = "confirm"
    DONE       = "done"

@dataclass
class WaSession:
    wa_number: str
    restaurant_id: str
    state: WaState = WaState.IDLE
    party_size: Optional[int] = None
    slot_date: Optional[str] = None   # "YYYY-MM-DD"
    slot_time: Optional[str] = None   # "HH:MM"
    guest_name: Optional[str] = None
    conversation: List[dict] = field(default_factory=list)

    def reset(self) -> None:
        self.state = WaState.IDLE
        self.party_size = None
        self.slot_date = None
        self.slot_time = None
        self.guest_name = None
        self.conversation = []

class _WaSessionStore:
    def __init__(self) -> None:
        self._data: Dict[str, WaSession] = {}

    def get_or_create(self, wa_number: str, restaurant_id: str) -> WaSession:
        if wa_number not in self._data:
            self._data[wa_number] = WaSession(wa_number=wa_number, restaurant_id=restaurant_id)
        return self._data[wa_number]

    def delete(self, wa_number: str) -> None:
        self._data.pop(wa_number, None)

    def clear(self) -> None:
        self._data.clear()

wa_session_store = _WaSessionStore()
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_whatsapp.py -v
```

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/session.py tests/test_whatsapp.py
git commit -m "feat(whatsapp): WhatsApp session store with state machine"
```

---

### Task 3: Outbound message sender

**Files:**
- Create: `restaurant-booking/src/whatsapp/sender.py`
- Modify: `restaurant-booking/tests/test_whatsapp.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_whatsapp.py`:

```python
from unittest.mock import patch, MagicMock

def test_send_message_calls_twilio():
    with patch("src.whatsapp.sender.twilio_client") as mock_client:
        mock_client.messages.create.return_value = MagicMock(sid="SM123")
        from src.whatsapp.sender import send_whatsapp
        send_whatsapp(to="+15005550006", body="Hello!")
        mock_client.messages.create.assert_called_once()
        call_kwargs = mock_client.messages.create.call_args.kwargs
        assert "whatsapp:+15005550006" in call_kwargs["to"]
        assert call_kwargs["body"] == "Hello!"
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_whatsapp.py::test_send_message_calls_twilio -v
```

Expected: FAILED

- [ ] **Step 3: Create `src/whatsapp/sender.py`**

```python
from __future__ import annotations
from twilio.rest import Client
from src.config import settings

twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

def send_whatsapp(to: str, body: str) -> str:
    """Send a WhatsApp message. Returns message SID."""
    from_number = f"whatsapp:{settings.twilio_from_number}"
    to_number = f"whatsapp:{to}" if not to.startswith("whatsapp:") else to
    msg = twilio_client.messages.create(
        from_=from_number,
        to=to_number,
        body=body,
    )
    return msg.sid
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_whatsapp.py -v
```

Expected: 4 PASSED

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/sender.py tests/test_whatsapp.py
git commit -m "feat(whatsapp): outbound WhatsApp sender via Twilio"
```

---

### Task 4: Claude AI agent for WhatsApp

**Files:**
- Create: `restaurant-booking/src/whatsapp/agent.py`
- Modify: `restaurant-booking/tests/test_whatsapp.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_whatsapp.py`:

```python
from src.whatsapp.agent import build_system_prompt, parse_wa_response
from src.whatsapp.session import WaSession, WaState

def test_parse_wa_response_standard():
    raw = 'REPLY: Great! How many guests will be joining you?\nSTATE: party_size'
    reply, state, data = parse_wa_response(raw)
    assert "How many guests" in reply
    assert state == "party_size"
    assert data == {}

def test_parse_wa_response_with_data():
    raw = 'REPLY: Perfect, 4 guests noted!\nSTATE: date\nDATA: {"party_size": 4}'
    reply, state, data = parse_wa_response(raw)
    assert reply == "Perfect, 4 guests noted!"
    assert state == "date"
    assert data == {"party_size": 4}

def test_parse_wa_response_done():
    raw = 'REPLY: Your booking is confirmed!\nSTATE: done\nDATA: {}'
    reply, state, data = parse_wa_response(raw)
    assert state == "done"
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_whatsapp.py::test_parse_wa_response_standard tests/test_whatsapp.py::test_parse_wa_response_with_data tests/test_whatsapp.py::test_parse_wa_response_done -v
```

Expected: FAILED

- [ ] **Step 3: Create `src/whatsapp/agent.py`**

```python
from __future__ import annotations
import json
import re
from typing import Any, Dict, Tuple

import anthropic
from src.config import settings
from src.whatsapp.session import WaSession

SYSTEM_PROMPT = """You are a WhatsApp restaurant booking assistant.
Collect booking info step by step: party size → date (YYYY-MM-DD) → time (HH:MM) → guest name → confirm.

Current session:
- State: {state}
- Party size: {party_size}
- Date: {slot_date}
- Time: {slot_time}
- Guest name: {guest_name}

Response format (always use exactly these lines):
REPLY: <your message to the guest>
STATE: <next state: idle|party_size|date|time|guest_name|confirm|done>
DATA: <JSON object with any extracted values, e.g. {{"party_size": 4}} or {{}}>

Rules:
- Ask for ONE thing at a time
- Keep messages short and friendly (WhatsApp style)
- Accept natural language dates like "this Friday" and normalise to YYYY-MM-DD in DATA
- Accept natural language times like "7pm" and normalise to HH:MM in DATA
- When all data collected and confirmed, set STATE: done
"""

def build_system_prompt(session: WaSession) -> str:
    return SYSTEM_PROMPT.format(
        state=session.state.value,
        party_size=session.party_size or "not set",
        slot_date=session.slot_date or "not set",
        slot_time=session.slot_time or "not set",
        guest_name=session.guest_name or "not set",
    )

def parse_wa_response(raw: str) -> Tuple[str, str, Dict[str, Any]]:
    """Parse agent output into (reply_text, next_state, extracted_data)."""
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

def get_wa_reply(session: WaSession, user_message: str) -> Tuple[str, str, Dict[str, Any]]:
    """Get Claude's reply and structured data for a WhatsApp message."""
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
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_whatsapp.py -v
```

Expected: 7 PASSED

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/agent.py tests/test_whatsapp.py
git commit -m "feat(whatsapp): Claude AI agent for WhatsApp booking conversation"
```

---

### Task 5: Full WhatsApp webhook handler

**Files:**
- Modify: `restaurant-booking/src/routers/whatsapp.py`

- [ ] **Step 1: Replace with full implementation**

```python
from __future__ import annotations
from fastapi import APIRouter, Form
from fastapi.responses import Response
from typing import Optional

from src.whatsapp.session import wa_session_store, WaState
from src.whatsapp.agent import get_wa_reply
from src.whatsapp.sender import send_whatsapp

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Replace with your restaurant_id
RESTAURANT_ID = "00000000-0000-0000-0000-000000000001"

GREETING = (
    "👋 Welcome to our restaurant booking service!\n\n"
    "I can help you make a reservation. Just say *book* to get started, "
    "or *cancel <confirmation-code>* to cancel an existing booking."
)

@router.post("/incoming")
async def incoming_message(
    From: str = Form(...),
    Body: str = Form(...),
    WaId: str = Form(...),
) -> Response:
    body = Body.strip()
    session = wa_session_store.get_or_create(From, restaurant_id=RESTAURANT_ID)

    # Handle commands
    if body.lower() in ("book", "reserve", "hi", "hello", "start"):
        session.reset()
        session.state = WaState.PARTY_SIZE
        reply = "Great! Let's get you booked. 🍽️\n\nHow many guests will be dining?"
        send_whatsapp(to=From, body=reply)
        return Response(content="OK", media_type="text/plain")

    if body.lower().startswith("cancel "):
        code = body[7:].strip().upper()
        # TODO: call cancel_booking from reservations module
        send_whatsapp(to=From, body=f"Booking {code} cancellation requested. We'll confirm shortly.")
        return Response(content="OK", media_type="text/plain")

    # If no active session, send greeting
    if session.state == WaState.IDLE:
        send_whatsapp(to=From, body=GREETING)
        return Response(content="OK", media_type="text/plain")

    # Active booking conversation
    reply_text, next_state_str, data = get_wa_reply(session, body)

    # Apply extracted data to session
    if "party_size" in data:
        session.party_size = int(data["party_size"])
    if "slot_date" in data:
        session.slot_date = data["slot_date"]
    if "slot_time" in data:
        session.slot_time = data["slot_time"]
    if "guest_name" in data:
        session.guest_name = data["guest_name"]

    # Update state
    try:
        session.state = WaState(next_state_str)
    except ValueError:
        session.state = WaState.IDLE

    if session.state == WaState.DONE:
        wa_session_store.delete(From)

    send_whatsapp(to=From, body=reply_text)
    return Response(content="OK", media_type="text/plain")
```

- [ ] **Step 2: Smoke-test with curl**

```bash
cd restaurant-booking
source .venv/bin/activate
uvicorn src.main:app --reload &
curl -s -X POST http://localhost:8000/api/v1/whatsapp/incoming \
  -d "From=whatsapp%3A%2B15005550006&Body=book&WaId=15005550006" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

Expected: `OK` (message sent via Twilio, or Twilio error if creds not configured)

- [ ] **Step 3: Commit**

```bash
git add src/routers/whatsapp.py
git commit -m "feat(whatsapp): full WhatsApp webhook handler with booking flow"
```

---

### Task 6: WhatsApp setup guide

**Files:**
- Create: `restaurant-booking/docs/whatsapp-setup.md`

- [ ] **Step 1: Create setup guide**

```markdown
# WhatsApp Booking Bot — Twilio Setup

## Prerequisites

- Twilio account with WhatsApp Business API access
- ngrok (for local dev): `brew install ngrok`

## Local Development

1. Start server: `uvicorn src.main:app --reload`
2. Start tunnel: `ngrok http 8000`
3. Copy ngrok HTTPS URL

## Twilio Console Setup

1. Go to Messaging → Try it out → Send a WhatsApp message
2. Follow sandbox setup instructions
3. Set the sandbox webhook to:
   `https://your-ngrok-url.ngrok.io/api/v1/whatsapp/incoming`
4. Method: HTTP POST

## Testing

1. Send your Twilio sandbox join code via WhatsApp
2. Then send: `book`
3. The bot will guide you through the booking flow

## Guest Commands

- `book` or `reserve` — start a new booking
- `cancel CONFIRM-CODE` — cancel an existing booking
- `hi` / `hello` — show greeting menu

## Production

1. Apply for Twilio WhatsApp Business API approval
2. Configure approved number in Twilio Console
3. Update `TWILIO_FROM_NUMBER` in `.env` to your WhatsApp number
4. Deploy and set webhook to production URL
```

- [ ] **Step 2: Commit**

```bash
git add docs/whatsapp-setup.md
git commit -m "docs: WhatsApp booking bot setup guide"
```

---
