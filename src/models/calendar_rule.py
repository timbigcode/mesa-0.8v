from __future__ import annotations

import enum
import uuid
from datetime import date, time

from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class RuleType(str, enum.Enum):
    blackout = "blackout"
    special_hours = "special_hours"


class CalendarRule(Base):
    __tablename__ = "calendar_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    rule_type: Mapped[RuleType] = mapped_column(Enum(RuleType), nullable=False)
    open_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    close_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)
