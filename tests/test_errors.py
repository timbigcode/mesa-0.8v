from src.errors import (
    SlotUnavailableError,
    TableCapacityExceededError,
    OutsideBookingHorizonError,
    CancellationTooLateError,
    RestaurantClosedError,
    GuestNotFoundError,
    DuplicateBookingError,
)


def test_slot_unavailable_includes_details():
    err = SlotUnavailableError(
        available_slots=["12:00", "14:00"],
        available_tables=["T2", "T3"],
    )
    assert err.code == "SLOT_UNAVAILABLE"
    assert err.status_code == 409
    assert err.details["available_slots"] == ["12:00", "14:00"]
    assert err.details["available_tables"] == ["T2", "T3"]


def test_cancellation_too_late_is_409():
    err = CancellationTooLateError()
    assert err.code == "CANCELLATION_TOO_LATE"
    assert err.status_code == 409


def test_guest_not_found_is_404():
    err = GuestNotFoundError()
    assert err.code == "GUEST_NOT_FOUND"
    assert err.status_code == 404
