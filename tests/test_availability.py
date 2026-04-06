import uuid
from datetime import date, time

import pytest

from src.modules.availability import get_slots_for_table, get_tables_for_slot
from src.models import CalendarRule, RuleType


def test_get_slots_returns_active_slots_for_day(db, restaurant, table, lunch_slot):
    monday = date(2026, 4, 6)  # a Monday
    slots = get_slots_for_table(db, restaurant, table, monday)
    assert len(slots) == 1
    assert slots[0].start_time == time(12, 0)


def test_blackout_date_returns_no_slots(db, restaurant, table, lunch_slot):
    monday = date(2026, 4, 6)
    rule = CalendarRule(
        id=uuid.uuid4(),
        restaurant_id=restaurant.id,
        date=monday,
        rule_type=RuleType.blackout,
    )
    db.add(rule)
    db.flush()
    slots = get_slots_for_table(db, restaurant, table, monday)
    assert slots == []


def test_special_hours_filters_slots_outside_window(db, restaurant, table, lunch_slot):
    monday = date(2026, 4, 6)
    rule = CalendarRule(
        id=uuid.uuid4(),
        restaurant_id=restaurant.id,
        date=monday,
        rule_type=RuleType.special_hours,
        open_time=time(14, 0),
        close_time=time(22, 0),
    )
    db.add(rule)
    db.flush()
    slots = get_slots_for_table(db, restaurant, table, monday)
    assert slots == []


def test_get_tables_for_slot_excludes_booked_table(db, restaurant, table, lunch_slot):
    from src.models import Booking, BookingStatus, Guest, Channel
    guest = Guest(
        id=uuid.uuid4(), restaurant_id=restaurant.id,
        name="Alice", phone="+1111", preferred_channel=Channel.web,
    )
    db.add(guest)
    db.flush()
    booking = Booking(
        id=uuid.uuid4(), restaurant_id=restaurant.id,
        guest_id=guest.id, table_id=table.id,
        slot_date=date(2026, 4, 6), slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2, status=BookingStatus.confirmed,
        booked_via=Channel.web, confirmation_code="RBK-0001",
    )
    db.add(booking)
    db.flush()
    tables = get_tables_for_slot(db, restaurant, date(2026, 4, 6), time(12, 0), party_size=2)
    assert table.id not in [t.id for t in tables]
