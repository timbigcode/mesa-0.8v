"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #ffffff 0%, var(--color-apple-gray6) 50%, #ffffff 100%)" }}
    >
      <NavBar />

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-32">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{ background: "rgba(0,122,255,0.1)", color: "var(--color-apple-blue)" }}
          >
            Now taking reservations
          </span>
          <h1 className="text-6xl font-bold mb-6 text-gray-900" style={{ letterSpacing: "-0.03em" }}>
            A table for<br />every moment.
          </h1>
          <p className="text-xl mb-10 max-w-md mx-auto" style={{ color: "var(--color-apple-gray1)" }}>
            Reserve your spot in seconds. No account needed.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gray-900 text-white text-base font-medium hover:bg-gray-700 transition-all duration-150 active:scale-95"
          >
            Book a table
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { icon: "⚡", title: "Instant confirmation", body: "Your booking is confirmed the moment you submit." },
            { icon: "📱", title: "SMS & WhatsApp", body: "Reminders sent to your phone, your way." },
            { icon: "🔄", title: "Easy cancellation", body: "Cancel anytime up to 2 hours before your visit." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="glass rounded-3xl p-6"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1 text-gray-900">{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--color-apple-gray1)" }}>{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
