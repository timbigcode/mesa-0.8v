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
    slot_date: Optional[str] = None    # "YYYY-MM-DD"
    slot_time: Optional[str] = None    # "HH:MM"
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
            self._data[wa_number] = WaSession(
                wa_number=wa_number, restaurant_id=restaurant_id
            )
        return self._data[wa_number]

    def delete(self, wa_number: str) -> None:
        self._data.pop(wa_number, None)

    def clear(self) -> None:
        self._data.clear()


wa_session_store = _WaSessionStore()
