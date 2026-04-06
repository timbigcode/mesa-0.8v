from __future__ import annotations

import uuid
from datetime import date, time

from pydantic import BaseModel


class WaitlistIn(BaseModel):
    table_id: uuid.UUID
    slot_date: date
    slot_start_time: time
    party_size: int
    guest_name: str
    guest_phone: str
    guest_email: str | None = None


class WaitlistOut(BaseModel):
    id: uuid.UUID
    table_id: uuid.UUID
    guest_id: uuid.UUID
    slot_date: date
    slot_start_time: time
    party_size: int
    status: str

    model_config = {"from_attributes": True}
