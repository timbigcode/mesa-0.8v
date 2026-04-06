from __future__ import annotations
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token(restaurant_id: str) -> str:
    payload = {
        "sub": "admin",
        "restaurant_id": restaurant_id,
        "role": "owner",
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


@router.post("/token")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    restaurant_id: str = Form(...),
):
    if username != settings.admin_username or password != settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = _make_token(restaurant_id)
    return {"access_token": token, "token_type": "bearer"}
