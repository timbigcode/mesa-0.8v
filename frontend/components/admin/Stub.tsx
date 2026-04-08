"use client";
import { motion } from "framer-motion";

export default function Stub({ title, desc }: { title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--color-n-900)" }}>{title}</h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--color-n-500)" }}>{desc}</p>

      <div
        className="rounded-2xl bg-white p-12 text-center"
        style={{
          border: "1px dashed var(--color-n-200)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.18)",
        }}
      >
        <div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--color-n-100)", color: "var(--color-n-600)" }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--color-n-900)" }}>Coming soon</h2>
        <p className="text-[13px] max-w-xs mx-auto" style={{ color: "var(--color-n-500)" }}>
          This area is reserved for {title.toLowerCase()}. Tell me to build it next.
        </p>
      </div>
    </motion.div>
  );
}
