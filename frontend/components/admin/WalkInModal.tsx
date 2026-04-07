"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminApi";

interface Table {
  id: string;
  label: string;
  capacity: number;
  location_type: string;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function todayLocal() {
  return new Date().toISOString().split("T")[0];
}

function nowRounded() {
  const d = new Date();
  d.setMinutes(Math.round(d.getMinutes() / 15) * 15, 0, 0);
  return d.toTimeString().slice(0, 5);
}

const inputCls = "w-full px-3 py-2 rounded-xl text-sm outline-none border bg-white/80";
const inputStyle = { borderColor: "rgba(209,209,214,0.5)" };

export default function WalkInModal({ onClose, onCreated }: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [form, setForm] = useState({
    table_id: "",
    slot_date: todayLocal(),
    slot_start_time: nowRounded(),
    party_size: 2,
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    special_requests: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.get<Table[]>("/tables").then((r) => {
      setTables(r.data);
      if (r.data.length > 0) setForm((f) => ({ ...f, table_id: r.data[0].id }));
    });
  }, []);

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guest_name.trim() || !form.guest_phone.trim()) {
      setError("Guest name and phone are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adminApi.post("/bookings", {
        table_id: form.table_id,
        slot_date: form.slot_date,
        slot_start_time: form.slot_start_time + ":00",
        party_size: form.party_size,
        booked_via: "walk_in",
        guest_name: form.guest_name.trim(),
        guest_phone: form.guest_phone.trim(),
        guest_email: form.guest_email.trim() || undefined,
        special_requests: form.special_requests.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to create booking. Table may already be booked at this time.");
    } finally {
      setLoading(false);
    }
  }

  const selectedTable = tables.find((t) => t.id === form.table_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card w-full max-w-md p-6" style={{ borderRadius: "24px" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">New Walk-in Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Table */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Table</label>
            <select
              value={form.table_id}
              onChange={(e) => set("table_id", e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — up to {t.capacity} guests ({t.location_type})
                </option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={form.slot_date}
                onChange={(e) => set("slot_date", e.target.value)}
                className={inputCls}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
              <input
                type="time"
                value={form.slot_start_time}
                onChange={(e) => set("slot_start_time", e.target.value)}
                className={inputCls}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Party size */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Party size {selectedTable && <span className="text-gray-400">(max {selectedTable.capacity})</span>}
            </label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("party_size", n)}
                  className="w-9 h-9 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: form.party_size === n ? "#1c1c1e" : "var(--color-apple-gray5)",
                    color: form.party_size === n ? "#fff" : "#3c3c43",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Guest name + phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Guest name *</label>
              <input
                type="text"
                placeholder="Full name"
                value={form.guest_name}
                onChange={(e) => set("guest_name", e.target.value)}
                className={inputCls}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone *</label>
              <input
                type="tel"
                placeholder="+1 555 000 0000"
                value={form.guest_phone}
                onChange={(e) => set("guest_phone", e.target.value)}
                className={inputCls}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email (optional)</label>
            <input
              type="email"
              placeholder="guest@email.com"
              value={form.guest_email}
              onChange={(e) => set("guest_email", e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Special requests */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input
              type="text"
              placeholder="Allergies, seating preferences…"
              value={form.special_requests}
              onChange={(e) => set("special_requests", e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-sm rounded-xl px-3 py-2" style={{ background: "rgba(255,59,48,0.08)", color: "#c0392b" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-medium"
              style={{ background: "var(--color-apple-gray5)", color: "#1c1c1e" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#1c1c1e" }}
            >
              {loading ? "Saving…" : "Confirm Walk-in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
