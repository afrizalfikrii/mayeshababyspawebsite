import apiClient from "@/lib/axios";
import type { ApiResponse, RecommendationResponse, Service, Therapist } from "@/types/api.types";

/**
 * Get all active services (public — no auth required).
 */
export const getServices = async (): Promise<Service[]> => {
  const res = await apiClient.get<ApiResponse<Service[]>>("/services");
  return res.data.data;
};

/**
 * Get all active therapists (authenticated).
 */
export const getTherapists = async (): Promise<Therapist[]> => {
  const res = await apiClient.get<ApiResponse<Therapist[]>>("/therapists");
  return res.data.data;
};

/**
 * Get personalized service recommendations for logged-in customer (CBF).
 * Returns top-N services with similarity_score. is_cold_start = true if no history.
 */
export const getRecommendations = async (topN = 5): Promise<RecommendationResponse> => {
  const res = await apiClient.get<RecommendationResponse>(`/recommendations?top=${topN}`);
  return res.data;
};

// ─── Admin Service CRUD ───────────────────────────────────────────────────────

export const adminGetServices = async (): Promise<Service[]> => {
  const res = await apiClient.get<ApiResponse<Service[]>>("/admin/services");
  return res.data.data;
};

export const adminGetService = async (id: number): Promise<Service> => {
  const res = await apiClient.get<ApiResponse<Service>>(`/admin/services/${id}`);
  return res.data.data;
};

export const adminCreateService = async (
  payload: Omit<Service, "id" | "created_at" | "updated_at">
): Promise<Service> => {
  const res = await apiClient.post<ApiResponse<Service>>("/admin/services", payload);
  return res.data.data;
};

export const adminUpdateService = async (
  id: number,
  payload: Partial<Omit<Service, "id" | "created_at" | "updated_at">>
): Promise<Service> => {
  const res = await apiClient.put<ApiResponse<Service>>(`/admin/services/${id}`, payload);
  return res.data.data;
};

export const adminDeleteService = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/services/${id}`);
};

// ─── Admin Therapist CRUD ─────────────────────────────────────────────────────

export const adminGetTherapists = async (): Promise<Therapist[]> => {
  const res = await apiClient.get<ApiResponse<Therapist[]>>("/admin/therapists");
  return res.data.data;
};

export const adminCreateTherapist = async (
  payload: Omit<Therapist, "id" | "created_at" | "updated_at">
): Promise<Therapist> => {
  const res = await apiClient.post<ApiResponse<Therapist>>("/admin/therapists", payload);
  return res.data.data;
};

export const adminUpdateTherapist = async (
  id: number,
  payload: Partial<Omit<Therapist, "id" | "created_at" | "updated_at">>
): Promise<Therapist> => {
  const res = await apiClient.put<ApiResponse<Therapist>>(`/admin/therapists/${id}`, payload);
  return res.data.data;
};

export const adminDeleteTherapist = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/therapists/${id}`);
};
