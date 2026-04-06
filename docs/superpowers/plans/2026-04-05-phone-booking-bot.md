# Phone Booking Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Twilio Voice webhook that answers phone calls, uses Claude AI to conduct a natural-language booking conversation, and creates/retrieves reservations via the existing booking engine.

**Architecture:** Twilio calls a FastAPI webhook on each voice event (call start, digit input, speech transcription). A stateless conversation controller stores session state in a server-side dict (keyed by `CallSid`) and calls the booking engine's own service functions. Claude (`claude-haiku-4-5`) generates TwiML `<Say>` text and drives the booking state machine through stages: GREETING → PARTY_SIZE → DATE → TIME → GUEST_INFO → CONFIRM → DONE.

**Tech Stack:** Twilio Python SDK 9.x, FastAPI, Claude API (`anthropic` SDK), SQLAlchemy sessions, existing `src/modules/` business logic.

---

## File Structure

```
restaurant-booking/
  src/
    routers/
      voice.py          ← Twilio Voice webhook routes
    voice/
      __init__.py
      session.py        ← In-memory CallSession store
      states.py         ← BookingState enum + transition logic
      agent.py          ← Claude API wrapper (generates TwiML text)
      twiml.py          ← TwiML builder helpers
  tests/
    test_voice.py       ← Unit tests for state transitions + TwiML output
  requirements.txt      ← add anthropic>=0.25.0
```

---

### Task 1: Install `anthropic` SDK and wire voice router

**Files:**
- Modify: `restaurant-booking/requirements.txt`
- Create: `restaurant-booking/src/voice/__init__.py`
- Create: `restaurant-booking/src/routers/voice.py`
- Modify: `restaurant-booking/src/main.py`

- [ ] **Step 1: Add anthropic to requirements.txt**

Open `restaurant-booking/requirements.txt` and append:

```
anthropic>=0.25.0
```

- [ ] **Step 2: Install the dependency**

```bash
cd restaurant-booking
source .venv/bin/activate
pip install anthropic>=0.25.0
```

Expected: `Successfully installed anthropic-...`

- [ ] **Step 3: Add ANTHROPIC_API_KEY and TWILIO settings to config**

Read `restaurant-booking/src/config.py`, then add fields:

```python
# In class Settings(BaseSettings):
anthropic_api_key: str = ""
twilio_account_sid: str = ""
twilio_auth_token: str = ""
twilio_from_number: str = ""
```

- [ ] **Step 4: Add to .env**

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

- [ ] **Step 5: Create `src/voice/__init__.py`**

```python
# voice package
```

- [ ] **Step 6: Create minimal `src/routers/voice.py`**

```python
from __future__ import annotations
from fastapi import APIRouter, Form
from fastapi.responses import Response

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/incoming")
async def incoming_call(CallSid: str = Form(...), From: str = Form(...)) -> Response:
    from src.voice.twiml import greet
    return Response(content=greet(), media_type="application/xml")
```

- [ ] **Step 7: Register router in `src/main.py`**

Add after the existing router imports:

```python
from src.routers import voice as voice_router
app.include_router(voice_router.router, prefix="/api/v1")
```

- [ ] **Step 8: Verify server starts**

```bash
cd restaurant-booking
source .venv/bin/activate
uvicorn src.main:app --reload
```

Expected: `Application startup complete` with no import errors.

- [ ] **Step 9: Commit**

```bash
cd restaurant-booking
git add requirements.txt src/voice/__init__.py src/routers/voice.py src/main.py src/config.py .env
git commit -m "feat(voice): scaffold voice router and add anthropic dependency"
```

---

### Task 2: TwiML builder helpers

**Files:**
- Create: `restaurant-booking/src/voice/twiml.py`
- Create: `restaurant-booking/tests/test_voice.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_voice.py
from src.voice.twiml import greet, say_and_gather, say_and_hangup

def test_greet_contains_gather():
    xml = greet()
    assert "<Gather" in xml
    assert "Thank you for calling" in xml

def test_say_and_gather():
    xml = say_and_gather("How many guests?", action="/api/v1/voice/gather")
    assert "<Say>" in xml
    assert "How many guests?" in xml
    assert 'action="/api/v1/voice/gather"' in xml

def test_say_and_hangup():
    xml = say_and_hangup("Goodbye!")
    assert "<Say>" in xml
    assert "Goodbye!" in xml
    assert "<Hangup" in xml
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd restaurant-booking
source .venv/bin/activate
pytest tests/test_voice.py -v
```

Expected: `FAILED` — `ModuleNotFoundError: No module named 'src.voice.twiml'`

- [ ] **Step 3: Create `src/voice/twiml.py`**

```python
from __future__ import annotations

GATHER_ACTION = "/api/v1/voice/gather"

def _wrap(body: str) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>'

def greet() -> str:
    inner = (
        '<Say voice="Polly.Joanna">Thank you for calling. '
        "I'm your AI booking assistant. "
        "Please say or press the number of guests in your party, then press pound.</Say>"
        f'<Gather input="speech dtmf" action="{GATHER_ACTION}" method="POST" '
        'timeout="5" speechTimeout="auto" finishOnKey="#">'
        "</Gather>"
        '<Say>I did not catch that. Goodbye.</Say>'
        "<Hangup/>"
    )
    return _wrap(inner)

def say_and_gather(prompt: str, action: str = GATHER_ACTION, hints: str = "") -> str:
    hint_attr = f'hints="{hints}"' if hints else ""
    inner = (
        f"<Say>{prompt}</Say>"
        f'<Gather input="speech dtmf" action="{action}" method="POST" '
        f'timeout="5" speechTimeout="auto" finishOnKey="#" {hint_attr}>'
        "</Gather>"
        "<Say>I did not catch that. Let me transfer you to a human.</Say>"
        "<Hangup/>"
    )
    return _wrap(inner)

def say_and_hangup(message: str) -> str:
    return _wrap(f"<Say>{message}</Say><Hangup/>")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_voice.py -v
```

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add src/voice/twiml.py tests/test_voice.py
git commit -m "feat(voice): TwiML builder helpers with tests"
```

---

### Task 3: Call session store and booking state machine

**Files:**
- Create: `restaurant-booking/src/voice/session.py`
- Create: `restaurant-booking/src/voice/states.py`
- Modify: `restaurant-booking/tests/test_voice.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_voice.py`:

```python
from src.voice.session import CallSession, session_store
from src.voice.states import BookingState, next_state, extract_value

def test_session_create_and_get():
    session_store.clear()
    s = session_store.get_or_create("call_001", restaurant_id="rest_001")
    assert s.call_sid == "call_001"
    assert s.state == BookingState.GREETING
    # same session returned on second call
    assert session_store.get_or_create("call_001", restaurant_id="rest_001") is s

def test_state_transitions():
    assert next_state(BookingState.GREETING) == BookingState.PARTY_SIZE
    assert next_state(BookingState.PARTY_SIZE) == BookingState.DATE
    assert next_state(BookingState.DATE) == BookingState.TIME
    assert next_state(BookingState.TIME) == BookingState.GUEST_INFO
    assert next_state(BookingState.GUEST_INFO) == BookingState.CONFIRM
    assert next_state(BookingState.CONFIRM) == BookingState.DONE

def test_extract_party_size():
    assert extract_value(BookingState.PARTY_SIZE, "2") == 2
    assert extract_value(BookingState.PARTY_SIZE, "two guests") == 2
    assert extract_value(BookingState.PARTY_SIZE, "for four") == 4
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_voice.py::test_session_create_and_get tests/test_voice.py::test_state_transitions tests/test_voice.py::test_extract_party_size -v
```

Expected: FAILED — missing modules

- [ ] **Step 3: Create `src/voice/session.py`**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from src.voice.states import BookingState

@dataclass
class CallSession:
    call_sid: str
    restaurant_id: str
    state: BookingState = BookingState.GREETING
    party_size: Optional[int] = None
    slot_date: Optional[str] = None   # "YYYY-MM-DD"
    slot_time: Optional[str] = None   # "HH:MM"
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    table_id: Optional[str] = None
    conversation: list = field(default_factory=list)  # [{role, content}]

class _SessionStore:
    def __init__(self) -> None:
        self._data: Dict[str, CallSession] = {}

    def get_or_create(self, call_sid: str, restaurant_id: str) -> CallSession:
        if call_sid not in self._data:
            self._data[call_sid] = CallSession(call_sid=call_sid, restaurant_id=restaurant_id)
        return self._data[call_sid]

    def delete(self, call_sid: str) -> None:
        self._data.pop(call_sid, None)

    def clear(self) -> None:
        self._data.clear()

session_store = _SessionStore()
```

- [ ] **Step 4: Create `src/voice/states.py`**

```python
from __future__ import annotations
import re
from enum import Enum

WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}

class BookingState(str, Enum):
    GREETING   = "greeting"
    PARTY_SIZE = "party_size"
    DATE       = "date"
    TIME       = "time"
    GUEST_INFO = "guest_info"
    CONFIRM    = "confirm"
    DONE       = "done"

_TRANSITIONS = {
    BookingState.GREETING:   BookingState.PARTY_SIZE,
    BookingState.PARTY_SIZE: BookingState.DATE,
    BookingState.DATE:       BookingState.TIME,
    BookingState.TIME:       BookingState.GUEST_INFO,
    BookingState.GUEST_INFO: BookingState.CONFIRM,
    BookingState.CONFIRM:    BookingState.DONE,
}

def next_state(current: BookingState) -> BookingState:
    return _TRANSITIONS.get(current, BookingState.DONE)

def extract_value(state: BookingState, text: str):
    """Extract structured value from speech/DTMF text for a given state."""
    text = text.strip().lower()
    if state == BookingState.PARTY_SIZE:
        # Try digit first
        m = re.search(r"\b(\d+)\b", text)
        if m:
            return int(m.group(1))
        # Try word
        for word, num in WORD_TO_NUM.items():
            if word in text:
                return num
        return None
    return text  # DATE, TIME, GUEST_INFO: return raw text for Claude to interpret
```

- [ ] **Step 5: Run tests to verify pass**

```bash
pytest tests/test_voice.py -v
```

Expected: 6 PASSED

- [ ] **Step 6: Commit**

```bash
git add src/voice/session.py src/voice/states.py tests/test_voice.py
git commit -m "feat(voice): call session store and booking state machine"
```

---

### Task 4: Claude AI conversation agent

**Files:**
- Create: `restaurant-booking/src/voice/agent.py`
- Modify: `restaurant-booking/tests/test_voice.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_voice.py`:

```python
from unittest.mock import patch, MagicMock
from src.voice.agent import build_prompt, parse_agent_response

def test_build_prompt_party_size():
    session = MagicMock()
    session.state.value = "party_size"
    session.party_size = None
    session.slot_date = None
    session.slot_time = None
    session.guest_name = None
    session.conversation = []
    prompt = build_prompt(session, user_input="two guests")
    assert "party_size" in prompt or "guests" in prompt.lower()

def test_parse_agent_response_extracts_say():
    response = "SAY: How many guests will be dining?"
    say, done = parse_agent_response(response)
    assert say == "How many guests will be dining?"
    assert done is False

def test_parse_agent_response_done():
    response = "SAY: Your booking is confirmed! DONE"
    say, done = parse_agent_response(response)
    assert "confirmed" in say
    assert done is True
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_voice.py::test_build_prompt_party_size tests/test_voice.py::test_parse_agent_response_extracts_say tests/test_voice.py::test_parse_agent_response_done -v
```

Expected: FAILED

- [ ] **Step 3: Create `src/voice/agent.py`**

```python
from __future__ import annotations
import re
from typing import Tuple
import anthropic
from src.config import settings
from src.voice.states import BookingState

SYSTEM_PROMPT = """You are a friendly restaurant booking assistant handling a phone call.
Your job: collect party size, preferred date (YYYY-MM-DD), preferred time (HH:MM 24h), 
guest name, and guest phone number, then confirm the booking.

Current conversation state: {state}
Already collected:
- Party size: {party_size}
- Date: {slot_date}
- Time: {slot_time}
- Guest name: {guest_name}

Rules:
1. Ask for ONE piece of information at a time.
2. Be brief — this is a phone call (max 2 sentences).
3. Always start your reply with "SAY: " followed by exactly what to say aloud.
4. When booking is confirmed, end your reply with " DONE".
5. If you cannot understand the caller after 2 tries, say you'll transfer to a human.
"""

def build_prompt(session, user_input: str) -> str:
    return SYSTEM_PROMPT.format(
        state=session.state.value,
        party_size=session.party_size or "unknown",
        slot_date=session.slot_date or "unknown",
        slot_time=session.slot_time or "unknown",
        guest_name=session.guest_name or "unknown",
    )

def parse_agent_response(text: str) -> Tuple[str, bool]:
    """Returns (say_text, is_done)."""
    done = "DONE" in text.upper()
    m = re.search(r"SAY:\s*(.+?)(?:\s*DONE)?$", text, re.IGNORECASE | re.DOTALL)
    say = m.group(1).strip() if m else text.strip()
    return say, done

def get_agent_reply(session, user_input: str) -> Tuple[str, bool]:
    """Call Claude and return (say_text, is_done)."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    messages = list(session.conversation)
    messages.append({"role": "user", "content": user_input})
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=build_prompt(session, user_input),
        messages=messages,
    )
    reply_text = response.content[0].text
    session.conversation.append({"role": "user", "content": user_input})
    session.conversation.append({"role": "assistant", "content": reply_text})
    return parse_agent_response(reply_text)
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_voice.py -v
```

Expected: 9 PASSED

- [ ] **Step 5: Commit**

```bash
git add src/voice/agent.py tests/test_voice.py
git commit -m "feat(voice): Claude AI agent for phone booking conversation"
```

---

### Task 5: Full voice webhook with gather handler

**Files:**
- Modify: `restaurant-booking/src/routers/voice.py`

- [ ] **Step 1: Replace `src/routers/voice.py` with full implementation**

```python
from __future__ import annotations
from fastapi import APIRouter, Form
from fastapi.responses import Response
from typing import Optional

from src.voice.session import session_store
from src.voice.states import BookingState, next_state, extract_value
from src.voice.agent import get_agent_reply
from src.voice.twiml import say_and_gather, say_and_hangup, greet
from src.database import SessionLocal, set_rls
from src.modules.availability import get_available_slots
from src.modules.reservations import create_booking

router = APIRouter(prefix="/voice", tags=["voice"])

# Replace with your restaurant_id (or derive from Twilio number / URL param)
RESTAURANT_ID = "00000000-0000-0000-0000-000000000001"
GATHER_URL = "/api/v1/voice/gather"

@router.post("/incoming")
async def incoming_call(
    CallSid: str = Form(...),
    From: str = Form(...),
) -> Response:
    session = session_store.get_or_create(CallSid, restaurant_id=RESTAURANT_ID)
    session.guest_phone = From
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
        xml = say_and_gather("Sorry, I didn't catch that. Could you repeat?", action=GATHER_URL)
        return Response(content=xml, media_type="application/xml")

    # Extract structured data for current state
    if session.state == BookingState.PARTY_SIZE:
        val = extract_value(BookingState.PARTY_SIZE, user_input)
        if val:
            session.party_size = val
            session.state = next_state(session.state)

    elif session.state == BookingState.DATE:
        session.slot_date = user_input  # Claude normalises this
        session.state = next_state(session.state)

    elif session.state == BookingState.TIME:
        session.slot_time = user_input
        session.state = next_state(session.state)

    elif session.state == BookingState.GUEST_INFO:
        session.guest_name = user_input
        session.state = next_state(session.state)

    elif session.state == BookingState.CONFIRM:
        if any(w in user_input.lower() for w in ["yes", "confirm", "correct", "ok", "sure"]):
            session.state = BookingState.DONE
        else:
            # Reset to party size and start over
            session.state = BookingState.PARTY_SIZE
            xml = say_and_gather(
                "No problem, let's start over. How many guests?", action=GATHER_URL
            )
            return Response(content=xml, media_type="application/xml")

    # Get Claude's next prompt
    say_text, is_done = get_agent_reply(session, user_input)

    if is_done or session.state == BookingState.DONE:
        session_store.delete(CallSid)
        xml = say_and_hangup(say_text or "Your booking is confirmed. Thank you and goodbye!")
        return Response(content=xml, media_type="application/xml")

    xml = say_and_gather(say_text, action=GATHER_URL)
    return Response(content=xml, media_type="application/xml")
```

- [ ] **Step 2: Smoke-test endpoint**

Start the server and hit the endpoint with a simulated Twilio payload:

```bash
cd restaurant-booking
source .venv/bin/activate
uvicorn src.main:app --reload &
curl -s -X POST http://localhost:8000/api/v1/voice/incoming \
  -d "CallSid=CA123&From=%2B15005550006" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

Expected: XML response containing `<Gather` and `Thank you for calling`

- [ ] **Step 3: Commit**

```bash
git add src/routers/voice.py
git commit -m "feat(voice): full Twilio voice webhook with gather handler"
```

---

### Task 6: Twilio webhook configuration guide

**Files:**
- Create: `restaurant-booking/docs/voice-setup.md`

- [ ] **Step 1: Create setup guide**

```markdown
# Phone Booking Bot — Twilio Setup

## Local development with ngrok

1. Install ngrok: `brew install ngrok`
2. Start tunnel: `ngrok http 8000`
3. Copy the HTTPS URL, e.g. `https://abc123.ngrok.io`

## Twilio Console

1. Go to Phone Numbers → Manage → Active Numbers
2. Select your number
3. Under **Voice & Fax → A Call Comes In**, set:
   - Webhook: `https://abc123.ngrok.io/api/v1/voice/incoming`
   - Method: `HTTP POST`
4. Save

## Test

Call your Twilio number. The bot will answer and walk through the booking flow.

## Production

Replace ngrok URL with your deployed server URL (Railway, Render, etc.)
```

- [ ] **Step 2: Commit**

```bash
git add docs/voice-setup.md
git commit -m "docs: Twilio voice webhook setup guide"
```

---
