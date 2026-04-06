import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.auth import CurrentTenant, Tenant
from src.database import get_db, set_rls
from src.errors import GuestNotFoundError
from src.models import Guest
from src.schemas.guest import GuestOut, GuestUpdateIn

router = APIRouter(tags=["guests"])


@router.get("/guests", response_model=list[GuestOut])
def list_or_lookup_guests(
    phone: str | None = Query(None),
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    if phone:
        guest = db.query(Guest).filter(Guest.restaurant_id == tenant.restaurant_id, Guest.phone == phone).first()
        if not guest:
            raise GuestNotFoundError()
        return [guest]
    return db.query(Guest).filter(Guest.restaurant_id == tenant.restaurant_id).order_by(Guest.name).all()


@router.get("/guests/{guest_id}", response_model=GuestOut)
def get_guest(
    guest_id: uuid.UUID,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    guest = db.query(Guest).filter(Guest.id == guest_id, Guest.restaurant_id == tenant.restaurant_id).first()
    if not guest:
        raise GuestNotFoundError()
    return guest


@router.patch("/guests/{guest_id}", response_model=GuestOut)
def update_guest(
    guest_id: uuid.UUID,
    body: GuestUpdateIn,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    guest = db.query(Guest).filter(Guest.id == guest_id, Guest.restaurant_id == tenant.restaurant_id).first()
    if not guest:
        raise GuestNotFoundError()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(guest, field, value)
    db.flush()
    return guest
