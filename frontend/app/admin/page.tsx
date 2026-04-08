"use client";
import { useBookings } from "@/hooks/useBookings";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

function TiltCard({ children, accent }: { children: ReactNode; accent?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-50, 50], [8, -8]), { stiffness: 200, damping: 15 });
  const ry = useSpring(useTransform(x, [-50, 50], [-8, 8]), { stiffness: 200, damping: 15 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
        transformPerspective: 800,
      }}
      className="relative rounded-2xl bg-white p-5 cursor-default"
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: "1px solid var(--color-n-200)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.18)",
        }}
      />
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: accent }}
        />
      )}
      <div style={{ transform: "translateZ(30px)" }} className="relative">
        {children}
      </div>
    </motion.div>
  );
}

function Kpi({
  label,
  value,
  delta,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  delta?: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <TiltCard accent={accent}>
      <div className="flex items-start justify-between mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}15`, color: accent }}
        >
          {icon}
        </div>
        {delta && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-n-100)", color: "var(--color-n-600)" }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="text-[12px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--color-n-500)" }}>
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-n-900)" }}>
        {value}
      </div>
    </TiltCard>
  );
}

export default function AdminOverview() {
  const today = new Date().toISOString().split("T")[0];
  const { bookings, loading } = useBookings(today);

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const covers = bookings.reduce((sum, b) => sum + (b.party_size || 0), 0);

  // Hour buckets 12..23 for occupancy chart
  const hours = Array.from({ length: 12 }, (_, i) => i + 12);
  const buckets = hours.map((h) => ({
    h,
    count: bookings.filter((b) => parseInt(b.slot_start_time.split(":")[0], 10) === h).length,
  }));
  const peak = Math.max(1, ...buckets.map((b) => b.count));

  const upcoming = [...bookings]
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.slot_start_time.localeCompare(b.slot_start_time))
    .slice(0, 6);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-n-900)" }}>
            Overview
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-n-500)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{ background: "var(--color-n-100)", color: "var(--color-n-700)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
          Live · auto-refresh 30s
        </div>
      </motion.div>

      {loading ? (
        <div
          className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--color-n-400)" }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-n-300)", borderTopColor: "var(--color-n-800)" }}
          />
          Loading...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            <Kpi
              label="Today's Bookings"
              value={bookings.length}
              accent="#2563eb"
              icon={
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
                </svg>
              }
            />
            <Kpi
              label="Confirmed"
              value={confirmed}
              accent="#10b981"
              icon={
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <Kpi
              label="Total Covers"
              value={covers}
              accent="#8b5cf6"
              icon={
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            />
            <Kpi
              label="Cancelled"
              value={cancelled}
              accent="#ef4444"
              icon={
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Occupancy chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl bg-white p-6"
              style={{
                border: "1px solid var(--color-n-200)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.18)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-n-900)" }}>
                    Today's occupancy
                  </h3>
                  <p className="text-[12px]" style={{ color: "var(--color-n-500)" }}>
                    Reservations by hour
                  </p>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#2563eb15", color: "#2563eb" }}
                >
                  Peak {peak}
                </span>
              </div>
              <div className="flex items-end gap-2 h-44">
                {buckets.map((b, i) => (
                  <div key={b.h} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(b.count / peak) * 100}%` }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full rounded-t-md min-h-[4px] relative group"
                      style={{
                        background:
                          b.count > 0
                            ? "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)"
                            : "var(--color-n-100)",
                      }}
                    >
                      {b.count > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition" style={{ color: "var(--color-n-700)" }}>
                          {b.count}
                        </span>
                      )}
                    </motion.div>
                    <span className="text-[10px]" style={{ color: "var(--color-n-400)" }}>
                      {b.h}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Upcoming reservations */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="rounded-2xl bg-white p-6"
              style={{
                border: "1px solid var(--color-n-200)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.18)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-n-900)" }}>
                  Upcoming
                </h3>
                <span className="text-[11px]" style={{ color: "var(--color-n-400)" }}>
                  {upcoming.length} of {confirmed}
                </span>
              </div>
              {upcoming.length === 0 ? (
                <div className="text-[13px] py-8 text-center" style={{ color: "var(--color-n-400)" }}>
                  No upcoming reservations
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((b, i) => (
                    <motion.li
                      key={b.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-[var(--color-n-50)] transition"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: "var(--color-n-100)" }}
                      >
                        <span className="text-[11px] font-bold leading-none" style={{ color: "var(--color-n-900)" }}>
                          {b.slot_start_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate" style={{ color: "var(--color-n-900)" }}>
                          {b.confirmation_code}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--color-n-500)" }}>
                          {b.party_size} guests
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: "#10b98115", color: "#059669" }}
                      >
                        ok
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>

          <Analytics bookings={bookings} />
        </>
      )}
    </div>
  );
}

const AVG_TICKET = 38; // estimated avg revenue per cover (USD)

function Analytics({ bookings }: { bookings: AdminBookingLite[] }) {
  // Bucket bookings by meal period using slot_start_time
  const periods = [
    { key: "breakfast", label: "Breakfast", color: "#fb7185", range: [6, 10] },
    { key: "brunch", label: "Brunch", color: "#22c55e", range: [10, 12] },
    { key: "lunch", label: "Lunch", color: "#a855f7", range: [12, 15] },
    { key: "tea", label: "Tea", color: "#3b82f6", range: [15, 18] },
    { key: "dinner", label: "Dinner", color: "#facc15", range: [18, 23] },
  ] as const;

  function hourOf(b: AdminBookingLite) {
    return parseInt(b.slot_start_time.split(":")[0], 10);
  }

  const periodStats = periods.map((p) => {
    const inRange = bookings.filter((b) => {
      const h = hourOf(b);
      return h >= p.range[0] && h < p.range[1];
    });
    const covers = inRange.reduce((s, b) => s + (b.party_size || 0), 0);
    const revenue = covers * AVG_TICKET;
    const avgPerPax = inRange.length ? revenue / Math.max(1, covers) : 0;
    return { ...p, count: inRange.length, covers, revenue, avgPerPax };
  });

  const totalRevenue = periodStats.reduce((s, p) => s + p.revenue, 0);
  const totalCovers = periodStats.reduce((s, p) => s + p.covers, 0);
  const peakRev = Math.max(1, ...periodStats.map((p) => p.revenue));

  return (
    <div className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="text-[12px] font-semibold mb-1" style={{ color: "#7c3aed" }}>OPTIMIZE BUSINESS</div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-n-900)" }}>Make smarter decisions</h2>
        </div>
        <div className="text-[12px]" style={{ color: "var(--color-n-500)" }}>
          Based on {bookings.length} reservations · est. ${AVG_TICKET}/cover
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue by meal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 rounded-2xl bg-white p-6"
          style={{ border: "1px solid var(--color-n-200)", boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.18)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-n-900)" }}>Revenue (USD) by meal</h3>
              <p className="text-[12px]" style={{ color: "var(--color-n-500)" }}>Estimated from confirmed covers today</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#7c3aed15", color: "#7c3aed" }}>
              Total ${totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-end gap-4 h-44 pl-10 relative">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px]" style={{ color: "var(--color-n-400)" }}>
              <span>${Math.round(peakRev).toLocaleString()}</span>
              <span>${Math.round(peakRev * 0.66).toLocaleString()}</span>
              <span>${Math.round(peakRev * 0.33).toLocaleString()}</span>
              <span>$0</span>
            </div>
            {periodStats.map((p, i) => (
              <div key={p.key} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-[10px] font-semibold" style={{ color: "var(--color-n-700)" }}>
                  ${p.revenue.toLocaleString()}
                </div>
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(p.revenue / peakRev) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full rounded-t-md min-h-[4px]"
                  style={{ background: p.color }}
                />
                <span className="text-[10px]" style={{ color: "var(--color-n-500)" }}>{p.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Percentage of total */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl bg-white p-6"
          style={{ border: "1px solid var(--color-n-200)", boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.18)" }}
        >
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-n-900)" }}>% of total revenue</h3>
          <p className="text-[12px] mb-4" style={{ color: "var(--color-n-500)" }}>Share by meal period</p>
          {totalCovers === 0 ? (
            <div className="text-[13px] py-8 text-center" style={{ color: "var(--color-n-400)" }}>No data yet</div>
          ) : (
            <div className="space-y-3">
              {periodStats.map((p, i) => {
                const pct = totalRevenue ? (p.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span style={{ color: "var(--color-n-700)" }}>{p.label}</span>
                      <span className="font-semibold" style={{ color: "var(--color-n-900)" }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-n-100)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ background: p.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--color-n-100)" }}>
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: "var(--color-n-500)" }}>Total covers</span>
              <span className="font-semibold" style={{ color: "var(--color-n-900)" }}>{totalCovers}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

type AdminBookingLite = { slot_start_time: string; party_size: number };

