"use client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAdminAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-apple-gray6)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-apple-gray4)", borderTopColor: "#1c1c1e" }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--color-apple-gray6)" }}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
