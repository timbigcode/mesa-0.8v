from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

router = APIRouter(tags=["leads"])

LEADS_FILE = Path(__file__).resolve().parents[2] / "leads.jsonl"


class LeadIn(BaseModel):
    name: str
    business: str
    email: EmailStr
    phone: str
    message: str | None = None


@router.post("/leads", status_code=201)
def create_lead(body: LeadIn) -> dict:
    record = {
        "received_at": datetime.utcnow().isoformat() + "Z",
        **body.model_dump(),
    }
    LEADS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LEADS_FILE.open("a") as f:
        f.write(json.dumps(record) + "\n")
    return {"ok": True}


@router.get("/leads")
def list_leads() -> list[dict]:
    if not LEADS_FILE.exists():
        return []
    return [json.loads(line) for line in LEADS_FILE.read_text().splitlines() if line.strip()]
