export interface SlotOut {
  slot_id: string;
  start_time: string;       // "HH:MM:SS"
  duration_minutes: number;
}

export interface TableSlotOut {
  table_id: string;
  label: string;
  capacity: number;
  location_type: "indoor" | "outdoor" | "bar" | "private";
}

export interface BookingIn {
  table_id: string;
  slot_date: string;         // "YYYY-MM-DD"
  slot_start_time: string;   // "HH:MM:SS"
  party_size: number;
  booked_via: string;        // "web"
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  special_requests?: string;
}

export interface BookingOut {
  id: string;
  table_id: string;
  guest_id: string;
  slot_date: string;
  slot_start_time: string;
  duration_minutes: number;
  party_size: number;
  status: "confirmed" | "cancelled" | "no_show" | "completed";
  special_requests: string | null;
  booked_via: string;
  confirmation_code: string;
  created_at: string;
  notification_sent: boolean;
}

export interface GuestOut {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferred_channel: string;
  visit_count: number;
  notes: string | null;
  created_at: string;
}
