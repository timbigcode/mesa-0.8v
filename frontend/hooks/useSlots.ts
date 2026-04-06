"use client";
import useSWR from "swr";
import { adminApi } from "@/lib/adminApi";

export interface AdminSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayName = (d: number) => DAYS[d] ?? String(d);

async function fetcher(url: string) {
  const resp = await adminApi.get<AdminSlot[]>(url);
  return resp.data;
}

export function useSlots() {
  const { data, error, mutate } = useSWR<AdminSlot[]>("/slots", fetcher);
  return { slots: data ?? [], loading: !data && !error, error, mutate };
}
