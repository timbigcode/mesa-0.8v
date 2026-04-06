# Notifications Pipeline, Admin Filters & Guest Cancellation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing notifications module into the booking create/cancel flow, add a missing public lookup endpoint, add guest name + status filtering to the admin dashboard, and surface notification failures to guests as a non-blocking warning.

**Architecture:** Thin changes to the bookings router — `dispatch_notification()` gets a bool return value, `new_booking` fires a confirmation notification and embeds the result in the response, `delete_booking` fires a cancellation notification silently. A new `GET /bookings/code/{code}` public endpoint unblocks the already-built confirmation page. The admin bookings page gains status and guest-name filters via a SQL join.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, Twilio SMS, SendGrid email, Next.js 16, TypeScript, SWR, Tailwind CSS.

---

## File Map

| File | Change |
|---|---|
| `src/modules/notifications.py` | Add `return success` — change return type from `None` to `bool` |
| `src/schemas/booking.py` | Add `notification_sent: bool = True` to `BookingOut` |
| `src/routers/bookings.py` | Add `GET /bookings/code/{code}`; wire notifications in `new_booking` and `delete_booking`; add `guest_name` join filter to `list_bookings` |
| `frontend/lib/types.ts` | Add `notification_sent: boolean` to `BookingOut` interface |
| `frontend/hooks/useBookings.ts` | Add `status` and `guestName` params, build query string dynamically |
| `frontend/app/admin/bookings/page.tsx` | Add status dropdown and debounced guest name input |
| `frontend/components/BookingFlow.tsx` | Pass `?notif_warn=1` to confirmation URL when `notification_sent` is false |
| `frontend/app/confirmation/[code]/page.tsx` | Read `notif_warn` search param and render amber warning banner |
| `tests/test_notifications.py` | Tests for bool return value |
| `tests/test_reservations.py` | Test for `get_booking_by_code` query and guest name filter query |

---

## Task 1: `dispatch_notification()` returns `bool`

**Files:**
- Modify: `src/modules/notifications.py`
- Test: `tests/test_notifications.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_notifications.py`:

```python
import uuid
from datetime import date, time
from unittest.mock import patch

import pytest

from src.models import Channel, NotifType
from src.modules.notifications import dispatch_notification


@pytest.fixture
def booking_fixture(db, restaurant, table, lunch_slot):
    from src.modules.guests import get_or_create_guest
    from src.modules.reservations import create_booking
    from src.database import set_rls
    set_rls(db, str(restaurant.id))
    guest = get_or_create_guest(db, restaurant.id, "Alice", "+66800000001", None, Channel.web)
    return create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=date(2026, 4, 7), slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )


def test_dispatch_notification_returns_true_on_success(db, booking_fixture):
    with patch("src.modules.notifications._send_sms", return_value=True):
        result = dispatch_notification(db, booking=booking_fixture, notif_type=NotifType.confirmation)
    assert result is True


def test_dispatch_notification_returns_false_on_failure(db, booking_fixture):
    with patch("src.modules.notifications._send_sms", return_value=False):
        result = dispatch_notification(db, booking=booking_fixture, notif_type=NotifType.confirmation)
    assert result is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ai-restaurant-booking-main/ai-restaurant-booking-main/restaurant-booking
pytest tests/test_notifications.py::test_dispatch_notification_returns_true_on_success tests/test_notifications.py::test_dispatch_notification_returns_false_on_failure -v
```

Expected: FAIL — `TypeError: 'NoneType' object is not ...' or AssertionError: assert None is True`

- [ ] **Step 3: Add `return success` to `dispatch_notification()`**

In `src/modules/notifications.py`, change the function signature line and add return at the end:

```python
def dispatch_notification(
    db: Session,
    booking: Booking | None = None,
    waitlist_entry: WaitlistEntry | None = None,
    notif_type: NotifType = NotifType.confirmation,
) -> bool:
```

At the very end of the function, after `db.flush()`, add:

```python
    return success
```

The full function end should look like:

```python
    log = NotificationLog(
        id=uuid.uuid4(),
        booking_id=booking.id if booking else None,
        waitlist_id=waitlist_entry.id if waitlist_entry else None,
        channel=channel,
        type=notif_type,
        status=NotifStatus.sent if success else NotifStatus.failed,
        sent_at=datetime.now(tz=timezone.utc) if success else None,
    )
    db.add(log)
    db.flush()
    return success
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_notifications.py::test_dispatch_notification_returns_true_on_success tests/test_notifications.py::test_dispatch_notification_returns_false_on_failure -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/notifications.py tests/test_notifications.py
git commit -m "feat: dispatch_notification returns bool indicating send success"
```

---

## Task 2: Add `notification_sent` to `BookingOut` schema and TypeScript type

**Files:**
- Modify: `src/schemas/booking.py`
- Modify: `frontend/lib/types.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_notifications.py`:

```python
def test_booking_out_has_notification_sent_default_true():
    import uuid
    from datetime import datetime
    from src.schemas.booking import BookingOut
    b = BookingOut(
        id=uuid.uuid4(),
        table_id=uuid.uuid4(),
        guest_id=uuid.uuid4(),
        slot_date=date(2026, 4, 7),
        slot_start_time=time(12, 0),
        duration_minutes=90,
        party_size=2,
        status="confirmed",
        special_requests=None,
        booked_via="web",
        confirmation_code="RBK-1234",
        created_at=datetime.now(),
    )
    assert b.notification_sent is True
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_notifications.py::test_booking_out_has_notification_sent_default_true -v
```

Expected: FAIL — `ValidationError: notification_sent field missing`

- [ ] **Step 3: Add field to `BookingOut` in `src/schemas/booking.py`**

```python
class BookingOut(BaseModel):
    id: uuid.UUID
    table_id: uuid.UUID
    guest_id: uuid.UUID
    slot_date: date
    slot_start_time: time
    duration_minutes: int
    party_size: int
    status: str
    special_requests: str | None
    booked_via: str
    confirmation_code: str
    created_at: datetime
    notification_sent: bool = True

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_notifications.py::test_booking_out_has_notification_sent_default_true -v
```

Expected: PASS

- [ ] **Step 5: Add `notification_sent` to the TypeScript interface**

In `frontend/lib/types.ts`, update `BookingOut`:

```typescript
export interface BookingOut {
  id: string;
  table_id: string;
  guest_id: string;
  slot_date: string;
  slot_start_time: string;
  duration_minutes: number;
  party_size: number;
  status: "confirmed" | "cancelled" | "no_show" | "completed";
  special_requests: string | null;
  booked_via: string;
  confirmation_code: string;
  created_at: string;
  notification_sent: boolean;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/schemas/booking.py frontend/lib/types.ts tests/test_notifications.py
git commit -m "feat: add notification_sent field to BookingOut schema and TS type"
```

---

## Task 3: Add `GET /bookings/code/{code}` endpoint

**Files:**
- Modify: `src/routers/bookings.py`
- Test: `tests/test_reservations.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_reservations.py`:

```python
def test_get_booking_by_code_found(db, restaurant, table, lunch_slot, guest):
    from src.models import Booking
    from src.database import set_rls
    monday = date(2026, 4, 6)
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )
    found = db.query(Booking).filter(
        Booking.confirmation_code == booking.confirmation_code,
        Booking.restaurant_id == restaurant.id,
    ).first()
    assert found is not None
    assert found.id == booking.id


def test_get_booking_by_code_not_found(db, restaurant):
    from src.models import Booking
    from src.database import set_rls
    set_rls(db, str(restaurant.id))
    result = db.query(Booking).filter(
        Booking.confirmation_code == "RBK-XXXX",
        Booking.restaurant_id == restaurant.id,
    ).first()
    assert result is None
```

- [ ] **Step 2: Run tests to verify they pass already (query logic only)**

```bash
pytest tests/test_reservations.py::test_get_booking_by_code_found tests/test_reservations.py::test_get_booking_by_code_not_found -v
```

Expected: PASS (this validates the query logic the endpoint will use)

- [ ] **Step 3: Add the endpoint to `src/routers/bookings.py`**

Add this route **before** the existing `GET /bookings/{booking_id}` route (order matters in FastAPI — add it after `list_bookings` but before `get_booking`):

```python
from fastapi import APIRouter, Depends, HTTPException, Query
```

(Add `HTTPException` to the existing import if not already there)

```python
@router.get("/bookings/code/{code}", response_model=BookingOut)
def get_booking_by_code(
    code: str,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    booking = db.query(Booking).filter(
        Booking.confirmation_code == code,
        Booking.restaurant_id == tenant.restaurant_id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking
```

The route order in the file must be:
1. `POST /bookings` (new_booking)
2. `GET /bookings` (list_bookings)
3. `GET /bookings/code/{code}` ← insert here
4. `GET /bookings/{booking_id}` (get_booking)
5. `PATCH /bookings/{booking_id}` (update_booking)
6. `DELETE /bookings/{booking_id}` (delete_booking)

- [ ] **Step 4: Commit**

```bash
git add src/routers/bookings.py
git commit -m "feat: add GET /bookings/code/{code} public lookup endpoint"
```

---

## Task 4: Wire confirmation notification in `new_booking`

**Files:**
- Modify: `src/routers/bookings.py`

- [ ] **Step 1: Add imports to `src/routers/bookings.py`**

Add to the existing imports at the top:

```python
from src.models import Booking, BookingStatus, Channel, NotifType, Restaurant, Table
from src.modules.notifications import dispatch_notification
```

(Update the existing `from src.models import ...` line to include `NotifType`, and add the `dispatch_notification` import)

- [ ] **Step 2: Update `new_booking` to fire notification and embed result**

Replace the current `new_booking` function body:

```python
@router.post("/bookings", response_model=BookingOut, status_code=201)
def new_booking(
    body: BookingIn,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    restaurant = _get_restaurant(db, tenant)
    table = db.query(Table).filter(Table.id == body.table_id, Table.restaurant_id == restaurant.id).first()
    guest = get_or_create_guest(
        db, restaurant.id, body.guest_name, body.guest_phone, body.guest_email, Channel(body.booked_via)
    )
    booking = create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=body.slot_date, slot_start_time=body.slot_start_time,
        duration_minutes=restaurant.default_slot_duration_min,
        party_size=body.party_size, booked_via=Channel(body.booked_via),
        special_requests=body.special_requests,
    )
    increment_visit_count(db, guest)
    notif_ok = dispatch_notification(db, booking=booking, notif_type=NotifType.confirmation)
    db.commit()
    response = BookingOut.model_validate(booking)
    response.notification_sent = notif_ok
    return response
```

- [ ] **Step 3: Verify all notification tests still pass**

```bash
pytest tests/test_notifications.py tests/test_reservations.py -v
```

Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/routers/bookings.py
git commit -m "feat: fire confirmation notification in new_booking, embed result in response"
```

---

## Task 5: Wire cancellation notification in `delete_booking`

**Files:**
- Modify: `src/routers/bookings.py`

- [ ] **Step 1: Update `delete_booking` to fire cancellation notification**

Replace the current `delete_booking` function body:

```python
@router.delete("/bookings/{booking_id}", status_code=204)
def delete_booking(
    booking_id: uuid.UUID,
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    restaurant = _get_restaurant(db, tenant)
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.restaurant_id == tenant.restaurant_id).first()
    cancel_booking(db, booking, restaurant)
    dispatch_notification(db, booking=booking, notif_type=NotifType.cancellation)
    db.commit()
```

Note: the return value is intentionally not captured here — this endpoint returns 204 No Content so `notification_sent` is not in the response. The cancellation notification failure is silently logged.

- [ ] **Step 2: Run reservation tests to confirm cancel flow still works**

```bash
pytest tests/test_reservations.py -v
```

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/routers/bookings.py
git commit -m "feat: fire cancellation notification in delete_booking"
```

---

## Task 6: Add `guest_name` filter to `list_bookings`

**Files:**
- Modify: `src/routers/bookings.py`
- Test: `tests/test_reservations.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_reservations.py`:

```python
def test_list_bookings_guest_name_filter(db, restaurant, table, lunch_slot, guest):
    import uuid as _uuid
    from src.models import Booking, Guest, LocationType, Table
    from src.database import set_rls

    set_rls(db, str(restaurant.id))

    # guest ("Alice") already has a booking from the fixture — create one
    monday = date(2026, 4, 6)
    create_booking(
        db, restaurant=restaurant, table=table, guest=guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )

    # Create a second guest and table
    bob_guest = Guest(
        id=_uuid.uuid4(), restaurant_id=restaurant.id,
        name="Bob", phone="+66800000099", preferred_channel=Channel.web,
    )
    db.add(bob_guest)
    table2 = Table(
        id=_uuid.uuid4(), restaurant_id=restaurant.id,
        label="T2", capacity=4, location_type=LocationType.indoor, is_active=True,
    )
    db.add(table2)
    db.flush()
    create_booking(
        db, restaurant=restaurant, table=table2, guest=bob_guest,
        slot_date=monday, slot_start_time=time(12, 0),
        duration_minutes=90, party_size=2,
        booked_via=Channel.web, special_requests=None,
    )

    # Filter by partial name "ali" — should return only Alice's booking
    results = (
        db.query(Booking)
        .join(Guest, Booking.guest_id == Guest.id)
        .filter(
            Booking.restaurant_id == restaurant.id,
            Guest.name.ilike("%ali%"),
        )
        .all()
    )
    assert len(results) == 1
    assert results[0].guest_id == guest.id
```

- [ ] **Step 2: Run test to verify it passes (query logic)**

```bash
pytest tests/test_reservations.py::test_list_bookings_guest_name_filter -v
```

Expected: PASS (validates the join query we'll use in the router)

- [ ] **Step 3: Add `guest_name` parameter to `list_bookings` in `src/routers/bookings.py`**

```python
@router.get("/bookings", response_model=list[BookingOut])
def list_bookings(
    target_date: date | None = Query(None, alias="date"),
    status: str | None = Query(None),
    guest_name: str | None = Query(None),
    tenant: Tenant = CurrentTenant,
    db: Session = Depends(get_db),
):
    set_rls(db, str(tenant.restaurant_id))
    from src.models import Guest
    q = db.query(Booking).filter(Booking.restaurant_id == tenant.restaurant_id)
    if target_date:
        q = q.filter(Booking.slot_date == target_date)
    if status:
        q = q.filter(Booking.status == BookingStatus(status))
    if guest_name:
        q = q.join(Guest, Booking.guest_id == Guest.id).filter(
            Guest.name.ilike(f"%{guest_name}%")
        )
    return q.all()
```

- [ ] **Step 4: Run all backend tests**

```bash
pytest tests/ -v
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/routers/bookings.py tests/test_reservations.py
git commit -m "feat: add guest_name partial-match filter to list_bookings"
```

---

## Task 7: Frontend — notification warning banner

**Files:**
- Modify: `frontend/components/BookingFlow.tsx`
- Modify: `frontend/app/confirmation/[code]/page.tsx`

- [ ] **Step 1: Update `handleConfirm` in `BookingFlow.tsx` to pass warning param**

Replace the `handleConfirm` function:

```typescript
async function handleConfirm() {
  if (!table || !slot) return;
  const result = await submitBooking({
    table_id: table.table_id,
    slot_date: date,
    slot_start_time: slot.start_time,
    party_size: partySize,
    booked_via: "web",
    guest_name: guest.name,
    guest_phone: guest.phone,
    guest_email: guest.email || undefined,
    special_requests: guest.special_requests || undefined,
  });
  if (result) {
    const suffix = result.notification_sent === false ? "?notif_warn=1" : "";
    router.push(`/confirmation/${result.confirmation_code}${suffix}`);
  }
}
```

- [ ] **Step 2: Update `confirmation/[code]/page.tsx` to read the param and render banner**

Add `useSearchParams` import and read the param. Add the amber banner below the NavBar when `notif_warn` is present.

Replace the imports block at the top of the file:

```typescript
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { NavBar } from "@/components/NavBar";
import { getBookingByCode, cancelBooking } from "@/lib/api";
import type { BookingOut } from "@/lib/types";
```

Add `useSearchParams` inside the component (after the existing hooks):

```typescript
const searchParams = useSearchParams();
const notifWarn = searchParams.get("notif_warn") === "1";
```

Add the amber banner inside the outer `<div>`, directly after `<NavBar />`:

```tsx
{notifWarn && (
  <div
    className="max-w-lg mx-auto px-4 pt-4"
  >
    <div
      className="rounded-2xl px-4 py-3 text-sm font-medium"
      style={{ background: "rgba(255,149,0,0.12)", color: "#9a5200" }}
    >
      We had a technical error while sending your confirmation message, but your table is booked.
    </div>
  </div>
)}
```

The full outer return structure should be:

```tsx
return (
  <div className="min-h-screen" style={{ background: "var(--color-apple-gray6)" }}>
    <NavBar />
    {notifWarn && (
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div
          className="rounded-2xl px-4 py-3 text-sm font-medium"
          style={{ background: "rgba(255,149,0,0.12)", color: "#9a5200" }}
        >
          We had a technical error while sending your confirmation message, but your table is booked.
        </div>
      </div>
    )}
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* ... rest of existing content unchanged ... */}
    </div>
  </div>
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/BookingFlow.tsx frontend/app/confirmation/[code]/page.tsx
git commit -m "feat: show amber warning banner when confirmation notification fails"
```

---

## Task 8: Frontend — update `useBookings` hook

**Files:**
- Modify: `frontend/hooks/useBookings.ts`

- [ ] **Step 1: Update `useBookings` to accept and pass `status` and `guestName`**

Replace the full contents of `frontend/hooks/useBookings.ts`:

```typescript
"use client";
import useSWR from "swr";
import { adminApi } from "@/lib/adminApi";

export interface AdminBooking {
  id: string;
  slot_date: string;
  slot_start_time: string;
  party_size: number;
  status: string;
  confirmation_code: string;
  guest_id: string;
  table_id: string;
  special_requests: string | null;
}

async function fetcher(url: string) {
  const resp = await adminApi.get<AdminBooking[]>(url);
  return resp.data;
}

export function useBookings(date?: string, status?: string, guestName?: string) {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (status) params.append("status", status);
  if (guestName) params.append("guest_name", guestName);
  const query = params.toString();
  const url = query ? `/bookings?${query}` : "/bookings";
  const { data, error, mutate } = useSWR<AdminBooking[]>(url, fetcher, { refreshInterval: 30000 });
  return { bookings: data ?? [], loading: !data && !error, error, mutate };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useBookings.ts
git commit -m "feat: useBookings hook accepts status and guestName filter params"
```

---

## Task 9: Frontend — admin bookings page filters

**Files:**
- Modify: `frontend/app/admin/bookings/page.tsx`

- [ ] **Step 1: Replace `BookingsPage` with status dropdown and debounced guest name input**

Replace the full contents of `frontend/app/admin/bookings/page.tsx`:

```typescript
"use client";
import { useState, useEffect } from "react";
import { useBookings } from "@/hooks/useBookings";
import BookingsTable from "@/components/admin/BookingsTable";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
];

const inputStyle = {
  borderColor: "rgba(209,209,214,0.5)",
};

export default function BookingsPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("");
  const [guestName, setGuestName] = useState("");
  const [debouncedGuestName, setDebouncedGuestName] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedGuestName(guestName), 400);
    return () => clearTimeout(t);
  }, [guestName]);

  const { bookings, loading, mutate } = useBookings(
    date,
    status || undefined,
    debouncedGuestName || undefined,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex-1">Bookings</h1>
        <input
          type="text"
          placeholder="Guest name…"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none border bg-white/80 w-40"
          style={inputStyle}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none border bg-white/80"
          style={inputStyle}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none border bg-white/80"
          style={inputStyle}
        />
      </div>
      <div className="glass-card overflow-hidden p-0" style={{ borderRadius: "20px" }}>
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>
            Loading bookings…
          </div>
        ) : (
          <BookingsTable bookings={bookings} onCancelled={() => mutate()} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/admin/bookings/page.tsx
git commit -m "feat: add guest name search and status filter to admin bookings page"
```

---

## Verification Checklist

After all tasks are complete, verify the following manually:

**Backend:**
- [ ] `pytest tests/ -v` — all tests pass
- [ ] `GET /bookings/code/RBK-XXXX` returns 404; a real code returns the booking
- [ ] Creating a booking fires a notification (check `notifications_log` table or Twilio logs)
- [ ] Cancelling a booking fires a cancellation notification

**Frontend (requires backend running):**
- [ ] `/confirmation/{code}` loads booking details without errors
- [ ] Cancel button on confirmation page works and shows "Reservation cancelled"
- [ ] If `NEXT_PUBLIC_CHANNEL_TOKEN` is not set, add it to `frontend/.env.local`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
  NEXT_PUBLIC_CHANNEL_TOKEN=<generate with create_token() from src/auth.py>
  ```
- [ ] Admin bookings page: typing a guest name filters results after 400ms debounce
- [ ] Admin bookings page: selecting a status filters results immediately
- [ ] Admin bookings page: Cancel button in table row triggers cancellation and refreshes list
