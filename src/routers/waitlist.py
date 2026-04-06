import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.auth import CurrentTenant, Tenant
from src.database import get_db, set_rls
from src.models import Channel, Table, WaitlistEntry, WaitlistStatus
from src.modules.guests import get_or_create_guest
from src.modules.waitlist import join_waitlist
from src.schemas.waitlist import WaitlistIn, WaitlistOut

router = APIRouter(tags=["waitlist"])


@router.post("/waitlist", response_model=WaitlistOut, status_code=201)
def add_to_waitlist(
    body: WaitlistIn,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    table = db.query(Table).filter(Table.id == body.table_id, Table.restaurant_id == tenant.restaurant_id).first()
    guest = get_or_create_guest(db, tenant.restaurant_id, body.guest_name, body.guest_phone, body.guest_email, Channel.web)
    entry = join_waitlist(db, tenant.restaurant_id, guest, table, body.slot_date, body.slot_start_time, body.party_size)
    db.commit()
    return entry


@router.delete("/waitlist/{entry_id}", status_code=204)
def leave_waitlist(
    entry_id: uuid.UUID,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id, WaitlistEntry.restaurant_id == tenant.restaurant_id).first()
    if entry:
        entry.status = WaitlistStatus.expired
        db.commit()


@router.get("/waitlist", response_model=list[WaitlistOut])
def view_waitlist(
    target_date: date = Query(..., alias="date"),
    table_id: uuid.UUID = Query(...),
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    return (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.restaurant_id == tenant.restaurant_id,
            WaitlistEntry.slot_date == target_date,
            WaitlistEntry.table_id == table_id,
            WaitlistEntry.status == WaitlistStatus.waiting,
        )
        .order_by(WaitlistEntry.created_at)
        .all()
    )
