"use client";
import useSWR from "swr";
import { adminApi } from "@/lib/adminApi";

export interface AdminBooking {
  id: string;
  slot_date: string;
  slot_start_time: string;
  party_size: number;
  status: string;
  confirmation_code: string;
  guest_id: string;
  table_id: string;
  special_requests: string | null;
}

async function fetcher(url: string) {
  const resp = await adminApi.get<AdminBooking[]>(url);
  return resp.data;
}

export function useBookings(date?: string, status?: string, guestName?: string) {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (status) params.append("status", status);
  if (guestName) params.append("guest_name", guestName);
  const query = params.toString();
  const url = query ? `/bookings?${query}` : "/bookings";
  const { data, error, mutate } = useSWR<AdminBooking[]>(url, fetcher, { refreshInterval: 30000 });
  return { bookings: data ?? [], loading: !data && !error, error, mutate };
}
