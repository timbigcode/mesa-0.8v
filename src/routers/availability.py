from datetime import date, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.auth import CurrentTenant, Tenant
from src.database import get_db, set_rls
from src.errors import RestaurantClosedError
from src.models import Restaurant, Table
from src.modules.availability import get_slots_for_table, get_tables_for_slot
from src.schemas.availability import SlotOut, TableSlotOut

router = APIRouter(tags=["availability"])


def _get_restaurant(db: Session, tenant: Tenant) -> Restaurant:
    r = db.query(Restaurant).filter(Restaurant.id == tenant.restaurant_id).first()
    if not r:
        raise RestaurantClosedError()
    return r


@router.get("/availability", response_model=list[SlotOut])
def availability_for_table(
    target_date: date = Query(..., alias="date"),
    table_id: str = Query(...),
    party_size: int = Query(1),
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    restaurant = _get_restaurant(db, tenant)
    set_rls(db, str(tenant.restaurant_id))
    table = db.query(Table).filter(Table.id == table_id, Table.restaurant_id == restaurant.id).first()
    slots = get_slots_for_table(db, restaurant, table, target_date)
    return [SlotOut(slot_id=s.id, start_time=s.start_time, duration_minutes=s.duration_minutes) for s in slots]


@router.get("/availability/tables", response_model=list[TableSlotOut])
def tables_for_slot(
    target_date: date = Query(..., alias="date"),
    slot_time: time = Query(...),
    party_size: int = Query(1),
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    restaurant = _get_restaurant(db, tenant)
    tables = get_tables_for_slot(db, restaurant, target_date, slot_time, party_size)
    return [TableSlotOut(table_id=t.id, label=t.label, capacity=t.capacity, location_type=t.location_type.value) for t in tables]
