from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.auth import CurrentTenant, Tenant
from src.database import get_db, set_rls
from src.models import Booking, BookingStatus, Channel, NotifType, Restaurant, Table
from src.modules.guests import get_or_create_guest, increment_visit_count
from src.modules.notifications import dispatch_notification
from src.modules.reservations import cancel_booking, create_booking
from src.schemas.booking import BookingIn, BookingOut, BookingUpdateIn

router = APIRouter(tags=["bookings"])


def _get_restaurant(db: Session, tenant: Tenant) -> Restaurant:
    return db.query(Restaurant).filter(Restaurant.id == tenant.restaurant_id).first()


@router.post("/bookings", response_model=BookingOut, status_code=201)
def new_booking(
    body: BookingIn,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    restaurant = _get_restaurant(db, tenant)
    table = db.query(Table).filter(Table.id == body.table_id, Table.restaurant_id == restaurant.id).first()
    guest = get_or_create_guest(
        db, restaurant.id, body.guest_name, body.guest_phone, body.guest_email, Channel(body.booked_via)
    )
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=body.slot_date, slot_start_time=body.slot_start_time,
        duration_minutes=restaurant.default_slot_duration_min,
        party_size=body.party_size, booked_via=Channel(body.booked_via),
        special_requests=body.special_requests,
    )
    increment_visit_count(db, guest)
    notif_ok = dispatch_notification(db, booking=booking, notif_type=NotifType.confirmation)
    db.commit()
    response = BookingOut.model_validate(booking)
    response.notification_sent = notif_ok
    return response


@router.get("/bookings", response_model=list[BookingOut])
def list_bookings(
    target_date: date | None = Query(None, alias="date"),
    status: str | None = Query(None),
    guest_name: str | None = Query(None),
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    from src.models import Guest
    q = db.query(Booking).filter(Booking.restaurant_id == tenant.restaurant_id)
    if target_date:
        q = q.filter(Booking.slot_date == target_date)
    if status:
        q = q.filter(Booking.status == BookingStatus(status))
    if guest_name:
        q = q.join(Guest, Booking.guest_id == Guest.id).filter(
            Guest.name.ilike(f"%{guest_name}%")
        )
    return q.all()


@router.get("/bookings/code/{code}", response_model=BookingOut)
def get_booking_by_code(
    code: str,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    booking = db.query(Booking).filter(
        Booking.confirmation_code == code,
        Booking.restaurant_id == tenant.restaurant_id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: uuid.UUID,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    return db.query(Booking).filter(Booking.id == booking_id, Booking.restaurant_id == tenant.restaurant_id).first()


@router.patch("/bookings/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: uuid.UUID,
    body: BookingUpdateIn,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.restaurant_id == tenant.restaurant_id).first()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(booking, field, value)
    db.commit()
    return booking


@router.delete("/bookings/{booking_id}", status_code=204)
def delete_booking(
    booking_id: uuid.UUID,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    restaurant = _get_restaurant(db, tenant)
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.restaurant_id == tenant.restaurant_id).first()
    cancel_booking(db, booking, restaurant)
    dispatch_notification(db, booking=booking, notif_type=NotifType.cancellation)
    db.commit()
