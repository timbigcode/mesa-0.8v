from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from src.database import set_rls
from src.models import Channel, Guest


def get_or_create_guest(
    db: Session,
    restaurant_id: uuid.UUID,
    name: str,
    phone: str,
    email: str | None,
    channel: Channel,
) -> Guest:
    set_rls(db, str(restaurant_id))
    existing = (
        db.query(Guest)
        .filter(Guest.restaurant_id == restaurant_id, Guest.phone == phone)
        .first()
    )
    if existing:
        return existing
    guest = Guest(
        id=uuid.uuid4(),
        restaurant_id=restaurant_id,
        name=name,
        phone=phone,
        email=email,
        preferred_channel=channel,
    )
    db.add(guest)
    db.flush()
    return guest


def increment_visit_count(db: Session, guest: Guest) -> None:
    guest.visit_count += 1
    db.flush()
