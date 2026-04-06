from __future__ import annotations
import re
from enum import Enum
from typing import Optional

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


def extract_party_size(text: str) -> Optional[int]:
    text = text.strip().lower()
    m = re.search(r"\b(\d+)\b", text)
    if m:
        return int(m.group(1))
    for word, num in WORD_TO_NUM.items():
        if word in text:
            return num
    return None
