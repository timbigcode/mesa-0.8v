"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTables, type AdminTable } from "@/hooks/useTables";
import { useBookings, type AdminBooking } from "@/hooks/useBookings";
import { adminApi } from "@/lib/adminApi";

type Shape = "circle" | "square" | "diamond";

const PALETTE = [
  "#84cc16", // lime
  "#3b82f6", // blue
  "#a855f7", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ef4444", // red
  "#22c55e", // green
  "#eab308", // yellow
];

const SHAPES: Shape[] = ["circle", "square", "diamond"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function readMeta(): Record<string, { shape?: Shape; color?: string }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("table_meta") ?? "{}");
  } catch {
    return {};
  }
}
function writeMeta(meta: Record<string, { shape?: Shape; color?: string }>) {
  localStorage.setItem("table_meta", JSON.stringify(meta));
}

function layout(
  tables: AdminTable[],
  overrides: Record<string, { x: number; y: number }>,
  meta: Record<string, { shape?: Shape; color?: string }>,
) {
  const cols = 6;
  return tables.map((t, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const h = hash(t.id);
    const ov = overrides[t.id];
    const m = meta[t.id] ?? {};
    const x = ov?.x ?? t.floor_plan_x ?? 60 + col * 130 + (h % 20);
    const y = ov?.y ?? t.floor_plan_y ?? 60 + row * 130 + ((h >> 4) % 20);
    return {
      ...t,
      x,
      y,
      shape: m.shape ?? SHAPES[h % SHAPES.length],
      color: m.color ?? PALETTE[h % PALETTE.length],
    };
  });
}

function TableShape({
  t,
  selected,
  booked,
  draggable,
  onClick,
  onDragEnd,
}: {
  t: ReturnType<typeof layout>[number];
  selected: boolean;
  booked: boolean;
  draggable: boolean;
  onClick: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const size = 70 + t.capacity * 4;
  const common = {
    width: size,
    height: size,
    background: booked ? t.color : "#e5e7eb",
    color: booked ? "#fff" : "#6b7280",
    boxShadow: selected
      ? `0 0 0 3px var(--color-n-900), 0 12px 30px -8px ${t.color}`
      : `0 6px 16px -8px rgba(15,23,42,0.25)`,
  };
  return (
    <motion.button
      onClick={onClick}
      drag={draggable}
      dragMomentum={false}
      onDragEnd={(_, info) => onDragEnd(t.x + info.offset.x, t.y + info.offset.y)}
      whileHover={{ scale: 1.08, y: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="absolute flex items-center justify-center font-bold text-sm"
      style={{
        left: t.x,
        top: t.y,
        ...common,
        cursor: draggable ? "grab" : "pointer",
        borderRadius: t.shape === "circle" ? "50%" : t.shape === "diamond" ? "8px" : "10px",
        transform: t.shape === "diamond" ? "rotate(45deg)" : undefined,
      }}
    >
      <span style={{ transform: t.shape === "diamond" ? "rotate(-45deg)" : undefined }}>
        {t.label}
      </span>
    </motion.button>
  );
}

export default function FloorPage() {
  const today = new Date().toISOString().split("T")[0];
  const { tables, loading: tLoad, mutate: mutateTables } = useTables();
  const { bookings, loading: bLoad } = useBookings(today);
  const [selected, setSelected] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [newTable, setNewTable] = useState<{
    label: string;
    capacity: number;
    location_type: string;
    shape: Shape;
    color: string;
  }>({ label: "", capacity: 2, location_type: "indoor", shape: "circle", color: PALETTE[0] });
  const [meta, setMeta] = useState<Record<string, { shape?: Shape; color?: string }>>({});

  // Load meta on mount
  useMemo(() => {
    setMeta(readMeta());
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddErr(null);
    try {
      const { label, capacity, location_type } = newTable;
      const resp = await adminApi.post("/tables", { label, capacity, location_type });
      const id = resp.data?.id;
      if (id) {
        await adminApi.patch(`/tables/${id}`, { floor_plan_x: 80, floor_plan_y: 80 });
        const next = { ...meta, [id]: { shape: newTable.shape, color: newTable.color } };
        setMeta(next);
        writeMeta(next);
      }
      setAddOpen(false);
      setNewTable({ label: "", capacity: 2, location_type: "indoor", shape: "circle", color: PALETTE[0] });
      mutateTables();
    } catch (e: any) {
      setAddErr(e?.response?.data?.detail ?? "Failed to add table");
    } finally {
      setAdding(false);
    }
  }

  const placed = useMemo(() => layout(tables, overrides, meta), [tables, overrides, meta]);

  function handleDragEnd(id: string, x: number, y: number) {
    setOverrides((o) => ({ ...o, [id]: { x, y } }));
    adminApi.patch(`/tables/${id}`, { floor_plan_x: x, floor_plan_y: y }).catch(() => {});
  }
  const bookedIds = new Set(bookings.filter((b) => b.status === "confirmed").map((b) => b.table_id));

  const sortedBookings = [...bookings].sort((a, b) => a.slot_start_time.localeCompare(b.slot_start_time));
  const filtered: AdminBooking[] = selected
    ? sortedBookings.filter((b) => b.table_id === selected)
    : sortedBookings;

  return (
    <div className="-m-8 min-h-screen flex flex-col" style={{ background: "var(--color-n-50)" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 bg-white"
        style={{ borderBottom: "1px solid var(--color-n-200)" }}
      >
        <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--color-n-900)" }}>
          <span className="font-semibold">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", weekday: "short" })}</span>
          <button className="px-2.5 py-1 rounded text-[11px] font-semibold text-white" style={{ background: "var(--color-n-900)" }}>Tdy</button>
          <button className="px-2.5 py-1 rounded text-[11px]" style={{ background: "var(--color-n-100)", color: "var(--color-n-600)" }}>Tmr</button>
        </div>
        <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--color-n-500)" }}>
          <span>👥 {bookings.reduce((s, b) => s + b.party_size, 0)}</span>
          <span>🍽 {bookings.length}</span>
          <span>✅ {bookings.filter((b) => b.status === "confirmed").length}</span>
          <button
            onClick={() => setAddOpen(true)}
            className="px-2.5 py-1 rounded text-[11px] font-semibold ml-2"
            style={{ background: "var(--color-n-100)", color: "var(--color-n-700)" }}
          >
            + Add table
          </button>
          <button
            onClick={() => setEditMode((e) => !e)}
            className="px-2.5 py-1 rounded text-[11px] font-semibold text-white"
            style={{
              background: editMode ? "var(--color-n-900)" : "var(--color-n-100)",
              color: editMode ? "#fff" : "var(--color-n-700)",
            }}
          >
            {editMode ? "Done" : "Edit layout"}
          </button>
        </div>
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.4)" }}
          onClick={() => setAddOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAdd}
            className="rounded-2xl p-6 w-full max-w-sm bg-white"
            style={{ border: "1px solid var(--color-n-200)", boxShadow: "0 20px 60px -10px rgba(15,23,42,0.25)" }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-n-900)" }}>New table</h2>

            <label className="block text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--color-n-500)" }}>Label</label>
            <input
              required
              value={newTable.label}
              onChange={(e) => setNewTable({ ...newTable, label: e.target.value })}
              placeholder="e.g. T1"
              className="w-full px-3 py-2 rounded-lg text-[13px] mb-3"
              style={{ border: "1px solid var(--color-n-200)" }}
            />

            <label className="block text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--color-n-500)" }}>Capacity</label>
            <input
              required
              type="number"
              min={1}
              max={20}
              value={newTable.capacity}
              onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-lg text-[13px] mb-3"
              style={{ border: "1px solid var(--color-n-200)" }}
            />

            <label className="block text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--color-n-500)" }}>Shape</label>
            <div className="flex gap-2 mb-3">
              {SHAPES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setNewTable({ ...newTable, shape: s })}
                  className="flex-1 py-2 rounded-lg text-[11px] capitalize"
                  style={{
                    background: newTable.shape === s ? "var(--color-n-900)" : "#fff",
                    border: "1px solid var(--color-n-200)",
                    color: newTable.shape === s ? "#fff" : "var(--color-n-700)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="block text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--color-n-500)" }}>Color</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewTable({ ...newTable, color: c })}
                  className="w-7 h-7 rounded-full"
                  style={{
                    background: c,
                    boxShadow: newTable.color === c ? "0 0 0 2px #fff, 0 0 0 4px var(--color-n-900)" : "none",
                  }}
                />
              ))}
            </div>

            <label className="block text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--color-n-500)" }}>Location</label>
            <select
              value={newTable.location_type}
              onChange={(e) => setNewTable({ ...newTable, location_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-[13px] mb-4 capitalize"
              style={{ border: "1px solid var(--color-n-200)" }}
            >
              {["indoor", "outdoor", "bar", "private"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {addErr && <div className="text-[12px] text-red-600 mb-3">{addErr}</div>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium"
                style={{ border: "1px solid var(--color-n-200)", color: "var(--color-n-700)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: "var(--color-n-900)", opacity: adding ? 0.5 : 1 }}
              >
                {adding ? "Saving..." : "Add to floor"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Floor canvas */}
        <div className="flex-1 relative overflow-auto" style={{ background: "var(--color-n-50)" }}>
          {/* Floor tabs */}
          <div className="sticky top-0 z-10 flex gap-1 px-4 py-2 bg-white" style={{ borderBottom: "1px solid var(--color-n-200)" }}>
            {["Main Floor", "2nd Floor", "Lounge"].map((f, i) => (
              <button
                key={f}
                className="px-3 py-1.5 rounded text-[11px] font-medium"
                style={{
                  background: i === 0 ? "var(--color-n-100)" : "transparent",
                  color: i === 0 ? "var(--color-n-900)" : "var(--color-n-500)",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Grid background */}
          <div
            className="relative"
            style={{
              minHeight: 700,
              minWidth: 900,
              backgroundImage: "radial-gradient(var(--color-n-200) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {tLoad ? (
              <div className="p-8" style={{ color: "var(--color-n-400)" }}>Loading floor...</div>
            ) : (
              placed.map((t) => (
                <TableShape
                  key={t.id}
                  t={t}
                  selected={selected === t.id}
                  booked={bookedIds.has(t.id)}
                  draggable={editMode}
                  onClick={() => !editMode && setSelected(selected === t.id ? null : t.id)}
                  onDragEnd={(x, y) => handleDragEnd(t.id, x, y)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right reservations panel */}
        <aside
          className="w-80 flex flex-col bg-white"
          style={{ borderLeft: "1px solid var(--color-n-200)" }}
        >
          <div className="flex" style={{ borderBottom: "1px solid var(--color-n-200)" }}>
            <div className="flex-1 text-center py-3 text-[12px] font-semibold" style={{ color: "var(--color-n-900)", borderBottom: "2px solid var(--color-n-900)" }}>
              Reservations
            </div>
            <div className="flex-1 text-center py-3 text-[12px]" style={{ color: "var(--color-n-400)" }}>Waitlist</div>
          </div>

          <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-n-200)" }}>
            <input
              placeholder="Search by name, party size, time..."
              className="w-full text-[12px] px-2 py-1.5 rounded"
              style={{ background: "var(--color-n-50)", border: "1px solid var(--color-n-200)" }}
            />
          </div>

          <div className="flex-1 overflow-auto">
            {bLoad ? (
              <div className="text-[12px] p-4" style={{ color: "var(--color-n-400)" }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-[12px] p-4" style={{ color: "var(--color-n-400)" }}>No reservations</div>
            ) : (
              filtered.map((b) => {
                const t = placed.find((x) => x.id === b.table_id);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelected(b.table_id)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer text-[12px] hover:bg-[var(--color-n-50)]"
                    style={{ borderBottom: "1px solid var(--color-n-100)", color: "var(--color-n-700)" }}
                  >
                    <span className="w-10" style={{ color: "var(--color-n-500)" }}>{b.slot_start_time.slice(0, 5)}</span>
                    <span className="w-6 text-center">👤{b.party_size}</span>
                    <span
                      className="w-7 text-center text-[11px] font-bold rounded px-1.5 py-0.5 text-white"
                      style={{ background: t?.color ?? "var(--color-n-300)" }}
                    >
                      {t?.label ?? "—"}
                    </span>
                    <span className="flex-1 truncate">{b.confirmation_code}</span>
                  </motion.div>
                );
              })
            )}
          </div>
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="text-[11px] py-2"
              style={{ color: "var(--color-n-500)", borderTop: "1px solid var(--color-n-200)" }}
            >
              Clear filter
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
