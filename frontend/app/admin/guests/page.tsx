"use client";
import { useState } from "react";
import useSWR from "swr";
import { adminApi } from "@/lib/adminApi";

interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  visit_count: number;
  preferred_channel: string;
  notes: string | null;
}

async function fetcher(url: string) {
  const resp = await adminApi.get<Guest[]>(url);
  return resp.data;
}

export default function GuestsPage() {
  const [search, setSearch] = useState("");
  const { data: guests = [], isLoading } = useSWR<Guest[]>("/guests", fetcher, { refreshInterval: 30000 });

  const filtered = guests.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Guests</h1>
        <input
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none border bg-white/80 w-64"
          style={{ borderColor: "rgba(209,209,214,0.5)" }}
        />
      </div>
      <div className="glass-card overflow-hidden p-0" style={{ borderRadius: "20px" }}>
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(209,209,214,0.4)" }}>
                {["Name", "Phone", "Email", "Visits", "Channel"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-apple-gray1)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b transition-colors hover:bg-white/40" style={{ borderColor: "rgba(209,209,214,0.3)" }}>
                  <td className="py-3 px-4 font-medium text-gray-900">{g.name}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-apple-gray1)" }}>{g.phone}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-apple-gray1)" }}>{g.email ?? "—"}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{g.visit_count}</td>
                  <td className="py-3 px-4 capitalize" style={{ color: "var(--color-apple-gray1)" }}>{g.preferred_channel}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--color-apple-gray1)" }}>No guests found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
