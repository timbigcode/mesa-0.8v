from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class GuestOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    email: str | None
    preferred_channel: str
    visit_count: int
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class GuestUpdateIn(BaseModel):
    notes: str | None = None
    preferred_channel: str | None = None
    email: str | None = None
