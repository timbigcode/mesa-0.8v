from __future__ import annotations

import enum
import uuid

from typing import Optional

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class LocationType(str, enum.Enum):
    indoor = "indoor"
    outdoor = "outdoor"
    bar = "bar"
    private = "private"


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    location_type: Mapped[LocationType] = mapped_column(Enum(LocationType), nullable=False, default=LocationType.indoor)
    floor_plan_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    floor_plan_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
