"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export function NavBar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 glass border-b border-gray-200/50"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">
          Reserve
        </Link>
        <nav className="flex items-center gap-6 text-sm" style={{ color: "var(--color-apple-gray1)" }}>
          <Link href="/book" className="hover:text-gray-900 transition-colors">
            Book a table
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
          >
            Admin
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
