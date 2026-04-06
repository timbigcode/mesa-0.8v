from __future__ import annotations

import uuid
from datetime import date, datetime, time

from pydantic import BaseModel


class BookingIn(BaseModel):
    table_id: uuid.UUID
    slot_date: date
    slot_start_time: time
    party_size: int
    booked_via: str
    guest_name: str
    guest_phone: str
    guest_email: str | None = None
    special_requests: str | None = None


class BookingUpdateIn(BaseModel):
    party_size: int | None = None
    special_requests: str | None = None


class BookingOut(BaseModel):
    id: uuid.UUID
    table_id: uuid.UUID
    guest_id: uuid.UUID
    slot_date: date
    slot_start_time: time
    duration_minutes: int
    party_size: int
    status: str
    special_requests: str | None
    booked_via: str
    confirmation_code: str
    created_at: datetime
    notification_sent: bool = True

    model_config = {"from_attributes": True}
