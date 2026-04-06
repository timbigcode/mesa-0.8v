from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from src.voice.states import BookingState


@dataclass
class CallSession:
    call_sid: str
    restaurant_id: str
    state: BookingState = BookingState.GREETING
    party_size: Optional[int] = None
    slot_date: Optional[str] = None    # "YYYY-MM-DD"
    slot_time: Optional[str] = None    # "HH:MM"
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    conversation: List[dict] = field(default_factory=list)


class _SessionStore:
    def __init__(self) -> None:
        self._data: Dict[str, CallSession] = {}

    def get_or_create(self, call_sid: str, restaurant_id: str) -> CallSession:
        if call_sid not in self._data:
            self._data[call_sid] = CallSession(
                call_sid=call_sid, restaurant_id=restaurant_id
            )
        return self._data[call_sid]

    def delete(self, call_sid: str) -> None:
        self._data.pop(call_sid, None)

    def clear(self) -> None:
        self._data.clear()


session_store = _SessionStore()
