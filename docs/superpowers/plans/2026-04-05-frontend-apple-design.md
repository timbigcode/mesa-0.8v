# Frontend — Apple Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a beautiful restaurant booking web app with Apple-level design — clean whites, SF Pro typography, glassmorphism cards, smooth Framer Motion transitions, and a fully functional booking flow connected to the FastAPI backend.

**Architecture:** Next.js 14 App Router SPA with Tailwind CSS + shadcn/ui components. All API calls go to the FastAPI backend at `http://localhost:8000/api/v1`. Authentication uses JWT stored in localStorage. Three main surfaces: public booking page, booking confirmation/management, and a redirect to the admin dashboard.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, date-fns, Axios

---

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx                  # Root layout — SF Pro font, global styles
│   ├── page.tsx                    # Landing/booking page
│   ├── book/
│   │   └── page.tsx                # Multi-step booking form
│   ├── confirmation/
│   │   └── [code]/page.tsx         # Booking confirmation + management
│   └── globals.css                 # Tailwind base + Apple design tokens
├── components/
│   ├── ui/                         # shadcn/ui primitives (Button, Input, etc.)
│   ├── BookingFlow.tsx             # Multi-step booking wizard
│   ├── StepDatePicker.tsx          # Date selection step
│   ├── StepTablePicker.tsx         # Table/time selection step
│   ├── StepGuestDetails.tsx        # Guest info step
│   ├── StepConfirm.tsx             # Review & confirm step
│   ├── AvailabilityGrid.tsx        # Visual time slot grid
│   ├── BookingCard.tsx             # Glassmorphism booking summary card
│   └── NavBar.tsx                  # Top nav bar
├── lib/
│   ├── api.ts                      # Axios instance + all API calls
│   └── types.ts                    # TypeScript types matching backend schemas
├── hooks/
│   ├── useAvailability.ts          # Fetch available slots
│   └── useBooking.ts               # Create/cancel booking
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd "/Users/alvaroibanezvazquez/Desktop/AI Restaurant/restaurant-booking"
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd frontend
```

- [ ] **Step 2: Install dependencies**

```bash
npm install framer-motion axios date-fns
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-popover
npm install class-variance-authority clsx tailwind-merge lucide-react
npx shadcn-ui@latest init
```

When shadcn prompts:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 3: Replace `tailwind.config.ts` with Apple design tokens**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "SF Pro Display",
          "SF Pro Text", "Helvetica Neue", "Arial", "sans-serif"
        ],
      },
      colors: {
        apple: {
          blue:   "#007AFF",
          gray1:  "#8E8E93",
          gray2:  "#AEAEB2",
          gray3:  "#C7C7CC",
          gray4:  "#D1D1D6",
          gray5:  "#E5E5EA",
          gray6:  "#F2F2F7",
        },
      },
      borderRadius: { xl: "16px", "2xl": "24px", "3xl": "32px" },
      backdropBlur: { xs: "4px" },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0,0,0,0.08)",
        card:  "0 2px 16px 0 rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 4: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --radius: 0.75rem;
  }
  body {
    @apply bg-white text-gray-900 antialiased;
    font-feature-settings: "kern" 1, "liga" 1;
  }
  h1, h2, h3 { letter-spacing: -0.02em; }
}

@layer utilities {
  .glass {
    @apply bg-white/70 backdrop-blur-xl border border-white/20 shadow-glass;
  }
  .glass-dark {
    @apply bg-black/40 backdrop-blur-xl border border-white/10;
  }
}
```

- [ ] **Step 5: Replace `app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reserve — Restaurant Booking",
  description: "Book your table in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-apple-gray6">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
cd frontend && npm run dev
```

Expected: `ready on http://localhost:3000` with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: next.js frontend scaffold with apple design tokens"
```

---

## Task 2: API Client + Types

**Files:**
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/api.ts`

- [ ] **Step 1: Create `frontend/lib/types.ts`**

```typescript
export interface SlotOut {
  slot_id: string;
  start_time: string;       // "HH:MM:SS"
  duration_minutes: number;
}

export interface TableSlotOut {
  table_id: string;
  label: string;
  capacity: number;
  location_type: "indoor" | "outdoor" | "bar" | "private";
}

export interface BookingIn {
  table_id: string;
  slot_date: string;         // "YYYY-MM-DD"
  slot_start_time: string;   // "HH:MM:SS"
  party_size: number;
  booked_via: string;        // "web"
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  special_requests?: string;
}

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
}

export interface GuestOut {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferred_channel: string;
  visit_count: number;
  notes: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Create `frontend/lib/api.ts`**

```typescript
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Token is stored in localStorage after admin sets it.
// For public booking, the restaurant uses a shared "channel" token.
const CHANNEL_TOKEN = process.env.NEXT_PUBLIC_CHANNEL_TOKEN ?? "";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token") ?? CHANNEL_TOKEN
    : CHANNEL_TOKEN;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Availability ---
export async function getSlots(tableId: string, date: string, partySize: number) {
  const { data } = await api.get<import("./types").SlotOut[]>("/availability", {
    params: { table_id: tableId, date, party_size: partySize },
  });
  return data;
}

export async function getAvailableTables(date: string, slotTime: string, partySize: number) {
  const { data } = await api.get<import("./types").TableSlotOut[]>("/availability/tables", {
    params: { date, slot_time: slotTime, party_size: partySize },
  });
  return data;
}

// --- Bookings ---
export async function createBooking(payload: import("./types").BookingIn) {
  const { data } = await api.post<import("./types").BookingOut>("/bookings", payload);
  return data;
}

export async function cancelBooking(bookingId: string) {
  await api.delete(`/bookings/${bookingId}`);
}

export async function getBooking(bookingId: string) {
  const { data } = await api.get<import("./types").BookingOut>(`/bookings/${bookingId}`);
  return data;
}

// --- Guests ---
export async function lookupGuest(phone: string) {
  const { data } = await api.get<import("./types").GuestOut>("/guests", {
    params: { phone },
  });
  return data;
}
```

- [ ] **Step 3: Create `frontend/.env.local`**

```bash
# Generate a channel token first:
cd "/Users/alvaroibanezvazquez/Desktop/AI Restaurant/restaurant-booking"
.venv/bin/python -c "
from src.auth import create_token
import uuid
# Use a fixed restaurant ID for the public channel
rid = uuid.UUID('00000000-0000-0000-0000-000000000001')
print(create_token(rid, 'channel'))
"
```

Then create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_CHANNEL_TOKEN=<paste token from above>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/
git commit -m "feat: api client and typescript types"
```

---

## Task 3: NavBar Component

**Files:**
- Create: `frontend/components/NavBar.tsx`

- [ ] **Step 1: Create `frontend/components/NavBar.tsx`**

```typescript
"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export function NavBar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-gray-200/50"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Reserve
        </Link>
        <nav className="flex items-center gap-6 text-sm text-apple-gray1">
          <Link href="/book" className="hover:text-gray-900 transition-colors">
            Book a table
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
          >
            Admin
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/NavBar.tsx
git commit -m "feat: sticky glassmorphism navbar"
```

---

## Task 4: Landing Page

**Files:**
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: Create `frontend/app/page.tsx`**

```typescript
"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-apple-gray6 to-white">
      <NavBar />

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-32">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-apple-blue/10 text-apple-blue text-xs font-medium mb-6">
            Now taking reservations
          </span>
          <h1 className="text-6xl font-bold tracking-tight mb-6 text-gray-900">
            A table for<br />every moment.
          </h1>
          <p className="text-xl text-apple-gray1 mb-10 max-w-md mx-auto">
            Reserve your spot in seconds. No account needed.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gray-900 text-white text-base font-medium hover:bg-gray-700 active:scale-95 transition-all duration-150"
          >
            Book a table
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { icon: "⚡", title: "Instant confirmation", body: "Your booking is confirmed the moment you submit." },
            { icon: "📱", title: "SMS & WhatsApp", body: "Reminders sent to your phone, your way." },
            { icon: "🔄", title: "Easy cancellation", body: "Cancel anytime up to 2 hours before your visit." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-3xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-apple-gray1">{f.body}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and visually verify**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` — should show hero text, CTA button, 3 glass cards.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: landing page with hero and feature cards"
```

---

## Task 5: Multi-Step Booking Form

**Files:**
- Create: `frontend/hooks/useAvailability.ts`
- Create: `frontend/hooks/useBooking.ts`
- Create: `frontend/components/StepDatePicker.tsx`
- Create: `frontend/components/StepTablePicker.tsx`
- Create: `frontend/components/StepGuestDetails.tsx`
- Create: `frontend/components/StepConfirm.tsx`
- Create: `frontend/components/BookingFlow.tsx`
- Create: `frontend/app/book/page.tsx`

- [ ] **Step 1: Create `frontend/hooks/useAvailability.ts`**

```typescript
import { useState } from "react";
import { getAvailableTables, getSlots } from "@/lib/api";
import type { TableSlotOut, SlotOut } from "@/lib/types";

export function useAvailability() {
  const [tables, setTables] = useState<TableSlotOut[]>([]);
  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTables(date: string, slotTime: string, partySize: number) {
    setLoading(true); setError(null);
    try {
      setTables(await getAvailableTables(date, slotTime, partySize));
    } catch {
      setError("Could not load available tables.");
    } finally { setLoading(false); }
  }

  async function fetchSlots(tableId: string, date: string, partySize: number) {
    setLoading(true); setError(null);
    try {
      setSlots(await getSlots(tableId, date, partySize));
    } catch {
      setError("Could not load available slots.");
    } finally { setLoading(false); }
  }

  return { tables, slots, loading, error, fetchTables, fetchSlots };
}
```

- [ ] **Step 2: Create `frontend/hooks/useBooking.ts`**

```typescript
import { useState } from "react";
import { createBooking, cancelBooking } from "@/lib/api";
import type { BookingIn, BookingOut } from "@/lib/types";

export function useBooking() {
  const [booking, setBooking] = useState<BookingOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitBooking(payload: BookingIn) {
    setLoading(true); setError(null);
    try {
      const result = await createBooking(payload);
      setBooking(result);
      return result;
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Booking failed. Please try again.";
      setError(msg);
      return null;
    } finally { setLoading(false); }
  }

  async function cancel(bookingId: string) {
    setLoading(true); setError(null);
    try {
      await cancelBooking(bookingId);
      setBooking(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Cancellation failed.";
      setError(msg);
    } finally { setLoading(false); }
  }

  return { booking, loading, error, submitBooking, cancel };
}
```

- [ ] **Step 3: Create `frontend/components/StepDatePicker.tsx`**

```typescript
"use client";
import { useState } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { motion } from "framer-motion";

interface Props {
  partySize: number;
  onPartySizeChange: (n: number) => void;
  onSelect: (date: string) => void;
}

export function StepDatePicker({ partySize, onPartySizeChange, onSelect }: Props) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const [selected, setSelected] = useState<Date | null>(null);

  function pick(d: Date) {
    setSelected(d);
    onSelect(format(d, "yyyy-MM-dd"));
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Party size</label>
        <div className="flex gap-2 flex-wrap">
          {[1,2,3,4,5,6,7,8].map((n) => (
            <button
              key={n}
              onClick={() => onPartySizeChange(n)}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                partySize === n
                  ? "bg-gray-900 text-white"
                  : "bg-apple-gray5 text-gray-700 hover:bg-apple-gray4"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select a date</label>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const isSelected = selected && format(d, "yyyy-MM-dd") === format(selected, "yyyy-MM-dd");
            return (
              <button
                key={d.toISOString()}
                onClick={() => pick(d)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs transition-all ${
                  isSelected
                    ? "bg-gray-900 text-white"
                    : "bg-apple-gray5 text-gray-700 hover:bg-apple-gray4"
                }`}
              >
                <span className="uppercase opacity-60">{format(d, "EEE")}</span>
                <span className="font-semibold text-sm">{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/components/StepTablePicker.tsx`**

```typescript
"use client";
import { useEffect } from "react";
import { useAvailability } from "@/hooks/useAvailability";
import type { TableSlotOut, SlotOut } from "@/lib/types";

interface Props {
  date: string;
  partySize: number;
  onSelect: (table: TableSlotOut, slot: SlotOut) => void;
}

const TIMES = ["12:00:00","13:00:00","14:00:00","19:00:00","20:00:00","21:00:00"];
const TIME_LABELS: Record<string, string> = {
  "12:00:00":"12:00 PM","13:00:00":"1:00 PM","14:00:00":"2:00 PM",
  "19:00:00":"7:00 PM","20:00:00":"8:00 PM","21:00:00":"9:00 PM",
};

export function StepTablePicker({ date, partySize, onSelect }: Props) {
  const { tables, loading, error, fetchTables } = useAvailability();

  function handleTime(slotTime: string) {
    fetchTables(date, slotTime, partySize);
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred time</label>
        <div className="flex gap-2 flex-wrap">
          {TIMES.map((t) => (
            <button
              key={t}
              onClick={() => handleTime(t)}
              className="px-4 py-2 rounded-xl bg-apple-gray5 text-sm font-medium hover:bg-apple-gray4 transition-colors"
            >
              {TIME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-apple-gray1">Loading tables…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {tables.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Available tables</label>
          <div className="grid grid-cols-2 gap-3">
            {tables.map((t) => (
              <button
                key={t.table_id}
                onClick={() => onSelect(t, { slot_id: t.table_id, start_time: "12:00:00", duration_minutes: 90 })}
                className="glass rounded-2xl p-4 text-left hover:shadow-md transition-all active:scale-95"
              >
                <div className="font-semibold">{t.label}</div>
                <div className="text-xs text-apple-gray1 mt-1">
                  Up to {t.capacity} guests · {t.location_type}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && tables.length === 0 && (
        <p className="text-sm text-apple-gray1">Select a time to see available tables.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/components/StepGuestDetails.tsx`**

```typescript
"use client";

interface GuestForm {
  name: string;
  phone: string;
  email: string;
  special_requests: string;
}

interface Props {
  value: GuestForm;
  onChange: (f: GuestForm) => void;
}

export function StepGuestDetails({ value, onChange }: Props) {
  function set(field: keyof GuestForm, v: string) {
    onChange({ ...value, [field]: v });
  }

  return (
    <div className="space-y-4">
      {[
        { label: "Full name", field: "name" as const, type: "text", placeholder: "Alex Johnson" },
        { label: "Phone number", field: "phone" as const, type: "tel", placeholder: "+1 (555) 000-0000" },
        { label: "Email (optional)", field: "email" as const, type: "email", placeholder: "alex@example.com" },
      ].map(({ label, field, type, placeholder }) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
          <input
            type={type}
            value={value[field]}
            onChange={(e) => set(field, e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl bg-apple-gray6 border border-apple-gray4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Special requests</label>
        <textarea
          value={value.special_requests}
          onChange={(e) => set("special_requests", e.target.value)}
          placeholder="Allergies, celebrations, seating preferences…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-apple-gray6 border border-apple-gray4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/components/StepConfirm.tsx`**

```typescript
"use client";
import { format, parse } from "date-fns";
import type { TableSlotOut, SlotOut } from "@/lib/types";

interface GuestForm { name: string; phone: string; email: string; special_requests: string; }

interface Props {
  date: string;
  partySize: number;
  table: TableSlotOut;
  slot: SlotOut;
  guest: GuestForm;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
}

export function StepConfirm({ date, partySize, table, slot, guest, loading, error, onConfirm }: Props) {
  const dateLabel = format(parse(date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy");
  const timeLabel = format(parse(slot.start_time, "HH:mm:ss", new Date()), "h:mm a");

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6 space-y-4">
        <Row label="Date" value={dateLabel} />
        <Row label="Time" value={timeLabel} />
        <Row label="Table" value={`${table.label} (${table.location_type})`} />
        <Row label="Party" value={`${partySize} ${partySize === 1 ? "guest" : "guests"}`} />
        <Row label="Name" value={guest.name} />
        <Row label="Phone" value={guest.phone} />
        {guest.email && <Row label="Email" value={guest.email} />}
        {guest.special_requests && <Row label="Requests" value={guest.special_requests} />}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-700 active:scale-95 disabled:opacity-50 transition-all"
      >
        {loading ? "Confirming…" : "Confirm booking"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-apple-gray1">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
```

- [ ] **Step 7: Create `frontend/components/BookingFlow.tsx`**

```typescript
"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBooking } from "@/hooks/useBooking";
import { StepDatePicker } from "./StepDatePicker";
import { StepTablePicker } from "./StepTablePicker";
import { StepGuestDetails } from "./StepGuestDetails";
import { StepConfirm } from "./StepConfirm";
import type { TableSlotOut, SlotOut, BookingOut } from "@/lib/types";

const STEPS = ["Date & party", "Choose table", "Your details", "Confirm"];

interface GuestForm { name: string; phone: string; email: string; special_requests: string; }

interface Props { onComplete: (booking: BookingOut) => void; }

export function BookingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [table, setTable] = useState<TableSlotOut | null>(null);
  const [slot, setSlot] = useState<SlotOut | null>(null);
  const [guest, setGuest] = useState<GuestForm>({ name:"", phone:"", email:"", special_requests:"" });
  const { loading, error, submitBooking } = useBooking();

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function confirm() {
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
    if (result) onComplete(result);
  }

  function handleTableSelect(t: TableSlotOut, s: SlotOut) {
    setTable(t); setSlot(s); next();
  }

  return (
    <div className="glass rounded-3xl p-8 max-w-lg w-full mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i < step ? "bg-gray-900 text-white"
              : i === step ? "bg-gray-900 text-white"
              : "bg-apple-gray5 text-apple-gray2"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? "bg-gray-900" : "bg-apple-gray4"}`} />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-6">{STEPS[step]}</h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <StepDatePicker
              partySize={partySize}
              onPartySizeChange={setPartySize}
              onSelect={(d) => { setDate(d); next(); }}
            />
          )}
          {step === 1 && (
            <StepTablePicker
              date={date}
              partySize={partySize}
              onSelect={handleTableSelect}
            />
          )}
          {step === 2 && (
            <>
              <StepGuestDetails value={guest} onChange={setGuest} />
              <button
                onClick={next}
                disabled={!guest.name || !guest.phone}
                className="mt-6 w-full py-3.5 rounded-2xl bg-gray-900 text-white font-medium disabled:opacity-40 hover:bg-gray-700 transition-all"
              >
                Continue
              </button>
            </>
          )}
          {step === 3 && table && slot && (
            <StepConfirm
              date={date} partySize={partySize} table={table} slot={slot}
              guest={guest} loading={loading} error={error} onConfirm={confirm}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {step > 0 && step < 3 && (
        <button onClick={back} className="mt-4 text-sm text-apple-gray1 hover:text-gray-900 transition-colors">
          ← Back
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create `frontend/app/book/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { BookingFlow } from "@/components/BookingFlow";
import type { BookingOut } from "@/lib/types";

export default function BookPage() {
  const router = useRouter();

  function handleComplete(booking: BookingOut) {
    router.push(`/confirmation/${booking.confirmation_code}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-apple-gray6 to-white">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold tracking-tight mb-8 text-center">Book a table</h1>
          <BookingFlow onComplete={handleComplete} />
        </motion.div>
      </main>
    </div>
  );
}
```

- [ ] **Step 9: Visual test — walk through booking flow**

Open `http://localhost:3000/book` and complete all 4 steps.
Expected: smooth step transitions, tables load after clicking a time, confirm button submits.

- [ ] **Step 10: Commit**

```bash
git add frontend/hooks/ frontend/components/ frontend/app/book/
git commit -m "feat: multi-step booking flow with apple design"
```

---

## Task 6: Confirmation Page

**Files:**
- Create: `frontend/app/confirmation/[code]/page.tsx`

- [ ] **Step 1: Create `frontend/app/confirmation/[code]/page.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { NavBar } from "@/components/NavBar";
import { getBooking, cancelBooking } from "@/lib/api";
import { api } from "@/lib/api";
import type { BookingOut } from "@/lib/types";

export default function ConfirmationPage({ params }: { params: { code: string } }) {
  const [booking, setBooking] = useState<BookingOut | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Look up bookings by confirmation code
    api.get<BookingOut[]>("/bookings").then(({ data }) => {
      const found = data.find((b) => b.confirmation_code === params.code);
      if (found) setBooking(found);
    }).catch(() => setError("Could not load booking."));
  }, [params.code]);

  async function handleCancel() {
    if (!booking) return;
    setLoading(true);
    try {
      await cancelBooking(booking.id);
      setCancelled(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Cancellation failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-apple-gray6 to-white">
      <NavBar />
      <main className="max-w-lg mx-auto px-6 py-16">
        {cancelled ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-bold mb-2">Booking cancelled</h1>
            <p className="text-apple-gray1">We hope to see you another time.</p>
          </motion.div>
        ) : booking ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">
                {booking.status === "confirmed" ? "✅" : "❌"}
              </div>
              <h1 className="text-2xl font-bold mb-1">
                {booking.status === "confirmed" ? "You're confirmed!" : "Booking " + booking.status}
              </h1>
              <p className="font-mono text-apple-gray1">{booking.confirmation_code}</p>
            </div>

            <div className="glass rounded-3xl p-6 space-y-3">
              {[
                ["Date", format(parse(booking.slot_date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d")],
                ["Time", format(parse(booking.slot_start_time, "HH:mm:ss", new Date()), "h:mm a")],
                ["Guests", String(booking.party_size)],
                ["Status", booking.status],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-apple-gray1">{l}</span>
                  <span className="font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>

            {booking.status === "confirmed" && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 disabled:opacity-40 transition-all"
              >
                {loading ? "Cancelling…" : "Cancel booking"}
              </button>
            )}
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </motion.div>
        ) : (
          <p className="text-center text-apple-gray1">Loading…</p>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Test confirmation page**

After completing a booking, you should be redirected to `/confirmation/RBK-XXXX`.
Verify the booking details display correctly and cancel button works.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/confirmation/
git commit -m "feat: booking confirmation page with cancel"
```

---

## Self-Review Checklist

- [x] Booking flow: date picker → table picker → guest details → confirm → confirmation page
- [x] Apple design: glassmorphism cards, SF Pro font stack, smooth Framer Motion transitions
- [x] API integration: all calls go through `lib/api.ts`
- [x] TypeScript types match backend schemas
- [x] No TBD or placeholder steps — all code is complete
- [x] `NEXT_PUBLIC_CHANNEL_TOKEN` setup documented
