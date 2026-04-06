import uuid
from datetime import time

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.models import LocationType, Restaurant, Table, TimeSlot
from src.database import set_rls

TEST_DATABASE_URL = "postgresql://postgres:password@localhost:5432/restaurant_booking_test"


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DATABASE_URL)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def restaurant(db):
    r = Restaurant(
        id=uuid.uuid4(),
        name="Test Restaurant",
        owner_id=uuid.uuid4(),
        timezone="UTC",
        booking_horizon_days=30,
        cancellation_cutoff_hours=2,
        default_slot_duration_min=90,
    )
    db.add(r)
    db.flush()
    return r


@pytest.fixture
def table(db, restaurant):
    set_rls(db, str(restaurant.id))
    t = Table(
        id=uuid.uuid4(),
        restaurant_id=restaurant.id,
        label="T1",
        capacity=4,
        location_type=LocationType.indoor,
        is_active=True,
    )
    db.add(t)
    db.flush()
    return t


@pytest.fixture
def lunch_slot(db, restaurant):
    set_rls(db, str(restaurant.id))
    s = TimeSlot(
        id=uuid.uuid4(),
        restaurant_id=restaurant.id,
        day_of_week=0,  # Monday
        start_time=time(12, 0),
        duration_minutes=90,
        is_active=True,
    )
    db.add(s)
    db.flush()
    return s
