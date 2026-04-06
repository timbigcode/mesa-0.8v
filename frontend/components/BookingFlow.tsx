"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { StepDatePicker } from "./StepDatePicker";
import { StepTablePicker } from "./StepTablePicker";
import { StepGuestDetails } from "./StepGuestDetails";
import { StepConfirm } from "./StepConfirm";
import { useBooking } from "@/hooks/useBooking";
import type { TableSlotOut, SlotOut } from "@/lib/types";

const STEPS = ["Date & Guests", "Table & Time", "Your details", "Confirm"];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

interface GuestDetails {
  name: string;
  phone: string;
  email: string;
  special_requests: string;
}

export function BookingFlow() {
  const router = useRouter();
  const { submitBooking, loading, error } = useBooking();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("");
  const [table, setTable] = useState<TableSlotOut | null>(null);
  const [slot, setSlot] = useState<SlotOut | null>(null);
  const [guest, setGuest] = useState<GuestDetails>({ name: "", phone: "", email: "", special_requests: "" });

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function canAdvance() {
    if (step === 0) return !!date;
    if (step === 1) return !!table && !!slot;
    if (step === 2) return !!guest.name && !!guest.phone;
    return true;
  }

  async function handleConfirm() {
    if (!table || !slot) return;
    const result = await submitBooking({
      table_id: table.table_id,
      slot_date: date,
      slot_start_time: slot.start_time,
      party_size: partySize,
      booked_via: "web",
      guest_name: guest.name,
      guest_phone: guest.phone,
      guest_email: guest.email || undefined,
      special_requests: guest.special_requests || undefined,
    });
    if (result) {
      const suffix = result.notification_sent === false ? "?notif_warn=1" : "";
      router.push(`/confirmation/${result.confirmation_code}${suffix}`);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-16">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 pt-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all"
              style={{
                background: i < step ? "var(--color-apple-green)" : i === step ? "#1c1c1e" : "var(--color-apple-gray5)",
                color: i <= step ? "#fff" : "var(--color-apple-gray2)",
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-0.5 flex-1 rounded transition-all"
                style={{ background: i < step ? "var(--color-apple-green)" : "var(--color-apple-gray5)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card p-6 mb-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">{STEPS[step]}</h2>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <StepDatePicker partySize={partySize} onPartySizeChange={setPartySize} onSelect={setDate} />
            )}
            {step === 1 && (
              <StepTablePicker
                date={date}
                partySize={partySize}
                selectedTable={table}
                selectedSlot={slot}
                onTableSelect={setTable}
                onSlotSelect={setSlot}
              />
            )}
            {step === 2 && (
              <StepGuestDetails details={guest} onChange={setGuest} />
            )}
            {step === 3 && table && slot && (
              <StepConfirm
                date={date}
                partySize={partySize}
                table={table}
                slot={slot}
                guest={guest}
                loading={loading}
                error={error}
                onSubmit={handleConfirm}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => go(step - 1)}
              className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
              style={{ background: "var(--color-apple-gray5)", color: "#1c1c1e" }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => go(step + 1)}
            disabled={!canAdvance()}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ background: canAdvance() ? "#1c1c1e" : "var(--color-apple-gray3)" }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
