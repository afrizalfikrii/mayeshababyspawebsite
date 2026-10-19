import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types/api.types";

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("babyspa_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/**
 * Redirects to /auth if user is not authenticated.
 */
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasToken = isAuthenticated || !!localStorage.getItem("babyspa_token");
  return hasToken ? <Outlet /> : <Navigate to="/auth" replace />;
}

/**
 * Redirects to /dashboard or /admin if user is already logged in.
 * Use this to wrap /auth page.
 */
export function RedirectIfAuth() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tokenInStorage = localStorage.getItem("babyspa_token");
  const currentUser = user || getStoredUser();

  if (isAuthenticated || tokenInStorage) {
    const target = currentUser?.role === "admin" ? "/admin" : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

/**
 * Ensures authenticated user has the 'admin' role.
 * Redirects to /dashboard otherwise.
 */
export function RequireAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tokenInStorage = localStorage.getItem("babyspa_token");
  const currentUser = user || getStoredUser();

  if (!isAuthenticated && !tokenInStorage) return <Navigate to="/auth" replace />;
  if (currentUser && currentUser.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/**
 * Ensures authenticated user has the 'customer' role.
 * Redirects to /admin if user is admin.
 */
export function RequireCustomer() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tokenInStorage = localStorage.getItem("babyspa_token");
  const currentUser = user || getStoredUser();

  if (!isAuthenticated && !tokenInStorage) return <Navigate to="/auth" replace />;
  if (currentUser && currentUser.role !== "customer") return <Navigate to="/admin" replace />;

  return <Outlet />;
}

