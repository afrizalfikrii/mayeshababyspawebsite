import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/**
 * Axios instance pre-configured for the Baby Spa backend.
 * - Attaches Bearer token from localStorage automatically.
 * - Returns JSON errors in a consistent shape.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false, // token-based (not cookie/session)
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Attach stored token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("babyspa_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────────
// Auto-logout on 401 (expired/invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes("/auth")) {
      localStorage.removeItem("babyspa_token");
      localStorage.removeItem("babyspa_user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * Resolves a storage/image URL dynamically using the configured backend host.
 * Fixes broken image links when accessed from remote devices (e.g. mobile phones).
 */
export function getStorageUrl(url?: string | null): string {
  if (!url) return "";
  const backendBase = API_BASE_URL.replace(/\/api\/?$/, "");

  // If URL contains localhost:8000, replace with current active backend domain
  if (url.includes("localhost:8000") || url.includes("127.0.0.1:8000")) {
    return url.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/, backendBase);
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
}
