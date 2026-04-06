import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const CHANNEL_TOKEN = process.env.NEXT_PUBLIC_CHANNEL_TOKEN ?? "";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined"
      ? (localStorage.getItem("token") ?? CHANNEL_TOKEN)
      : CHANNEL_TOKEN;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Availability ---
export async function getAvailableTables(date: string, slotTime: string, partySize: number) {
  const { data } = await api.get<import("./types").TableSlotOut[]>("/availability/tables", {
    params: { date, slot_time: slotTime, party_size: partySize },
  });
  return data;
}

export async function getSlots(tableId: string, date: string, partySize: number) {
  const { data } = await api.get<import("./types").SlotOut[]>("/availability", {
    params: { table_id: tableId, date, party_size: partySize },
  });
  return data;
}

// --- Bookings ---
export async function createBooking(payload: import("./types").BookingIn) {
  const { data } = await api.post<import("./types").BookingOut>("/bookings", payload);
  return data;
}

export async function getBookingByCode(code: string) {
  const { data } = await api.get<import("./types").BookingOut>(`/bookings/code/${code}`);
  return data;
}

export async function cancelBooking(bookingId: string) {
  await api.delete(`/bookings/${bookingId}`);
}
