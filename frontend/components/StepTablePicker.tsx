"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAvailability } from "@/hooks/useAvailability";
import type { TableSlotOut, SlotOut } from "@/lib/types";

interface Props {
  date: string;
  partySize: number;
  selectedTable: TableSlotOut | null;
  selectedSlot: SlotOut | null;
  onTableSelect: (t: TableSlotOut) => void;
  onSlotSelect: (s: SlotOut) => void;
}

const LOCATION_ICONS: Record<string, string> = {
  indoor: "🏠", outdoor: "🌿", bar: "🍸", private: "🔒",
};

export function StepTablePicker({
  date, partySize, selectedTable, selectedSlot, onTableSelect, onSlotSelect,
}: Props) {
  const { tables, slots, loading, error, fetchTables, fetchSlots } = useAvailability();

  // Load available tables for default time "19:00:00"
  useEffect(() => {
    if (date) fetchTables(date, "19:00:00", partySize);
  }, [date, partySize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedTable) fetchSlots(selectedTable.table_id, date, partySize);
  }, [selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center py-8 text-sm" style={{ color: "var(--color-apple-red)" }}>{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Tables */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Choose a table</label>
        {tables.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--color-apple-gray1)" }}>
            No tables available for this date. Try another day.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tables.map((t) => {
              const isSelected = selectedTable?.table_id === t.table_id;
              return (
                <motion.button
                  key={t.table_id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onTableSelect(t)}
                  className="p-4 rounded-2xl text-left transition-all border"
                  style={{
                    background: isSelected ? "#1c1c1e" : "rgba(255,255,255,0.8)",
                    borderColor: isSelected ? "#1c1c1e" : "rgba(209,209,214,0.5)",
                    color: isSelected ? "#fff" : "#1c1c1e",
                  }}
                >
                  <div className="text-xl mb-1">{LOCATION_ICONS[t.location_type] ?? "🪑"}</div>
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">Up to {t.capacity} guests · {t.location_type}</div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Time slots */}
      {selectedTable && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Choose a time</label>
          {slots.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-apple-gray1)" }}>No slots available for this table.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => {
                const isSelected = selectedSlot?.slot_id === s.slot_id;
                const time = s.start_time.slice(0, 5);
                return (
                  <motion.button
                    key={s.slot_id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSlotSelect(s)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isSelected ? "var(--color-apple-blue)" : "rgba(255,255,255,0.8)",
                      color: isSelected ? "#fff" : "#1c1c1e",
                      border: `1px solid ${isSelected ? "var(--color-apple-blue)" : "rgba(209,209,214,0.5)"}`,
                    }}
                  >
                    {time}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
