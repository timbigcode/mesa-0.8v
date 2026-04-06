from __future__ import annotations
from unittest.mock import MagicMock, patch

from src.whatsapp.session import WaSession, WaState, _WaSessionStore
from src.whatsapp.agent import parse_wa_response


# ── Session store ──────────────────────────────────────────────────────────

def test_session_create():
    store = _WaSessionStore()
    s = store.get_or_create("+15005550006", restaurant_id="rest_001")
    assert s.wa_number == "+15005550006"
    assert s.state == WaState.IDLE


def test_session_idempotent():
    store = _WaSessionStore()
    s1 = store.get_or_create("+15005550006", restaurant_id="rest_001")
    s2 = store.get_or_create("+15005550006", restaurant_id="rest_001")
    assert s1 is s2


def test_session_reset():
    store = _WaSessionStore()
    s = store.get_or_create("+15005550006", restaurant_id="rest_001")
    s.party_size = 4
    s.slot_date = "2026-04-10"
    s.reset()
    assert s.party_size is None
    assert s.slot_date is None
    assert s.state == WaState.IDLE


# ── Agent response parsing ─────────────────────────────────────────────────

def test_parse_wa_response_standard():
    raw = "REPLY: Great! How many guests will be joining you?\nSTATE: party_size\nDATA: {}"
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
    raw = "REPLY: Your booking is confirmed! See you soon. 🎉\nSTATE: done\nDATA: {}"
    reply, state, data = parse_wa_response(raw)
    assert state == "done"
    assert "confirmed" in reply.lower()


def test_parse_wa_response_malformed_data():
    raw = "REPLY: Something went wrong\nSTATE: idle\nDATA: not-valid-json"
    reply, state, data = parse_wa_response(raw)
    assert state == "idle"
    assert data == {}


# ── Outbound sender ────────────────────────────────────────────────────────

def test_send_whatsapp_calls_twilio():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(sid="SM123")
    with patch("src.whatsapp.sender._get_client", return_value=mock_client):
        from src.whatsapp.sender import send_whatsapp
        send_whatsapp(to="+15005550006", body="Hello!")
        mock_client.messages.create.assert_called_once()
        kwargs = mock_client.messages.create.call_args.kwargs
        assert kwargs["to"] == "whatsapp:+15005550006"
        assert kwargs["body"] == "Hello!"


def test_send_whatsapp_skips_double_prefix():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(sid="SM456")
    with patch("src.whatsapp.sender._get_client", return_value=mock_client):
        from src.whatsapp.sender import send_whatsapp
        send_whatsapp(to="whatsapp:+15005550006", body="Hi")
        kwargs = mock_client.messages.create.call_args.kwargs
        assert kwargs["to"] == "whatsapp:+15005550006"
