from __future__ import annotations
from unittest.mock import MagicMock, patch

from src.voice.twiml import greet, say_and_gather, say_and_hangup
from src.voice.states import BookingState, next_state, extract_party_size
from src.voice.session import CallSession, _SessionStore
from src.voice.agent import parse_agent_response


# ── TwiML helpers ──────────────────────────────────────────────────────────

def test_greet_contains_gather():
    xml = greet()
    assert "<Gather" in xml
    assert "booking assistant" in xml.lower()


def test_say_and_gather_contains_prompt():
    xml = say_and_gather("How many guests?", action="/api/v1/voice/gather")
    assert "How many guests?" in xml
    assert '<Gather' in xml


def test_say_and_hangup():
    xml = say_and_hangup("Goodbye!")
    assert "Goodbye!" in xml
    assert "<Hangup" in xml


# ── State machine ──────────────────────────────────────────────────────────

def test_state_transitions():
    assert next_state(BookingState.GREETING)   == BookingState.PARTY_SIZE
    assert next_state(BookingState.PARTY_SIZE) == BookingState.DATE
    assert next_state(BookingState.DATE)       == BookingState.TIME
    assert next_state(BookingState.TIME)       == BookingState.GUEST_INFO
    assert next_state(BookingState.GUEST_INFO) == BookingState.CONFIRM
    assert next_state(BookingState.CONFIRM)    == BookingState.DONE


def test_extract_party_size_digit():
    assert extract_party_size("2") == 2
    assert extract_party_size("table for 4") == 4


def test_extract_party_size_word():
    assert extract_party_size("two guests") == 2
    assert extract_party_size("for four people") == 4


def test_extract_party_size_unknown():
    assert extract_party_size("umm not sure") is None


# ── Session store ──────────────────────────────────────────────────────────

def test_session_create_and_get():
    store = _SessionStore()
    s = store.get_or_create("call_001", restaurant_id="rest_001")
    assert s.call_sid == "call_001"
    assert s.state == BookingState.GREETING
    assert store.get_or_create("call_001", restaurant_id="rest_001") is s


def test_session_delete():
    store = _SessionStore()
    store.get_or_create("call_002", "rest_001")
    store.delete("call_002")
    # New session created after delete
    s2 = store.get_or_create("call_002", "rest_001")
    assert s2.party_size is None


# ── Agent response parsing ─────────────────────────────────────────────────

def test_parse_agent_response_normal():
    say, done = parse_agent_response("SAY: How many guests will be dining?")
    assert say == "How many guests will be dining?"
    assert done is False


def test_parse_agent_response_done():
    say, done = parse_agent_response("SAY: Your reservation is confirmed! DONE")
    assert "confirmed" in say
    assert done is True


def test_parse_agent_response_done_only():
    _, done = parse_agent_response("SAY: See you soon! DONE")
    assert done is True
