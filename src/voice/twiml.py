from __future__ import annotations

GATHER_ACTION = "/api/v1/voice/gather"


def _wrap(body: str) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>'


def greet() -> str:
    inner = (
        '<Say voice="Polly.Joanna">Thank you for calling. '
        "I'm your AI booking assistant. "
        "How many guests will be dining? Please say the number, then press pound.</Say>"
        f'<Gather input="speech dtmf" action="{GATHER_ACTION}" method="POST" '
        'timeout="5" speechTimeout="auto" finishOnKey="#">'
        "</Gather>"
        "<Say>I did not catch that. Please call back and try again.</Say>"
        "<Hangup/>"
    )
    return _wrap(inner)


def say_and_gather(prompt: str, action: str = GATHER_ACTION, hints: str = "") -> str:
    hint_attr = f'hints="{hints}"' if hints else ""
    inner = (
        f'<Say voice="Polly.Joanna">{prompt}</Say>'
        f'<Gather input="speech dtmf" action="{action}" method="POST" '
        f'timeout="5" speechTimeout="auto" finishOnKey="#" {hint_attr}>'
        "</Gather>"
        '<Say voice="Polly.Joanna">I did not catch that. Let me transfer you to the team.</Say>'
        "<Hangup/>"
    )
    return _wrap(inner)


def say_and_hangup(message: str) -> str:
    return _wrap(f'<Say voice="Polly.Joanna">{message}</Say><Hangup/>')
