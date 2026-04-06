from datetime import date, time

import pytest

from src.models import Channel, WaitlistStatus
from src.modules.guests import get_or_create_guest
from src.modules.waitlist import expire_past_entries, join_waitlist, promote_waitlist


@pytest.fixture
def guest(db, restaurant):
    return get_or_create_guest(db, restaurant.id, "Dave", "+66800000010", None, Channel.web)


@pytest.fixture
def guest2(db, restaurant):
    return get_or_create_guest(db, restaurant.id, "Eve", "+66800000011", None, Channel.web)


def test_join_waitlist(db, restaurant, table, guest):
    entry = join_waitlist(db, restaurant_id=restaurant.id, guest=guest, table=table,
                          slot_date=date(2026, 4, 6), slot_start_time=time(12, 0), party_size=2)
    assert entry.status == WaitlistStatus.waiting


def test_promote_waitlist_notifies_first_entry(db, restaurant, table, guest, guest2):
    e1 = join_waitlist(db, restaurant_id=restaurant.id, guest=guest, table=table,
                       slot_date=date(2026, 4, 6), slot_start_time=time(12, 0), party_size=2)
    e2 = join_waitlist(db, restaurant_id=restaurant.id, guest=guest2, table=table,
                       slot_date=date(2026, 4, 6), slot_start_time=time(12, 0), party_size=2)
    promote_waitlist(db, restaurant_id=restaurant.id, table_id=table.id,
                     slot_date=date(2026, 4, 6), slot_start_time=time(12, 0))
    db.refresh(e1)
    db.refresh(e2)
    assert e1.status == WaitlistStatus.notified
    assert e2.status == WaitlistStatus.waiting


def test_expire_past_entries(db, restaurant, table, guest):
    yesterday = date(2026, 4, 5)
    entry = join_waitlist(db, restaurant_id=restaurant.id, guest=guest, table=table,
                          slot_date=yesterday, slot_start_time=time(12, 0), party_size=2)
    expire_past_entries(db, as_of=date(2026, 4, 6))
    db.refresh(entry)
    assert entry.status == WaitlistStatus.expired
