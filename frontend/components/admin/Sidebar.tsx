"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "@/lib/adminApi";

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/bookings", label: "Bookings", icon: "📅" },
  { href: "/admin/guests", label: "Guests", icon: "👥" },
  { href: "/admin/tables", label: "Tables", icon: "🪑" },
  { href: "/admin/slots", label: "Time Slots", icon: "⏰" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    adminLogout();
    router.push("/admin/login");
  }

  return (
    <aside
      className="w-56 min-h-screen flex flex-col py-8 px-4 border-r"
      style={{
        background: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(209,209,214,0.4)",
      }}
    >
      <div className="mb-8 px-2">
        <div className="text-2xl mb-1">🍽️</div>
        <h2 className="text-base font-semibold text-gray-900">Restaurant</h2>
        <p className="text-xs" style={{ color: "var(--color-apple-gray1)" }}>Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: active ? "#1c1c1e" : "transparent",
                color: active ? "#fff" : "#3c3c43",
                fontWeight: active ? 500 : 400,
              }}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 mt-4">
        <Link
          href="/book"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full"
          style={{ color: "var(--color-apple-blue)" }}
        >
          <span>←</span> Book a table
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
          style={{ color: "var(--color-apple-red)" }}
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  );
}
