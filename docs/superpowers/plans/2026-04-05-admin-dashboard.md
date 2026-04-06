# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 protected admin dashboard with JWT authentication, live bookings management (view/cancel), table and time-slot configuration, and a today's-at-a-glance overview panel.

**Architecture:** Next.js 14 App Router under `admin/` directory. A shared `AdminLayout` wraps all protected pages with a sidebar. A custom `useAdminAuth` hook reads JWT from `localStorage`, redirects unauthenticated users to `/admin/login`, and attaches Bearer tokens to all API calls. Data fetching uses SWR for real-time polling. Pages: Login, Overview, Bookings, Guests, Tables, Time Slots.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (Apple tokens from frontend plan), shadcn/ui, SWR, Axios, TypeScript, existing FastAPI backend.

**Prerequisite:** The frontend scaffold from `2026-04-05-frontend-apple-design.md` Task 1 must be complete (Next.js project exists at `restaurant-booking/frontend/`).

---

## File Structure

```
restaurant-booking/frontend/
  app/
    admin/
      layout.tsx              ← Protected layout: auth check + sidebar
      login/
        page.tsx              ← Login form → POST /api/v1/auth/token
      page.tsx                ← Overview (today's bookings count, occupancy)
      bookings/
        page.tsx              ← Bookings table with filter/cancel
      guests/
        page.tsx              ← Guest list with visit count
      tables/
        page.tsx              ← Table list + add/edit/toggle active
      slots/
        page.tsx              ← Time slots list + add/edit/toggle active
  components/admin/
    Sidebar.tsx               ← Nav links, logout button
    BookingsTable.tsx         ← Sortable bookings data table
    StatCard.tsx              ← Metric card (count, label, icon)
  hooks/
    useAdminAuth.ts           ← JWT storage, redirect guard, axios instance
    useBookings.ts            ← SWR hook for /api/v1/bookings
    useTables.ts              ← SWR hook for /api/v1/tables
    useSlots.ts               ← SWR hook for /api/v1/slots
  lib/
    adminApi.ts               ← Axios instance with admin JWT interceptor
```

**Backend addition needed:**
```
restaurant-booking/src/
  routers/
    auth.py                   ← POST /auth/token (username+password → JWT)
```

---

### Task 1: Backend auth endpoint

**Files:**
- Create: `restaurant-booking/src/routers/auth.py`
- Modify: `restaurant-booking/src/main.py`
- Modify: `restaurant-booking/src/config.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_auth.py
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_login_returns_token():
    resp = client.post("/api/v1/auth/token", data={
        "username": "admin",
        "password": "admin1234",
        "restaurant_id": "00000000-0000-0000-0000-000000000001",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"

def test_login_wrong_password():
    resp = client.post("/api/v1/auth/token", data={
        "username": "admin",
        "password": "wrongpass",
        "restaurant_id": "00000000-0000-0000-0000-000000000001",
    })
    assert resp.status_code == 401
```

- [ ] **Step 2: Run to verify failure**

```bash
cd restaurant-booking
source .venv/bin/activate
pytest tests/test_auth.py -v
```

Expected: FAILED — `404 Not Found`

- [ ] **Step 3: Add admin credentials to config**

In `src/config.py`, add to `Settings`:

```python
admin_username: str = "admin"
admin_password: str = "admin1234"
```

- [ ] **Step 4: Create `src/routers/auth.py`**

```python
from __future__ import annotations
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Form, HTTPException, status
from src.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

def _make_token(restaurant_id: str) -> str:
    payload = {
        "sub": "admin",
        "restaurant_id": restaurant_id,
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = _make_token(restaurant_id)
    return {"access_token": token, "token_type": "bearer"}
```

- [ ] **Step 5: Register router in `src/main.py`**

```python
from src.routers import auth as auth_router
app.include_router(auth_router.router, prefix="/api/v1")
```

- [ ] **Step 6: Run tests to verify pass**

```bash
pytest tests/test_auth.py -v
```

Expected: 2 PASSED

- [ ] **Step 7: Commit**

```bash
git add src/routers/auth.py src/main.py src/config.py tests/test_auth.py
git commit -m "feat(admin): backend auth token endpoint"
```

---

### Task 2: Admin API client and auth hook

**Files:**
- Create: `restaurant-booking/frontend/lib/adminApi.ts`
- Create: `restaurant-booking/frontend/hooks/useAdminAuth.ts`

- [ ] **Step 1: Create `frontend/lib/adminApi.ts`**

```typescript
// lib/adminApi.ts
import axios from "axios"

const RESTAURANT_ID = "00000000-0000-0000-0000-000000000001"

export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
})

adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export async function adminLogin(username: string, password: string): Promise<string> {
  const params = new URLSearchParams()
  params.set("username", username)
  params.set("password", password)
  params.set("restaurant_id", RESTAURANT_ID)
  const resp = await adminApi.post<{ access_token: string }>("/auth/token", params)
  const token = resp.data.access_token
  localStorage.setItem("admin_token", token)
  return token
}

export function adminLogout(): void {
  localStorage.removeItem("admin_token")
}
```

- [ ] **Step 2: Create `frontend/hooks/useAdminAuth.ts`**

```typescript
// hooks/useAdminAuth.ts
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function useAdminAuth() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("admin_token")
    if (!stored) {
      router.replace("/admin/login")
    } else {
      setToken(stored)
    }
    setLoading(false)
  }, [router])

  return { token, loading }
}
```

- [ ] **Step 3: Install SWR**

```bash
cd restaurant-booking/frontend
npm install swr
```

Expected: `added N packages`

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/adminApi.ts frontend/hooks/useAdminAuth.ts
git commit -m "feat(admin): admin API client and auth hook"
```

---

### Task 3: Login page

**Files:**
- Create: `restaurant-booking/frontend/app/admin/login/page.tsx`

- [ ] **Step 1: Create `app/admin/login/page.tsx`**

```tsx
// app/admin/login/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminLogin } from "@/lib/adminApi"

export default function AdminLogin() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await adminLogin(username, password)
      router.push("/admin")
    } catch {
      setError("Invalid username or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-apple-bg">
      <div className="w-full max-w-sm glass-card p-8">
        <h1 className="text-2xl font-semibold text-apple-label mb-8 text-center">
          Admin Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-apple-secondary mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-apple-separator bg-white/60 
                         text-apple-label focus:outline-none focus:ring-2 focus:ring-apple-blue"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-apple-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-apple-separator bg-white/60 
                         text-apple-label focus:outline-none focus:ring-2 focus:ring-apple-blue"
              required
            />
          </div>
          {error && <p className="text-apple-red text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-apple-blue text-white font-medium
                       hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify login page renders**

```bash
cd restaurant-booking/frontend
npm run dev
```

Open `http://localhost:3000/admin/login`. Expected: login form with username/password fields.

- [ ] **Step 3: Commit**

```bash
git add app/admin/login/page.tsx
git commit -m "feat(admin): login page"
```

---

### Task 4: Admin layout with sidebar

**Files:**
- Create: `restaurant-booking/frontend/components/admin/Sidebar.tsx`
- Create: `restaurant-booking/frontend/app/admin/layout.tsx`

- [ ] **Step 1: Create `components/admin/Sidebar.tsx`**

```tsx
// components/admin/Sidebar.tsx
"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { adminLogout } from "@/lib/adminApi"

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/bookings", label: "Bookings", icon: "📅" },
  { href: "/admin/guests", label: "Guests", icon: "👥" },
  { href: "/admin/tables", label: "Tables", icon: "🪑" },
  { href: "/admin/slots", label: "Time Slots", icon: "⏰" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    adminLogout()
    router.push("/admin/login")
  }

  return (
    <aside className="w-56 min-h-screen bg-white/70 backdrop-blur-xl border-r border-apple-separator
                      flex flex-col py-8 px-4">
      <div className="mb-8 px-2">
        <h2 className="text-lg font-semibold text-apple-label">Restaurant</h2>
        <p className="text-xs text-apple-secondary">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition
                ${active
                  ? "bg-apple-blue text-white font-medium"
                  : "text-apple-label hover:bg-apple-fill"
                }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-4 px-3 py-2 text-sm text-apple-red hover:bg-red-50 rounded-xl transition text-left"
      >
        Sign Out
      </button>
    </aside>
  )
}
```

- [ ] **Step 2: Create `app/admin/layout.tsx`**

```tsx
// app/admin/layout.tsx
"use client"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import Sidebar from "@/components/admin/Sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-apple-bg">
        <div className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-apple-bg">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/Sidebar.tsx app/admin/layout.tsx
git commit -m "feat(admin): admin layout with sidebar navigation"
```

---

### Task 5: StatCard component and Overview page

**Files:**
- Create: `restaurant-booking/frontend/components/admin/StatCard.tsx`
- Create: `restaurant-booking/frontend/app/admin/page.tsx`
- Create: `restaurant-booking/frontend/hooks/useBookings.ts`

- [ ] **Step 1: Create `components/admin/StatCard.tsx`**

```tsx
// components/admin/StatCard.tsx
interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color?: string
}

export default function StatCard({ label, value, icon, color = "text-apple-blue" }: StatCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-apple-secondary mb-1">{label}</p>
          <p className={`text-3xl font-semibold ${color}`}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `hooks/useBookings.ts`**

```typescript
// hooks/useBookings.ts
import useSWR from "swr"
import { adminApi } from "@/lib/adminApi"

export interface Booking {
  id: string
  slot_date: string
  slot_start_time: string
  party_size: number
  status: string
  confirmation_code: string
  guest_id: string
  table_id: string
}

async function fetcher(url: string) {
  const resp = await adminApi.get<Booking[]>(url)
  return resp.data
}

export function useBookings(date?: string) {
  const url = date ? `/bookings?date=${date}` : "/bookings"
  const { data, error, mutate } = useSWR<Booking[]>(url, fetcher, { refreshInterval: 30000 })
  return {
    bookings: data ?? [],
    loading: !data && !error,
    error,
    mutate,
  }
}
```

- [ ] **Step 3: Create `app/admin/page.tsx`**

```tsx
// app/admin/page.tsx
"use client"
import { useBookings } from "@/hooks/useBookings"
import StatCard from "@/components/admin/StatCard"

export default function AdminOverview() {
  const today = new Date().toISOString().split("T")[0]
  const { bookings, loading } = useBookings(today)

  const confirmed = bookings.filter((b) => b.status === "confirmed").length
  const cancelled = bookings.filter((b) => b.status === "cancelled").length
  const completed = bookings.filter((b) => b.status === "completed").length
  const total = bookings.length

  return (
    <div>
      <h1 className="text-2xl font-semibold text-apple-label mb-2">Overview</h1>
      <p className="text-apple-secondary mb-8">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>

      {loading ? (
        <div className="text-apple-secondary">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Bookings" value={total} icon="📅" />
          <StatCard label="Confirmed" value={confirmed} icon="✅" color="text-apple-green" />
          <StatCard label="Cancelled" value={cancelled} icon="❌" color="text-apple-red" />
          <StatCard label="Completed" value={completed} icon="🏁" color="text-apple-secondary" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify overview page**

```bash
cd restaurant-booking/frontend
npm run dev
```

Log in at `http://localhost:3000/admin/login`, then navigate to `http://localhost:3000/admin`. Expected: 4 stat cards.

- [ ] **Step 5: Commit**

```bash
git add components/admin/StatCard.tsx hooks/useBookings.ts app/admin/page.tsx
git commit -m "feat(admin): overview page with today's booking stats"
```

---

### Task 6: Bookings management page

**Files:**
- Create: `restaurant-booking/frontend/components/admin/BookingsTable.tsx`
- Create: `restaurant-booking/frontend/app/admin/bookings/page.tsx`

- [ ] **Step 1: Create `components/admin/BookingsTable.tsx`**

```tsx
// components/admin/BookingsTable.tsx
"use client"
import { Booking } from "@/hooks/useBookings"
import { adminApi } from "@/lib/adminApi"

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-600",
  no_show:   "bg-yellow-100 text-yellow-800",
}

interface Props {
  bookings: Booking[]
  onCancelled: () => void
}

export default function BookingsTable({ bookings, onCancelled }: Props) {
  async function handleCancel(id: string) {
    if (!confirm("Cancel this booking?")) return
    await adminApi.delete(`/bookings/${id}`)
    onCancelled()
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-apple-secondary border-b border-apple-separator">
            <th className="text-left py-3 px-4 font-medium">Code</th>
            <th className="text-left py-3 px-4 font-medium">Date</th>
            <th className="text-left py-3 px-4 font-medium">Time</th>
            <th className="text-left py-3 px-4 font-medium">Guests</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-apple-separator hover:bg-apple-fill transition">
              <td className="py-3 px-4 font-mono text-apple-blue">{b.confirmation_code}</td>
              <td className="py-3 px-4 text-apple-label">{b.slot_date}</td>
              <td className="py-3 px-4 text-apple-label">{b.slot_start_time.slice(0, 5)}</td>
              <td className="py-3 px-4 text-apple-label">{b.party_size}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] ?? ""}`}>
                  {b.status}
                </span>
              </td>
              <td className="py-3 px-4">
                {b.status === "confirmed" && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    className="text-apple-red text-xs hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-apple-secondary">
                No bookings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/admin/bookings/page.tsx`**

```tsx
// app/admin/bookings/page.tsx
"use client"
import { useState } from "react"
import { useBookings } from "@/hooks/useBookings"
import BookingsTable from "@/components/admin/BookingsTable"

export default function BookingsPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const { bookings, loading, mutate } = useBookings(date)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-apple-label">Bookings</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 rounded-xl border border-apple-separator bg-white/60 
                     text-apple-label focus:outline-none focus:ring-2 focus:ring-apple-blue text-sm"
        />
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-apple-secondary">Loading bookings…</div>
        ) : (
          <BookingsTable bookings={bookings} onCancelled={mutate} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/BookingsTable.tsx app/admin/bookings/page.tsx
git commit -m "feat(admin): bookings management page with cancel action"
```

---

### Task 7: Tables and Time Slots config pages

**Files:**
- Create: `restaurant-booking/frontend/hooks/useTables.ts`
- Create: `restaurant-booking/frontend/hooks/useSlots.ts`
- Create: `restaurant-booking/frontend/app/admin/tables/page.tsx`
- Create: `restaurant-booking/frontend/app/admin/slots/page.tsx`

- [ ] **Step 1: Create `hooks/useTables.ts`**

```typescript
// hooks/useTables.ts
import useSWR from "swr"
import { adminApi } from "@/lib/adminApi"

export interface Table {
  id: string
  label: string
  capacity: number
  location_type: string
  is_active: boolean
}

async function fetcher(url: string) {
  const resp = await adminApi.get<Table[]>(url)
  return resp.data
}

export function useTables() {
  const { data, error, mutate } = useSWR<Table[]>("/tables", fetcher)
  return { tables: data ?? [], loading: !data && !error, error, mutate }
}
```

- [ ] **Step 2: Create `hooks/useSlots.ts`**

```typescript
// hooks/useSlots.ts
import useSWR from "swr"
import { adminApi } from "@/lib/adminApi"

export interface Slot {
  id: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  is_active: boolean
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const dayName = (d: number) => DAYS[d] ?? String(d)

async function fetcher(url: string) {
  const resp = await adminApi.get<Slot[]>(url)
  return resp.data
}

export function useSlots() {
  const { data, error, mutate } = useSWR<Slot[]>("/slots", fetcher)
  return { slots: data ?? [], loading: !data && !error, error, mutate }
}
```

- [ ] **Step 3: Create `app/admin/tables/page.tsx`**

```tsx
// app/admin/tables/page.tsx
"use client"
import { useTables } from "@/hooks/useTables"
import { adminApi } from "@/lib/adminApi"

export default function TablesPage() {
  const { tables, loading, mutate } = useTables()

  async function toggleActive(id: string, current: boolean) {
    await adminApi.patch(`/tables/${id}`, { is_active: !current })
    mutate()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-apple-label mb-6">Tables</h1>
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-apple-secondary">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-apple-secondary border-b border-apple-separator">
                <th className="text-left py-3 px-4 font-medium">Label</th>
                <th className="text-left py-3 px-4 font-medium">Capacity</th>
                <th className="text-left py-3 px-4 font-medium">Location</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id} className="border-b border-apple-separator hover:bg-apple-fill">
                  <td className="py-3 px-4 font-medium text-apple-label">{t.label}</td>
                  <td className="py-3 px-4 text-apple-label">{t.capacity}</td>
                  <td className="py-3 px-4 text-apple-secondary capitalize">{t.location_type}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                    }`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      className="text-apple-blue text-xs hover:underline"
                    >
                      {t.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/admin/slots/page.tsx`**

```tsx
// app/admin/slots/page.tsx
"use client"
import { useSlots, dayName } from "@/hooks/useSlots"
import { adminApi } from "@/lib/adminApi"

export default function SlotsPage() {
  const { slots, loading, mutate } = useSlots()

  async function toggleActive(id: string, current: boolean) {
    await adminApi.patch(`/slots/${id}`, { is_active: !current })
    mutate()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-apple-label mb-6">Time Slots</h1>
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-apple-secondary">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-apple-secondary border-b border-apple-separator">
                <th className="text-left py-3 px-4 font-medium">Day</th>
                <th className="text-left py-3 px-4 font-medium">Start Time</th>
                <th className="text-left py-3 px-4 font-medium">Duration</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.id} className="border-b border-apple-separator hover:bg-apple-fill">
                  <td className="py-3 px-4 font-medium text-apple-label">{dayName(s.day_of_week)}</td>
                  <td className="py-3 px-4 text-apple-label">{s.start_time.slice(0, 5)}</td>
                  <td className="py-3 px-4 text-apple-secondary">{s.duration_minutes} min</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                    }`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(s.id, s.is_active)}
                      className="text-apple-blue text-xs hover:underline"
                    >
                      {s.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useTables.ts hooks/useSlots.ts app/admin/tables/page.tsx app/admin/slots/page.tsx
git commit -m "feat(admin): tables and time slots config pages"
```

---

### Task 8: Guests page

**Files:**
- Create: `restaurant-booking/frontend/app/admin/guests/page.tsx`

- [ ] **Step 1: Create `app/admin/guests/page.tsx`**

```tsx
// app/admin/guests/page.tsx
"use client"
import { useState } from "react"
import useSWR from "swr"
import { adminApi } from "@/lib/adminApi"

interface Guest {
  id: string
  name: string
  phone: string
  email: string | null
  visit_count: number
  preferred_channel: string
  notes: string | null
}

async function fetcher(url: string) {
  const resp = await adminApi.get<Guest[]>(url)
  return resp.data
}

export default function GuestsPage() {
  const [search, setSearch] = useState("")
  const { data: guests = [], isLoading } = useSWR<Guest[]>("/guests", fetcher)

  const filtered = guests.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-apple-label">Guests</h1>
        <input
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl border border-apple-separator bg-white/60 
                     text-apple-label focus:outline-none focus:ring-2 focus:ring-apple-blue text-sm w-64"
        />
      </div>
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-apple-secondary">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-apple-secondary border-b border-apple-separator">
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Phone</th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-left py-3 px-4 font-medium">Visits</th>
                <th className="text-left py-3 px-4 font-medium">Channel</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-apple-separator hover:bg-apple-fill">
                  <td className="py-3 px-4 font-medium text-apple-label">{g.name}</td>
                  <td className="py-3 px-4 text-apple-secondary">{g.phone}</td>
                  <td className="py-3 px-4 text-apple-secondary">{g.email ?? "—"}</td>
                  <td className="py-3 px-4 text-apple-label font-semibold">{g.visit_count}</td>
                  <td className="py-3 px-4 text-apple-secondary capitalize">{g.preferred_channel}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-apple-secondary">
                    No guests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify full admin flow**

```bash
cd restaurant-booking/frontend
npm run dev
```

1. Go to `http://localhost:3000/admin` — should redirect to `/admin/login`
2. Login with `admin` / `admin1234`
3. Navigate to Overview, Bookings, Guests, Tables, Slots
4. All pages should load without console errors

- [ ] **Step 3: Commit**

```bash
git add app/admin/guests/page.tsx
git commit -m "feat(admin): guests page with search filter"
```

---
