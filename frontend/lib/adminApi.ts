import axios from "axios";

const RESTAURANT_ID = "1194490b-1aa1-4500-87ce-53bd6441baec";

export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
});

adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function adminLogin(username: string, password: string): Promise<string> {
  const params = new URLSearchParams();
  params.set("username", username);
  params.set("password", password);
  params.set("restaurant_id", RESTAURANT_ID);
  const resp = await adminApi.post<{ access_token: string }>("/auth/token", params);
  const token = resp.data.access_token;
  localStorage.setItem("admin_token", token);
  return token;
}

export function adminLogout(): void {
  localStorage.removeItem("admin_token");
}
