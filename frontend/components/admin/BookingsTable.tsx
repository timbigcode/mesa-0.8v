"use client";
import { AdminBooking } from "@/hooks/useBookings";
import { adminApi } from "@/lib/adminApi";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  confirmed: { bg: "rgba(52,199,89,0.12)",  color: "#1a7f37" },
  cancelled: { bg: "rgba(255,59,48,0.10)",  color: "#c0392b" },
  completed: { bg: "rgba(142,142,147,0.12)", color: "#636366" },
  no_show:   { bg: "rgba(255,149,0,0.12)",  color: "#9a5200" },
};

interface Props {
  bookings: AdminBooking[];
  onCancelled: () => void;
}

export default function BookingsTable({ bookings, onCancelled }: Props) {
  async function handleCancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    await adminApi.delete(`/bookings/${id}`);
    onCancelled();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "rgba(209,209,214,0.4)" }}>
            {["Code", "Date", "Time", "Guests", "Status", ""].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-apple-gray1)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const s = STATUS_STYLE[b.status] ?? STATUS_STYLE.completed;
            return (
              <tr key={b.id} className="border-b transition-colors hover:bg-white/40" style={{ borderColor: "rgba(209,209,214,0.3)" }}>
                <td className="py-3 px-4 font-mono text-xs font-semibold" style={{ color: "var(--color-apple-blue)" }}>{b.confirmation_code}</td>
                <td className="py-3 px-4 text-gray-700">{b.slot_date}</td>
                <td className="py-3 px-4 text-gray-700">{b.slot_start_time.slice(0, 5)}</td>
                <td className="py-3 px-4 text-gray-700">{b.party_size}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
                    {b.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {b.status === "confirmed" && (
                    <button onClick={() => handleCancel(b.id)} className="text-xs hover:underline" style={{ color: "var(--color-apple-red)" }}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>
                No bookings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
