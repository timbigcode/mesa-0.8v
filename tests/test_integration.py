"""
Full HTTP flow tests against a real database. Uses FastAPI TestClient with
a real PostgreSQL test DB (no mocks). Each test runs in a rolled-back transaction.
"""
import uuid
from datetime import time

import pytest
from fastapi.testclient import TestClient

from src.auth import create_token
from src.main import app
from src.models import Channel, LocationType, Restaurant, Table, TimeSlot
from src.database import SessionLocal, set_rls

client = TestClient(app)


@pytest.fixture
def http_restaurant(db):
    r = Restaurant(
        id=uuid.uuid4(), name="HTTP Test Restaurant", owner_id=uuid.uuid4(),
        timezone="UTC", booking_horizon_days=30,
        cancellation_cutoff_hours=2, default_slot_duration_min=90,
    )
    db.add(r)
    set_rls(db, str(r.id))
    t = Table(id=uuid.uuid4(), restaurant_id=r.id, label="A1", capacity=4, location_type=LocationType.indoor, is_active=True)
    db.add(t)
    s = TimeSlot(id=uuid.uuid4(), restaurant_id=r.id, day_of_week=0, start_time=time(12, 0), duration_minutes=90, is_active=True)
    db.add(s)
    db.flush()
    return {"restaurant": r, "table": t, "slot": s, "token": create_token(r.id, "owner")}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_full_booking_flow(http_restaurant):
    token = http_restaurant["token"]
    table_id = str(http_restaurant["table"].id)

    resp = client.get("/api/v1/availability", params={"date": "2026-04-06", "table_id": table_id, "party_size": 2}, headers=auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.post("/api/v1/bookings", json={
        "table_id": table_id, "slot_date": "2026-04-06", "slot_start_time": "12:00:00",
        "party_size": 2, "booked_via": "web",
        "guest_name": "Test Guest", "guest_phone": "+66899999001",
    }, headers=auth(token))
    assert resp.status_code == 201
    booking_id = resp.json()["id"]
    code = resp.json()["confirmation_code"]
    assert code.startswith("RBK-")

    resp2 = client.post("/api/v1/bookings", json={
        "table_id": table_id, "slot_date": "2026-04-06", "slot_start_time": "12:00:00",
        "party_size": 2, "booked_via": "web",
        "guest_name": "Second Guest", "guest_phone": "+66899999002",
    }, headers=auth(token))
    assert resp2.status_code == 409
    assert resp2.json()["error"] == "SLOT_UNAVAILABLE"
    assert "available_slots" in resp2.json()["details"]
    assert "available_tables" in resp2.json()["details"]

    resp3 = client.post("/api/v1/waitlist", json={
        "table_id": table_id, "slot_date": "2026-04-06", "slot_start_time": "12:00:00",
        "party_size": 2, "guest_name": "Second Guest", "guest_phone": "+66899999002",
    }, headers=auth(token))
    assert resp3.status_code == 201

    resp4 = client.get(f"/api/v1/bookings/{booking_id}", headers=auth(token))
    assert resp4.status_code == 200
    assert resp4.json()["confirmation_code"] == code


def test_capacity_exceeded_returns_422(http_restaurant):
    token = http_restaurant["token"]
    table_id = str(http_restaurant["table"].id)
    resp = client.post("/api/v1/bookings", json={
        "table_id": table_id, "slot_date": "2026-04-06", "slot_start_time": "12:00:00",
        "party_size": 99, "booked_via": "web",
        "guest_name": "Big Group", "guest_phone": "+66899999003",
    }, headers=auth(token))
    assert resp.status_code == 422
    assert resp.json()["error"] == "TABLE_CAPACITY_EXCEEDED"


def test_guest_lookup_by_phone(http_restaurant):
    token = http_restaurant["token"]
    table_id = str(http_restaurant["table"].id)
    client.post("/api/v1/bookings", json={
        "table_id": table_id, "slot_date": "2026-04-13", "slot_start_time": "12:00:00",
        "party_size": 2, "booked_via": "web",
        "guest_name": "Lookup Guest", "guest_phone": "+66899999004",
    }, headers=auth(token))
    resp = client.get("/api/v1/guests", params={"phone": "+66899999004"}, headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["phone"] == "+66899999004"
    assert resp.json()["visit_count"] == 1


def test_missing_token_returns_401(http_restaurant):
    resp = client.get("/api/v1/availability", params={"date": "2026-04-06", "table_id": "irrelevant", "party_size": 1})
    assert resp.status_code == 401
