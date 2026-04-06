from __future__ import annotations

import enum
import uuid
from datetime import datetime

from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class NotifChannel(str, enum.Enum):
    sms = "sms"
    email = "email"
    whatsapp = "whatsapp"
    line = "line"
    messenger = "messenger"


class NotifType(str, enum.Enum):
    confirmation = "confirmation"
    reminder = "reminder"
    cancellation = "cancellation"
    waitlist = "waitlist"


class NotifStatus(str, enum.Enum):
    sent = "sent"
    failed = "failed"
    pending = "pending"


class NotificationLog(Base):
    __tablename__ = "notifications_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    waitlist_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("waitlist.id"), nullable=True)
    channel: Mapped[NotifChannel] = mapped_column(Enum(NotifChannel), nullable=False)
    type: Mapped[NotifType] = mapped_column(Enum(NotifType), nullable=False)
    status: Mapped[NotifStatus] = mapped_column(Enum(NotifStatus), nullable=False, default=NotifStatus.pending)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
