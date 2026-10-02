import apiClient from "@/lib/axios";
import type { ApiResponse, Baby } from "@/types/api.types";

// Ambil daftar bayi milik customer yang login
export const getBabies = async (): Promise<Baby[]> => {
  const res = await apiClient.get<ApiResponse<Baby[]>>("/babies");
  return res.data.data;
};

// Daftarkan profil anak baru
export const createBaby = async (
  payload: Omit<Baby, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Baby> => {
  const res = await apiClient.post<ApiResponse<Baby>>("/babies", payload);
  return res.data.data;
};

// Edit profil anak
export const updateBaby = async (
  id: number,
  payload: Partial<Omit<Baby, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Baby> => {
  const res = await apiClient.put<ApiResponse<Baby>>(`/babies/${id}`, payload);
  return res.data.data;
};

// Hapus profil anak
export const deleteBaby = async (id: number): Promise<void> => {
  await apiClient.delete(`/babies/${id}`);
};
