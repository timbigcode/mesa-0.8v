"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { NavBar } from "@/components/NavBar";
import { getBookingByCode, cancelBooking } from "@/lib/api";
import type { BookingOut } from "@/lib/types";

export default function ConfirmationPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const notifWarn = searchParams.get("notif_warn") === "1";

  useEffect(() => {
    getBookingByCode(code)
      .then(setBooking)
      .catch(() => setError("Booking not found. Please check your confirmation code."))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleCancel() {
    if (!booking) return;
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id);
      setCancelled(true);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Cancellation failed. It may be too close to your reservation time.";
      setError(msg);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-apple-gray6)" }}>
      <NavBar />
      {notifWarn && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium"
            style={{ background: "rgba(255,149,0,0.12)", color: "#9a5200" }}
          >
            We had a technical error while sending your confirmation message, but your table is booked.
          </div>
        </div>
      )}
      <div className="max-w-lg mx-auto px-4 py-12">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-gray-900 font-medium mb-2">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 text-sm underline"
              style={{ color: "var(--color-apple-blue)" }}
            >
              Go home
            </button>
          </motion.div>
        )}

        {booking && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Status header */}
            <div
              className="glass-card p-6 text-center"
              style={{ background: cancelled ? "rgba(255,59,48,0.05)" : "rgba(52,199,89,0.06)" }}
            >
              <div className="text-5xl mb-3">{cancelled ? "❌" : "✅"}</div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {cancelled ? "Reservation cancelled" : "You're all set!"}
              </h1>
              <p className="text-sm" style={{ color: "var(--color-apple-gray1)" }}>
                Confirmation code:{" "}
                <span className="font-mono font-semibold text-gray-900">{booking.confirmation_code}</span>
              </p>
            </div>

            {/* Details */}
            {!cancelled && (
              <div className="glass-card p-5 space-y-0">
                {[
                  { label: "Date", value: format(parseISO(booking.slot_date), "EEEE, MMMM d, yyyy") },
                  { label: "Time", value: booking.slot_start_time.slice(0, 5) },
                  { label: "Guests", value: `${booking.party_size} ${booking.party_size === 1 ? "person" : "people"}` },
                  { label: "Status", value: booking.status.charAt(0).toUpperCase() + booking.status.slice(1) },
                  ...(booking.special_requests ? [{ label: "Requests", value: booking.special_requests }] : []),
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-start py-3 border-b last:border-0"
                    style={{ borderColor: "rgba(209,209,214,0.4)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--color-apple-gray1)" }}>{label}</span>
                    <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ background: "var(--color-apple-gray5)", color: "#1c1c1e" }}
              >
                Home
              </button>
              {!cancelled && booking.status === "confirmed" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{ background: "var(--color-apple-red)" }}
                >
                  {cancelling ? "Cancelling…" : "Cancel reservation"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
