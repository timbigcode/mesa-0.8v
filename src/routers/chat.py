from __future__ import annotations

from typing import Literal

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import settings

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = """\
You are Mia, the friendly sales assistant for Mesa — a modern restaurant reservation
platform. Mesa helps restaurants take online bookings, manage tables on a visual floor
plan, send SMS/WhatsApp reminders, accept phone reservations via an AI voice bot, and
turn first-time diners into regulars with a built-in CRM.

Pricing: Starter $49/mo, Growth $129/mo (most popular), Enterprise custom.
14-day free trial on every plan. No credit card required.

Style:
- Warm, concise, human. Sound like a real person — never robotic.
- 1–3 short sentences per reply, max ~50 words.
- If they want a demo, invite them to click "Schedule a demo" or visit /book.
- If they ask something off-topic, gently steer back to Mesa.
- Never reveal you are an AI unless directly asked. If asked, be honest.
"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="Chat is not configured")
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system=SYSTEM_PROMPT,
            messages=[m.model_dump() for m in body.messages],
        )
        reply = response.content[0].text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"chat upstream error: {e}")

    return ChatResponse(reply=reply)
