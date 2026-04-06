# Notifications Pipeline, Admin Filters & Guest Cancellation — Design Spec

**Date:** 2026-04-06
**Status:** Approved

---

## Overview

Four features to complete the core booking system promise: instant guest notifications, admin booking management, guest self-serve cancellation from the web, and automatic waitlist promotion notifications.

After code review, features 3 and 4 are largely already implemented. The real work is:
- Wiring `dispatch_notification()` into the booking create/cancel paths
- Adding a missing `GET /bookings/code/{code}` backend endpoint
- Adding guest name search and status filtering to the admin bookings page

---

## Approach

Option A — thin router changes. Notification calls are added directly in the bookings router at the two call sites (create and cancel). `dispatch_notification()` returns a bool; the result travels back in the `BookingOut` response so the frontend can show a warning banner on failure. No new abstractions introduced.

---

## Section 1 — Backend: Missing Endpoint + Notification Wiring

### `GET /bookings/code/{code}` (new, public)

- No auth required — guests access this directly from their confirmation link
- Queries `Booking` by `confirmation_code`
- Returns `BookingOut` on success, 404 if not found
- Defined before `GET /bookings/{booking_id}` in the router to avoid route shadowing

### `dispatch_notification()` return type

- Change return type from `None` to `bool`
- Returns `True` if send succeeded, `False` if it failed
- The `NotificationLog` write is unchanged — failures are still logged regardless

### `BookingOut` schema

- Add `notification_sent: bool = True`
- Defaults to `True` so existing list/get responses are unaffected
- Only meaningful on create and cancel responses

### `new_booking` router

- After `create_booking()` and `increment_visit_count()`, before `db.commit()`:
  ```
  notif_ok = dispatch_notification(db, booking=booking, notif_type=NotifType.confirmation)
  ```
- `db.commit()` runs regardless of notification result
- The router constructs the response explicitly:
  ```
  response = BookingOut.model_validate(booking)
  response.notification_sent = notif_ok
  return response
  ```
- `notification_sent` is set on the Pydantic response object, not the ORM model (the DB column does not exist)

### `delete_booking` router

- After `cancel_booking()`, before `db.commit()`:
  ```
  dispatch_notification(db, booking=booking, notif_type=NotifType.cancellation)
  ```
- Waitlist promotion notification is already handled inside `cancel_booking()` — no change needed there

---

## Section 2 — Backend: Guest Name Search

### `GET /bookings` — updated parameters

| Parameter | Type | Notes |
|---|---|---|
| `date` | `date \| None` | Existing — filter by slot date |
| `status` | `str \| None` | Existing — filter by booking status |
| `guest_name` | `str \| None` | New — case-insensitive partial match |

### Implementation

When `guest_name` is provided, join `Guest` on `Booking.guest_id` and apply:
```
Guest.name.ilike(f"%{guest_name}%")
```

Partial match — searching "tim" finds "Timothy", "Timmy", "Martin", etc.

---

## Section 3 — Frontend

### Notification warning banner (`BookingFlow.tsx`)

- After successful booking submission, check `response.notification_sent`
- If `false`: show a dismissible amber banner above the confirmation redirect:
  *"We had a technical error while sending your confirmation message, but your table is booked."*
- If `true`: normal flow, no banner

### Admin bookings page (`app/admin/bookings/page.tsx`)

Two new filter controls added next to the existing date picker:

1. **Status dropdown** — options: All, Confirmed, Cancelled, Completed, No-show. Passes `?status=` to `useBookings`.
2. **Guest name input** — debounced text field. Passes `?guest_name=` to `useBookings`.

`useBookings` hook updated to accept `status` and `guestName` parameters and include them in the SWR URL key so filters trigger a re-fetch.

### Confirmation page (`app/confirmation/[code]/page.tsx`)

No changes needed. `getBookingByCode(code)` and `cancelBooking(booking.id)` are already implemented in `api.ts`. The page is fully built — it just needed the `GET /bookings/code/{code}` backend endpoint from Section 1.

---

## Error Handling

- Notification failures are non-blocking — the booking is created/cancelled regardless
- `dispatch_notification()` catches all exceptions internally and returns `False` on failure
- The `NotificationLog` records `status=failed` for audit purposes
- The frontend shows the amber warning banner only when `notification_sent === false`

---

## What Is Not In Scope

- Booking reminders (day-before scheduled messages) — listed as "Coming Soon" in brief, requires a scheduler
- Performance analytics / reporting
- LINE and Facebook Messenger channel implementations
- Booking modification (change date/time)
