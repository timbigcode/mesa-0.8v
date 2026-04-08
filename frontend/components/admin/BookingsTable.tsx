"use client";
import { AdminBooking } from "@/hooks/useBookings";
import { adminApi } from "@/lib/adminApi";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  confirmed: { bg: "rgba(22,163,74,0.08)",  color: "var(--color-success)" },
  cancelled: { bg: "rgba(220,38,38,0.06)",  color: "var(--color-danger)" },
  completed: { bg: "var(--color-n-100)",     color: "var(--color-n-500)" },
  no_show:   { bg: "rgba(234,179,8,0.08)",  color: "var(--color-warning)" },
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
          <tr style={{ borderBottom: "1px solid var(--color-n-200)" }}>
            {["Code", "Date", "Time", "Guests", "Status", ""].map((h) => (
              <th
                key={h}
                className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-n-400)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const s = STATUS_STYLE[b.status] ?? STATUS_STYLE.completed;
            return (
              <tr
                key={b.id}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--color-n-100)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-n-50)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td className="py-3 px-4 font-mono text-[12px] font-semibold" style={{ color: "var(--color-brand)" }}>{b.confirmation_code}</td>
                <td className="py-3 px-4" style={{ color: "var(--color-n-600)" }}>{b.slot_date}</td>
                <td className="py-3 px-4" style={{ color: "var(--color-n-600)" }}>{b.slot_start_time.slice(0, 5)}</td>
                <td className="py-3 px-4" style={{ color: "var(--color-n-600)" }}>{b.party_size}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: s.bg, color: s.color }}>
                    {b.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="text-[12px] font-medium hover:underline"
                      style={{ color: "var(--color-danger)" }}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-[13px]" style={{ color: "var(--color-n-400)" }}>
                No bookings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
