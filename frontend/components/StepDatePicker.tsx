"use client";
import { useState } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { motion } from "framer-motion";

interface Props {
  partySize: number;
  onPartySizeChange: (n: number) => void;
  onSelect: (date: string) => void;
}

export function StepDatePicker({ partySize, onPartySizeChange, onSelect }: Props) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const [selected, setSelected] = useState<Date | null>(null);

  function pick(d: Date) {
    setSelected(d);
    onSelect(format(d, "yyyy-MM-dd"));
  }

  return (
    <div className="space-y-6">
      {/* Party size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Party size</label>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              onClick={() => onPartySizeChange(n)}
              className="w-10 h-10 rounded-xl text-sm font-medium transition-all"
              style={{
                background: partySize === n ? "#1c1c1e" : "var(--color-apple-gray5)",
                color: partySize === n ? "#fff" : "#3c3c43",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Date grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select a date</label>
        <div className="grid grid-cols-7 gap-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium py-1" style={{ color: "var(--color-apple-gray2)" }}>
              {d}
            </div>
          ))}
          {/* offset for first day */}
          {Array.from({ length: today.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((d) => {
            const isSelected = selected?.toDateString() === d.toDateString();
            const isToday = d.toDateString() === today.toDateString();
            return (
              <motion.button
                key={d.toISOString()}
                whileTap={{ scale: 0.9 }}
                onClick={() => pick(d)}
                className="aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center"
                style={{
                  background: isSelected ? "#1c1c1e" : isToday ? "rgba(0,122,255,0.1)" : "transparent",
                  color: isSelected ? "#fff" : isToday ? "var(--color-apple-blue)" : "#1c1c1e",
                }}
              >
                {format(d, "d")}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
