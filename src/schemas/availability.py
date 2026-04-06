import uuid
from datetime import time

from pydantic import BaseModel


class SlotOut(BaseModel):
    slot_id: uuid.UUID
    start_time: time
    duration_minutes: int

    model_config = {"from_attributes": True}


class TableSlotOut(BaseModel):
    table_id: uuid.UUID
    label: str
    capacity: int
    location_type: str

    model_config = {"from_attributes": True}
