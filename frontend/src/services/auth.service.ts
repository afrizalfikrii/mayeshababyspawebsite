import apiClient from "@/lib/axios";
import type { ApiResponse, AuthData, LoginPayload, RegisterPayload, User } from "@/types/api.types";

/**
 * Register a new customer account.
 */
export const register = async (payload: RegisterPayload): Promise<AuthData> => {
  const res = await apiClient.post<ApiResponse<AuthData>>("/register", payload);
  return res.data.data;
};

/**
 * Login with email + password. Returns user + token.
 */
export const login = async (payload: LoginPayload): Promise<AuthData> => {
  const res = await apiClient.post<ApiResponse<AuthData>>("/login", payload);
  return res.data.data;
};

/**
 * Logout — revokes current token on the server.
 */
export const logout = async (): Promise<void> => {
  await apiClient.post("/logout");
};

/**
 * Get currently authenticated user profile.
 */
export const getMe = async (): Promise<User> => {
  const res = await apiClient.get<ApiResponse<User>>("/me");
  return res.data.data;
};
