from __future__ import annotations

import uuid
from datetime import date, time

from sqlalchemy.orm import Session

from src.database import set_rls
from src.models import Guest, Table, WaitlistEntry, WaitlistStatus


def join_waitlist(
    db: Session,
    restaurant_id: uuid.UUID,
    guest: Guest,
    table: Table,
    slot_date: date,
    slot_start_time: time,
    party_size: int,
) -> WaitlistEntry:
    set_rls(db, str(restaurant_id))
    entry = WaitlistEntry(
        id=uuid.uuid4(),
        restaurant_id=restaurant_id,
        guest_id=guest.id,
        table_id=table.id,
        slot_date=slot_date,
        slot_start_time=slot_start_time,
        party_size=party_size,
        status=WaitlistStatus.waiting,
    )
    db.add(entry)
    db.flush()
    return entry


def promote_waitlist(
    db: Session,
    restaurant_id: uuid.UUID,
    table_id: uuid.UUID,
    slot_date: date,
    slot_start_time: time,
) -> WaitlistEntry | None:
    set_rls(db, str(restaurant_id))
    first = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.restaurant_id == restaurant_id,
            WaitlistEntry.table_id == table_id,
            WaitlistEntry.slot_date == slot_date,
            WaitlistEntry.slot_start_time == slot_start_time,
            WaitlistEntry.status == WaitlistStatus.waiting,
        )
        .order_by(WaitlistEntry.created_at)
        .first()
    )
    if first:
        first.status = WaitlistStatus.notified
        db.flush()
    return first


def expire_past_entries(db: Session, as_of: date) -> None:
    db.query(WaitlistEntry).filter(
        WaitlistEntry.slot_date < as_of,
        WaitlistEntry.status == WaitlistStatus.waiting,
    ).update({"status": WaitlistStatus.expired})
    db.flush()
