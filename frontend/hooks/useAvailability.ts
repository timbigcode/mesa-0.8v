"use client";
import { useState } from "react";
import { getAvailableTables, getSlots } from "@/lib/api";
import type { TableSlotOut, SlotOut } from "@/lib/types";

export function useAvailability() {
  const [tables, setTables] = useState<TableSlotOut[]>([]);
  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTables(date: string, slotTime: string, partySize: number) {
    setLoading(true); setError(null);
    try {
      setTables(await getAvailableTables(date, slotTime, partySize));
    } catch {
      setError("Could not load available tables.");
    } finally { setLoading(false); }
  }

  async function fetchSlots(tableId: string, date: string, partySize: number) {
    setLoading(true); setError(null);
    try {
      setSlots(await getSlots(tableId, date, partySize));
    } catch {
      setError("Could not load available slots.");
    } finally { setLoading(false); }
  }

  return { tables, slots, loading, error, fetchTables, fetchSlots };
}
