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
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-n-900)" }}>Guests</h1>
        <input
          type="search"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-64"
          style={{ padding: "8px 12px", fontSize: "13px" }}
        />
      </div>
      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[13px]" style={{ color: "var(--color-n-400)" }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-n-300)", borderTopColor: "var(--color-n-800)" }} />
            Loading...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-n-200)" }}>
                {["Name", "Phone", "Email", "Visits", "Channel"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-n-400)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr
                  key={g.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--color-n-100)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-n-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--color-n-900)" }}>{g.name}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-n-500)" }}>{g.phone}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-n-500)" }}>{g.email ?? "—"}</td>
                  <td className="py-3 px-4 font-semibold" style={{ color: "var(--color-n-900)" }}>{g.visit_count}</td>
                  <td className="py-3 px-4 capitalize" style={{ color: "var(--color-n-500)" }}>{g.preferred_channel}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-[13px]" style={{ color: "var(--color-n-400)" }}>No guests found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
