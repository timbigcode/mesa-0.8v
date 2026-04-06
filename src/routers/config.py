import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth import CurrentTenant, Tenant
from src.database import get_db, set_rls
from src.models import CalendarRule, Restaurant, RuleType, TimeSlot
from src.schemas.config import CalendarRuleIn, CalendarRuleOut, ConfigOut, ConfigUpdateIn, SlotIn

router = APIRouter(tags=["config"])


@router.get("/config", response_model=ConfigOut)
def get_config(tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    r = db.query(Restaurant).filter(Restaurant.id == tenant.restaurant_id).first()
    return r


@router.patch("/config", response_model=ConfigOut)
def update_config(body: ConfigUpdateIn, tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    r = db.query(Restaurant).filter(Restaurant.id == tenant.restaurant_id).first()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    db.commit()
    return r


@router.put("/config/slots", status_code=204)
def replace_slots(body: list[SlotIn], tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    db.query(TimeSlot).filter(TimeSlot.restaurant_id == tenant.restaurant_id).delete()
    for slot in body:
        db.add(TimeSlot(id=uuid.uuid4(), restaurant_id=tenant.restaurant_id, **slot.model_dump()))
    db.commit()


@router.post("/config/calendar", response_model=CalendarRuleOut, status_code=201)
def add_calendar_rule(body: CalendarRuleIn, tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    rule = CalendarRule(
        id=uuid.uuid4(),
        restaurant_id=tenant.restaurant_id,
        rule_type=RuleType(body.rule_type),
        **body.model_dump(exclude={"rule_type"})
    )
    db.add(rule)
    db.commit()
    return rule


@router.delete("/config/calendar/{rule_id}", status_code=204)
def delete_calendar_rule(rule_id: uuid.UUID, tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    db.query(CalendarRule).filter(CalendarRule.id == rule_id, CalendarRule.restaurant_id == tenant.restaurant_id).delete()
    db.commit()
