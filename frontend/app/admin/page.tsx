"use client";
import { useBookings } from "@/hooks/useBookings";
import StatCard from "@/components/admin/StatCard";

export default function AdminOverview() {
  const today = new Date().toISOString().split("T")[0];
  const { bookings, loading } = useBookings(today);

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Overview</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-apple-gray1)" }}>
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-apple-gray1)" }}>
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-apple-gray4)", borderTopColor: "#1c1c1e" }} />
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Today's Bookings" value={bookings.length} icon="📅" />
          <StatCard label="Confirmed" value={confirmed} icon="✅" color="var(--color-apple-green)" />
          <StatCard label="Cancelled" value={cancelled} icon="❌" color="var(--color-apple-red)" />
          <StatCard label="Completed" value={completed} icon="🏁" color="var(--color-apple-gray1)" />
        </div>
      )}
    </div>
  );
}
