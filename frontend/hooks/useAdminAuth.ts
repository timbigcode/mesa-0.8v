"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    if (!stored) {
      router.replace("/admin/login");
    } else {
      setToken(stored);
    }
    setLoading(false);
  }, [router]);

  return { token, loading };
}
