from __future__ import annotations

import uuid
from datetime import date, time

from pydantic import BaseModel


class ConfigOut(BaseModel):
    booking_horizon_days: int
    cancellation_cutoff_hours: int
    default_slot_duration_min: int
    timezone: str

    model_config = {"from_attributes": True}


class ConfigUpdateIn(BaseModel):
    booking_horizon_days: int | None = None
    cancellation_cutoff_hours: int | None = None
    default_slot_duration_min: int | None = None
    timezone: str | None = None


class SlotIn(BaseModel):
    day_of_week: int  # 0=Mon, 6=Sun
    start_time: time
    duration_minutes: int


class CalendarRuleIn(BaseModel):
    date: date
    rule_type: str  # "blackout" | "special_hours"
    open_time: time | None = None
    close_time: time | None = None
    note: str | None = None


class CalendarRuleOut(BaseModel):
    id: uuid.UUID
    date: date
    rule_type: str
    open_time: time | None
    close_time: time | None
    note: str | None

    model_config = {"from_attributes": True}
