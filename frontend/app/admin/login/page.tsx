"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/adminApi";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(username, password);
      router.push("/admin");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--color-apple-gray6)" }}
    >
      <div className="w-full max-w-sm glass-card p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-apple-gray1)" }}>
            Sign in to manage your restaurant
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-apple-gray1)" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border bg-white/80 transition-all focus:ring-2"
              style={{ borderColor: "rgba(209,209,214,0.5)" }}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-apple-gray1)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border bg-white/80 transition-all focus:ring-2"
              style={{ borderColor: "rgba(209,209,214,0.5)" }}
              required
            />
          </div>
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-apple-red)" }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-white font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ background: "#1c1c1e" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
