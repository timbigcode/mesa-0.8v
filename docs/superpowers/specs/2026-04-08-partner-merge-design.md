# Partner Repository Merge — Design Doc
**Date:** 2026-04-08
**Source:** `ai-restaurant-booking-main.zip` (partner's fork)

## Summary

Merged partner's contributions into the main repository. Partner's version was treated as the base for all shared files. Unique additions from the main repo were preserved on top.

## What Changed

### New files added (Group A — partner only)
| File | Purpose |
|---|---|
| `frontend/app/admin/calendar/page.tsx` | Admin calendar view |
| `frontend/app/admin/customers/page.tsx` | Customer management page |
| `frontend/app/admin/floor/page.tsx` | Floor plan view |
| `frontend/app/admin/list/page.tsx` | Booking list view |
| `frontend/app/admin/online/page.tsx` | Online bookings view |
| `frontend/app/admin/payments/page.tsx` | Payments management |
| `frontend/app/admin/timetable/page.tsx` | Timetable view |
| `frontend/components/admin/Stub.tsx` | Placeholder component for stub pages |
| `src/routers/chat.py` | Chat API router |
| `src/routers/leads.py` | Leads API router |

### Files replaced with partner's version (Group B)
- `src/main.py` — registers chat and leads routers
- `frontend/app/admin/page.tsx` — richer overview with TiltCard, occupancy chart, upcoming panel, Analytics section
- `frontend/app/admin/layout.tsx` — more complete auth: login-page bypass + token check
- `frontend/app/admin/login/page.tsx` — Apple design system styling
- `frontend/components/admin/Sidebar.tsx` — 7 additional nav links with SVG icons
- `frontend/components/admin/BookingsTable.tsx` — updated styling
- `frontend/components/admin/StatCard.tsx` — updated styling
- `frontend/app/admin/slots/page.tsx` — updated styling
- `frontend/app/admin/guests/page.tsx` — updated styling
- `frontend/app/admin/tables/page.tsx` — restores Add Table modal (partner had it, main repo had removed it)
- `frontend/hooks/useTables.ts` — restores `floor_plan_x`/`floor_plan_y` fields

### Files merged (Group C — partner base + preserved unique features)
| File | Preserved from main repo |
|---|---|
| `src/models/guest.py` | `walk_in = "walk_in"` Channel enum value |
| `frontend/app/admin/bookings/page.tsx` | Walk-in button + `WalkInModal` integration (also fixed JSX bug where modal was outside root element) |

### Files kept unchanged (only in main repo)
- `frontend/components/admin/WalkInModal.tsx` — walk-in booking modal component

## Decisions
- Partner's files were the base for all overlapping changes (user's instruction)
- The JSX bug in `bookings/page.tsx` (WalkInModal rendered outside the return's root `<div>`) was fixed during the merge by wrapping in a React Fragment
- Build artifacts (`.next/`), local env files (`.env`, `.env.local`), and `node_modules` were not touched
