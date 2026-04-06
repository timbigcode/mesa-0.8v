"use client";
import { useSlots, dayName } from "@/hooks/useSlots";
import { adminApi } from "@/lib/adminApi";

export default function SlotsPage() {
  const { slots, loading, mutate } = useSlots();

  async function toggleActive(id: string, current: boolean) {
    await adminApi.patch(`/slots/${id}`, { is_active: !current });
    mutate();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Time Slots</h1>
      <div className="glass-card overflow-hidden p-0" style={{ borderRadius: "20px" }}>
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(209,209,214,0.4)" }}>
                {["Day", "Start Time", "Duration", "Status", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-apple-gray1)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.id} className="border-b transition-colors hover:bg-white/40" style={{ borderColor: "rgba(209,209,214,0.3)" }}>
                  <td className="py-3 px-4 font-medium text-gray-900">{dayName(s.day_of_week)}</td>
                  <td className="py-3 px-4 text-gray-700">{s.start_time.slice(0, 5)}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-apple-gray1)" }}>{s.duration_minutes} min</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: s.is_active ? "rgba(52,199,89,0.12)" : "rgba(142,142,147,0.12)",
                        color: s.is_active ? "#1a7f37" : "#636366",
                      }}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(s.id, s.is_active)}
                      className="text-xs hover:underline"
                      style={{ color: "var(--color-apple-blue)" }}
                    >
                      {s.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {slots.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>No slots found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
