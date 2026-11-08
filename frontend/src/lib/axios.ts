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
// Auto-retry GET requests on cold-start network/5xx errors
// Auto-logout on 401 (expired/invalid token)
// Auto-kick on 403 (unauthorized role access attempt)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    // Automatically retry GET requests up to 2 times if backend/TiDB is waking from cold sleep
    if (
      config &&
      config.method === "get" &&
      (!status || status >= 500) &&
      (config.__retryCount ?? 0) < 2
    ) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return apiClient(config);
    }

    if (status === 401 && !window.location.pathname.includes("/auth")) {
      localStorage.removeItem("babyspa_token");
      localStorage.removeItem("babyspa_user");
      window.location.href = "/auth";
    } else if (status === 403) {
      // Role tampering or unauthorized access detected by backend
      try {
        const stored = localStorage.getItem("babyspa_user");
        if (stored) {
          const user = JSON.parse(stored);
          if (user.role === "admin") {
            user.role = "customer";
            localStorage.setItem("babyspa_user", JSON.stringify(user));
          }
        }
      } catch {
        // ignore parse error
      }

      if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/dashboard";
      }
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
