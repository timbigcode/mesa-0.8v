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
      <h1 className="text-xl font-semibold mb-6" style={{ color: "var(--color-n-900)" }}>Time Slots</h1>
      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[13px]" style={{ color: "var(--color-n-400)" }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-n-300)", borderTopColor: "var(--color-n-800)" }} />
            Loading...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-n-200)" }}>
                {["Day", "Start Time", "Duration", "Status", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-n-400)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--color-n-100)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-n-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--color-n-900)" }}>{dayName(s.day_of_week)}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-n-600)" }}>{s.start_time.slice(0, 5)}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-n-500)" }}>{s.duration_minutes} min</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                      style={{
                        background: s.is_active ? "rgba(22,163,74,0.08)" : "var(--color-n-100)",
                        color: s.is_active ? "var(--color-success)" : "var(--color-n-500)",
                      }}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(s.id, s.is_active)}
                      className="text-[12px] font-medium hover:underline"
                      style={{ color: "var(--color-brand)" }}
                    >
                      {s.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {slots.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-[13px]" style={{ color: "var(--color-n-400)" }}>No slots found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
