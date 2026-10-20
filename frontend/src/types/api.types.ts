// ─── User ─────────────────────────────────────────────────────────────────────
export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  user_name?: string;
  service_name?: string;
  created_at?: string;
}

export interface Baby {
  id: number;
  user_id: number;
  name: string;
  birth_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  address: string | null;
  role: "admin" | "customer";
  created_at: string;
}

// ─── Therapist ────────────────────────────────────────────────────────────────
export interface Therapist {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export type ServiceCategory = 'baby_and_kids' | 'baby_kids_treatment' | 'mom_treatment';

export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  // CBF fields
  category: ServiceCategory | null;
  age_min_months: number | null;
  age_max_months: number | null;
  similarity_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationResponse {
  success: boolean;
  message: string;
  is_cold_start: boolean;
  /** 'age_based' = best seller sesuai usia bayi, 'general' = best seller umum, null = hasil CBF */
  cold_start_type: "age_based" | "general" | null;
  data: Service[];
}

// ─── Reservation ──────────────────────────────────────────────────────────────
export type ReservationStatus =
  | "pending"
  | "waiting_verification"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Reservation {
  id: number;
  booking_code: string;
  reservation_date: string; // "YYYY-MM-DD"
  start_time: string;       // "HH:MM:SS"
  end_time: string;
  total_price: number;
  status: ReservationStatus;
  payment_proof_url: string | null;
  expires_at: string | null;
  baby_name: string;
  baby_age: number;
  notes: string | null;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  // Reschedule flag
  is_rescheduled?: boolean;
  // Relations
  user?: User;
  service?: Service;
  therapist_id?: number | null;
  therapist?: { id: number; name: string } | null;
  review?: Review | null;
  baby_id?: number | null;
  baby?: Baby | null;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthData {
  user: User;
  token: string;
}

// ─── Request Payloads ─────────────────────────────────────────────────────────
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone_number: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateReservationPayload {
  service_id: number;
  reservation_date: string; // "YYYY-MM-DD"
  start_time: string;       // "HH:MM"
  baby_name?: string;
  baby_age?: number;
  notes?: string;
  therapist_id?: number;
  baby_id?: number;
  delivery_address?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone_number?: string | null;
  address?: string | null;
}

// ─── Slot Availability ───────────────────────────────────────────────────────
export interface SlotInfo {
  available: number;
  booked: number;
  is_full: boolean;
}

export interface SlotAvailability {
  date: string;
  total_capacity: number;
  slots: Record<string, SlotInfo>;
}


