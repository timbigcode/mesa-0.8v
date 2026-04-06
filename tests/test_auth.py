import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.auth import CurrentTenant, create_token

app = FastAPI()


@app.get("/me")
def me(tenant=CurrentTenant) -> dict:
    return {"restaurant_id": str(tenant.restaurant_id), "role": tenant.role}


client = TestClient(app)


def test_valid_token_extracts_restaurant_id():
    rid = uuid.uuid4()
    token = create_token(restaurant_id=rid, role="owner")
    resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["restaurant_id"] == str(rid)
    assert resp.json()["role"] == "owner"


def test_missing_token_returns_401():
    resp = client.get("/me")
    assert resp.status_code == 401


def test_invalid_token_returns_401():
    resp = client.get("/me", headers={"Authorization": "Bearer bad.token.here"})
    assert resp.status_code == 401
