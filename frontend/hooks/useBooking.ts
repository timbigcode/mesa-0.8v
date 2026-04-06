"use client";
import { useState } from "react";
import { createBooking, cancelBooking } from "@/lib/api";
import type { BookingIn, BookingOut } from "@/lib/types";

export function useBooking() {
  const [booking, setBooking] = useState<BookingOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitBooking(payload: BookingIn) {
    setLoading(true); setError(null);
    try {
      const result = await createBooking(payload);
      setBooking(result);
      return result;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Booking failed. Please try again.";
      setError(msg);
      return null;
    } finally { setLoading(false); }
  }

  async function cancel(bookingId: string) {
    setLoading(true); setError(null);
    try {
      await cancelBooking(bookingId);
      setBooking(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Cancellation failed.";
      setError(msg);
    } finally { setLoading(false); }
  }

  return { booking, loading, error, submitBooking, cancel };
}
