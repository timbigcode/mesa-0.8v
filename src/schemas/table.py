from __future__ import annotations

import uuid

from pydantic import BaseModel


class TableIn(BaseModel):
    label: str
    capacity: int
    location_type: str = "indoor"


class TableUpdateIn(BaseModel):
    label: str | None = None
    capacity: int | None = None
    location_type: str | None = None


class TableOut(BaseModel):
    id: uuid.UUID
    label: str
    capacity: int
    location_type: str
    is_active: bool
    floor_plan_x: float | None
    floor_plan_y: float | None

    model_config = {"from_attributes": True}
