import apiClient from "@/lib/axios";
import type {
  ApiResponse,
  CreateReservationPayload,
  Reservation,
  Review,
  SlotAvailability,
} from "@/types/api.types";

// ─── Customer ─────────────────────────────────────────────────────────────────

/**
 * Get current customer's reservations.
 */
export const getMyReservations = async (): Promise<Reservation[]> => {
  const res = await apiClient.get<ApiResponse<Reservation[]>>("/reservations");
  return res.data.data;
};

/**
 * Create a new reservation.
 */
export const createReservation = async (
  payload: CreateReservationPayload
): Promise<Reservation> => {
  const res = await apiClient.post<ApiResponse<Reservation>>("/reservations", payload);
  return res.data.data;
};

/**
 * Upload payment proof (QRIS screenshot).
 * Sends multipart/form-data.
 */
export const uploadPaymentProof = async (
  reservationId: number,
  file: File
): Promise<Reservation> => {
  const formData = new FormData();
  formData.append("payment_proof", file);

  const res = await apiClient.post<ApiResponse<Reservation>>(
    `/reservations/${reservationId}/upload-proof`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data.data;
};

/**
 * Customer: Reschedule active reservation to a new date and start time.
 */
export const customerRescheduleReservation = async (
  reservationId: number,
  payload: { reservation_date: string; start_time: string; notes?: string }
): Promise<Reservation> => {
  const res = await apiClient.post<ApiResponse<Reservation>>(
    `/reservations/${reservationId}/reschedule`,
    payload
  );
  return res.data.data;
};

/**
 * Get slot availability for a given date and service.
 * Used to render dynamic slot buttons (available / almost full / full) in the booking form.
 */
export const getSlotAvailability = async (
  date: string,
  serviceId: number
): Promise<SlotAvailability> => {
  const res = await apiClient.get<ApiResponse<SlotAvailability>>("/slot-availability", {
    params: { date, service_id: serviceId },
  });
  return res.data.data;
};

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * List all reservations (admin). Optional filters: status, date.
 */
export const adminGetReservations = async (filters?: {
  status?: string;
  date?: string;
}): Promise<Reservation[]> => {
  const res = await apiClient.get<ApiResponse<Reservation[]>>(
    "/admin/reservations",
    { params: filters }
  );
  return res.data.data;
};

/**
 * Verify (confirm, cancel, or complete) a reservation by admin.
 */
export const adminVerifyReservation = async (
  reservationId: number,
  action: "confirmed" | "cancelled" | "completed"
): Promise<Reservation> => {
  const res = await apiClient.post<ApiResponse<Reservation>>(
    `/admin/reservations/${reservationId}/verify`,
    { action }
  );
  return res.data.data;
};



/**
 * Admin: Reschedule an existing reservation to a new date and time.
 * Called after admin coordinates the new schedule with the customer (e.g., via WhatsApp).
 */
export const adminRescheduleReservation = async (
  reservationId: number,
  payload: { reservation_date: string; start_time: string; notes?: string }
): Promise<Reservation> => {
  const res = await apiClient.post<ApiResponse<Reservation>>(
    `/admin/reservations/${reservationId}/reschedule`,
    payload
  );
  return res.data.data;
};

/**
 * Fetch admin summary statistics.
 */
export const adminGetStats = async (): Promise<{
  today_bookings: number;
  total_customers: number;
  completed_sessions: number;
  total_revenue: number;
}> => {
  const res = await apiClient.get<ApiResponse<any>>("/admin/stats");
  return res.data.data;
};

// Kirim ulasan/review untuk booking tertentu
export const submitReview = async (
  reservationId: number,
  payload: { rating: number; comment?: string }
): Promise<Review> => {
  const res = await apiClient.post<ApiResponse<Review>>(
    `/reservations/${reservationId}/reviews`,
    payload
  );
  return res.data.data;
};

// Ambil data ulasan terbaru untuk ditaruh di homepage
export const getPublicReviews = async (): Promise<Review[]> => {
  const res = await apiClient.get<ApiResponse<Review[]>>("/reviews");
  return res.data.data;
};
