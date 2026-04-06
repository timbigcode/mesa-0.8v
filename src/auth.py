from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import settings

_bearer = HTTPBearer(auto_error=False)


@dataclass
class Tenant:
    restaurant_id: uuid.UUID
    role: str  # "owner" | "channel"


def create_token(restaurant_id: uuid.UUID, role: str) -> str:
    payload = {"restaurant_id": str(restaurant_id), "role": role}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def get_current_tenant(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Tenant:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=["HS256"])
        return Tenant(
            restaurant_id=uuid.UUID(payload["restaurant_id"]),
            role=payload["role"],
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CurrentTenant = Depends(get_current_tenant)
