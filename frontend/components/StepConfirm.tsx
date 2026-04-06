"use client";
import { format, parseISO } from "date-fns";
import type { TableSlotOut, SlotOut } from "@/lib/types";

interface GuestDetails {
  name: string;
  phone: string;
  email: string;
  special_requests: string;
}

interface Props {
  date: string;
  partySize: number;
  table: TableSlotOut;
  slot: SlotOut;
  guest: GuestDetails;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b last:border-0" style={{ borderColor: "rgba(209,209,214,0.4)" }}>
      <span className="text-sm" style={{ color: "var(--color-apple-gray1)" }}>{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function StepConfirm({ date, partySize, table, slot, guest, loading, error, onSubmit }: Props) {
  const dateLabel = format(parseISO(date), "EEEE, MMMM d, yyyy");
  const timeLabel = slot.start_time.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="glass-card p-0 overflow-hidden" style={{ borderRadius: "20px" }}>
        <div
          className="px-5 py-4"
          style={{ background: "rgba(0,122,255,0.05)", borderBottom: "1px solid rgba(0,122,255,0.1)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-apple-blue)" }}>
            Booking summary
          </p>
        </div>
        <div className="px-5">
          <Row label="Date" value={dateLabel} />
          <Row label="Time" value={timeLabel} />
          <Row label="Table" value={`${table.label} (${table.location_type})`} />
          <Row label="Guests" value={`${partySize} ${partySize === 1 ? "person" : "people"}`} />
          <Row label="Name" value={guest.name} />
          <Row label="Phone" value={guest.phone} />
          {guest.email && <Row label="Email" value={guest.email} />}
          {guest.special_requests && <Row label="Requests" value={guest.special_requests} />}
        </div>
      </div>

      {error && (
        <p className="text-sm text-center px-4 py-3 rounded-xl" style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-apple-red)" }}>
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: loading ? "var(--color-apple-gray3)" : "#1c1c1e" }}
      >
        {loading ? "Confirming reservation…" : "Confirm reservation"}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--color-apple-gray2)" }}>
        By confirming, you agree to our cancellation policy.
      </p>
    </div>
  );
}
