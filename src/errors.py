from __future__ import annotations

from typing import Any


class AppError(Exception):
    code: str
    message: str
    status_code: int
    details: dict

    def __init__(self, message: str = "", details: dict | None = None):
        self.message = message or self.message
        self.details = details or {}
        super().__init__(self.message)


class SlotUnavailableError(AppError):
    code = "SLOT_UNAVAILABLE"
    message = "That slot is no longer available."
    status_code = 409

    def __init__(self, available_slots: list[Any], available_tables: list[Any]):
        super().__init__(
            details={"available_slots": available_slots, "available_tables": available_tables}
        )


class TableCapacityExceededError(AppError):
    code = "TABLE_CAPACITY_EXCEEDED"
    message = "Party size exceeds table capacity."
    status_code = 422


class OutsideBookingHorizonError(AppError):
    code = "OUTSIDE_BOOKING_HORIZON"
    message = "That date is outside the booking window."
    status_code = 422


class CancellationTooLateError(AppError):
    code = "CANCELLATION_TOO_LATE"
    message = "Cancellation window has passed."
    status_code = 409


class RestaurantClosedError(AppError):
    code = "RESTAURANT_CLOSED"
    message = "The restaurant is closed at that time."
    status_code = 422


class GuestNotFoundError(AppError):
    code = "GUEST_NOT_FOUND"
    message = "No guest found with that phone number."
    status_code = 404


class DuplicateBookingError(AppError):
    code = "DUPLICATE_BOOKING"
    message = "This guest already has a booking for that slot."
    status_code = 409
