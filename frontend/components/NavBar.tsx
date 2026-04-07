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
        <nav className="flex items-center">
          <Link
            href="/admin"
            className="text-xs transition-colors"
            style={{ color: "var(--color-apple-gray3)" }}
          >
            Staff
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
