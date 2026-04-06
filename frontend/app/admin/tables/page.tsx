"use client";
import { useTables } from "@/hooks/useTables";
import { adminApi } from "@/lib/adminApi";

export default function TablesPage() {
  const { tables, loading, mutate } = useTables();

  async function toggleActive(id: string, current: boolean) {
    await adminApi.patch(`/tables/${id}`, { is_active: !current });
    mutate();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tables</h1>
      <div className="glass-card overflow-hidden p-0" style={{ borderRadius: "20px" }}>
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(209,209,214,0.4)" }}>
                {["Label", "Capacity", "Location", "Status", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-apple-gray1)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id} className="border-b transition-colors hover:bg-white/40" style={{ borderColor: "rgba(209,209,214,0.3)" }}>
                  <td className="py-3 px-4 font-medium text-gray-900">{t.label}</td>
                  <td className="py-3 px-4 text-gray-700">{t.capacity}</td>
                  <td className="py-3 px-4 capitalize" style={{ color: "var(--color-apple-gray1)" }}>{t.location_type}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: t.is_active ? "rgba(52,199,89,0.12)" : "rgba(142,142,147,0.12)",
                        color: t.is_active ? "#1a7f37" : "#636366",
                      }}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      className="text-xs hover:underline"
                      style={{ color: "var(--color-apple-blue)" }}
                    >
                      {t.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {tables.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>No tables found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
