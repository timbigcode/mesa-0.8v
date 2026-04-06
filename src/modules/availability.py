from datetime import date, time

from sqlalchemy.orm import Session

from src.database import set_rls
from src.models import Booking, BookingStatus, CalendarRule, RuleType, Table, TimeSlot
from src.models.restaurant import Restaurant


def get_slots_for_table(
    db: Session, restaurant: Restaurant, table: Table, target_date: date
) -> list[TimeSlot]:
    set_rls(db, str(restaurant.id))

    # Check for calendar override
    rule = (
        db.query(CalendarRule)
        .filter(
            CalendarRule.restaurant_id == restaurant.id,
            CalendarRule.date == target_date,
        )
        .first()
    )
    if rule and rule.rule_type == RuleType.blackout:
        return []

    dow = target_date.weekday()  # 0=Mon
    slots = (
        db.query(TimeSlot)
        .filter(
            TimeSlot.restaurant_id == restaurant.id,
            TimeSlot.day_of_week == dow,
            TimeSlot.is_active.is_(True),
        )
        .all()
    )

    if rule and rule.rule_type == RuleType.special_hours:
        slots = [
            s for s in slots
            if rule.open_time <= s.start_time < rule.close_time
        ]

    # Filter out already-booked slots for this table
    booked_times = {
        b.slot_start_time
        for b in db.query(Booking).filter(
            Booking.restaurant_id == restaurant.id,
            Booking.table_id == table.id,
            Booking.slot_date == target_date,
            Booking.status == BookingStatus.confirmed,
        )
    }
    return [s for s in slots if s.start_time not in booked_times]


def get_tables_for_slot(
    db: Session,
    restaurant: Restaurant,
    target_date: date,
    slot_time: time,
    party_size: int,
) -> list[Table]:
    set_rls(db, str(restaurant.id))

    booked_table_ids = {
        b.table_id
        for b in db.query(Booking).filter(
            Booking.restaurant_id == restaurant.id,
            Booking.slot_date == target_date,
            Booking.slot_start_time == slot_time,
            Booking.status == BookingStatus.confirmed,
        )
    }
    return (
        db.query(Table)
        .filter(
            Table.restaurant_id == restaurant.id,
            Table.is_active.is_(True),
            Table.capacity >= party_size,
            Table.id.notin_(booked_table_ids),
        )
        .all()
    )
