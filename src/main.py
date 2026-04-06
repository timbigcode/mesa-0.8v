from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.errors import AppError
from src.routers import availability, bookings, guests, waitlist, config, tables, auth, voice, whatsapp

app = FastAPI(title="Restaurant Booking Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(availability.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(guests.router, prefix="/api/v1")
app.include_router(waitlist.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")
app.include_router(tables.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(voice.router, prefix="/api/v1")
app.include_router(whatsapp.router, prefix="/api/v1")


@app.exception_handler(AppError)
def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message, "details": exc.details},
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
