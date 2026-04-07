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

const inputStyle = {
  borderColor: "rgba(209,209,214,0.5)",
};

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
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex-1">Bookings</h1>
        <button
          onClick={() => setShowWalkIn(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#1c1c1e" }}
        >
          + Walk-in
        </button>
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

    {showWalkIn && (
      <WalkInModal
        onClose={() => setShowWalkIn(false)}
        onCreated={() => mutate()}
      />
    )}
  );
}
