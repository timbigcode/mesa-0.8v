"use client";
import useSWR from "swr";
import { adminApi } from "@/lib/adminApi";

export interface AdminTable {
  id: string;
  label: string;
  capacity: number;
  location_type: string;
  is_active: boolean;
}

async function fetcher(url: string) {
  const resp = await adminApi.get<AdminTable[]>(url);
  return resp.data;
}

export function useTables() {
  const { data, error, mutate } = useSWR<AdminTable[]>("/tables", fetcher);
  return { tables: data ?? [], loading: !data && !error, error, mutate };
}
