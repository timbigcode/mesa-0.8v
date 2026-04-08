"use client";
import { useState } from "react";
import { useTables } from "@/hooks/useTables";
import { adminApi } from "@/lib/adminApi";

const LOCATIONS = ["indoor", "outdoor", "bar", "private"];

export default function TablesPage() {
  const { tables, loading, mutate } = useTables();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", capacity: 2, location_type: "indoor" });

  async function toggleActive(id: string, current: boolean) {
    await adminApi.patch(`/tables/${id}`, { is_active: !current });
    mutate();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      await adminApi.post("/tables", form);
      setOpen(false);
      setForm({ label: "", capacity: 2, location_type: "indoor" });
      mutate();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Failed to create table");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-n-900)" }}>Tables</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-white"
          style={{ background: "var(--color-n-900)" }}
        >
          + Add table
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.5)" }}
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: "0 20px 60px -10px rgba(0,0,0,0.3)" }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-n-900)" }}>New table</h2>

            <label className="block text-[12px] font-medium mb-1" style={{ color: "var(--color-n-600)" }}>Label</label>
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. T1"
              className="w-full px-3 py-2 rounded-lg text-[13px] mb-3"
              style={{ border: "1px solid var(--color-n-200)" }}
            />

            <label className="block text-[12px] font-medium mb-1" style={{ color: "var(--color-n-600)" }}>Capacity</label>
            <input
              required
              type="number"
              min={1}
              max={20}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-lg text-[13px] mb-3"
              style={{ border: "1px solid var(--color-n-200)" }}
            />

            <label className="block text-[12px] font-medium mb-1" style={{ color: "var(--color-n-600)" }}>Location</label>
            <select
              value={form.location_type}
              onChange={(e) => setForm({ ...form, location_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-[13px] mb-4 capitalize"
              style={{ border: "1px solid var(--color-n-200)" }}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {err && <div className="text-[12px] text-red-600 mb-3">{err}</div>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium"
                style={{ border: "1px solid var(--color-n-200)", color: "var(--color-n-700)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white"
                style={{ background: "var(--color-n-900)", opacity: saving ? 0.5 : 1 }}
              >
                {saving ? "Saving..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

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
                {["Label", "Capacity", "Location", "Status", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-n-400)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr
                  key={t.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--color-n-100)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-n-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--color-n-900)" }}>{t.label}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-n-600)" }}>{t.capacity}</td>
                  <td className="py-3 px-4 capitalize" style={{ color: "var(--color-n-500)" }}>{t.location_type}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                      style={{
                        background: t.is_active ? "rgba(22,163,74,0.08)" : "var(--color-n-100)",
                        color: t.is_active ? "var(--color-success)" : "var(--color-n-500)",
                      }}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      className="text-[12px] font-medium hover:underline"
                      style={{ color: "var(--color-brand)" }}
                    >
                      {t.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {tables.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-[13px]" style={{ color: "var(--color-n-400)" }}>No tables found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
