import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth import CurrentTenant, Tenant
from src.database import get_db, set_rls
from src.models import LocationType, Table
from src.schemas.table import TableIn, TableOut, TableUpdateIn

router = APIRouter(tags=["tables"])


@router.get("/tables", response_model=list[TableOut])
def list_tables(tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    return db.query(Table).filter(Table.restaurant_id == tenant.restaurant_id, Table.is_active.is_(True)).all()


@router.post("/tables", response_model=TableOut, status_code=201)
def create_table(body: TableIn, tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    t = Table(
        id=uuid.uuid4(),
        restaurant_id=tenant.restaurant_id,
        label=body.label,
        capacity=body.capacity,
        location_type=LocationType(body.location_type),
        is_active=True,
    )
    db.add(t)
    db.commit()
    return t


@router.patch("/tables/{table_id}", response_model=TableOut)
def update_table(table_id: uuid.UUID, body: TableUpdateIn, tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    t = db.query(Table).filter(Table.id == table_id, Table.restaurant_id == tenant.restaurant_id).first()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, LocationType(value) if field == "location_type" else value)
    db.commit()
    return t


@router.delete("/tables/{table_id}", status_code=204)
def deactivate_table(table_id: uuid.UUID, tenant: Tenant = CurrentTenant, db: Session = Depends(get_db)):
    set_rls(db, str(tenant.restaurant_id))
    t = db.query(Table).filter(Table.id == table_id, Table.restaurant_id == tenant.restaurant_id).first()
    if t:
        t.is_active = False
        db.commit()
