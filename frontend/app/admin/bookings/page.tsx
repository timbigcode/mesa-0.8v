"use client";
import { useState, useEffect } from "react";
import { useBookings } from "@/hooks/useBookings";
import BookingsTable from "@/components/admin/BookingsTable";
import WalkInModal from "@/components/admin/WalkInModal";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
];

export default function BookingsPage() {
  const [date, setDate] = useState("");
  const [showWalkIn, setShowWalkIn] = useState(false);
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
    <>
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-xl font-semibold flex-1" style={{ color: "var(--color-n-900)" }}>Bookings</h1>
          <button
            onClick={() => setShowWalkIn(true)}
            className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-white"
            style={{ background: "var(--color-n-900)" }}
          >
            + Walk-in
          </button>
          <input
            type="text"
            placeholder="Guest name..."
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="input-field w-40"
            style={{ padding: "8px 12px", fontSize: "13px" }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
            style={{ padding: "8px 12px", fontSize: "13px" }}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            style={{ padding: "8px 12px", fontSize: "13px" }}
          />
        </div>
        <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-[13px]" style={{ color: "var(--color-n-400)" }}>
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-n-300)", borderTopColor: "var(--color-n-800)" }} />
              Loading bookings...
            </div>
          ) : (
            <BookingsTable bookings={bookings} onCancelled={() => mutate()} />
          )}
        </div>
      </div>
      {showWalkIn && (
        <WalkInModal
          onClose={() => setShowWalkIn(false)}
          onCreated={() => mutate()}
        />
      )}
    </>
  );
}
