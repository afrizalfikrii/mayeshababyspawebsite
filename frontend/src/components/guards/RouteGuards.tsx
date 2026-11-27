import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { getMe } from "@/services/auth.service";
import type { User } from "@/types/api.types";

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("babyspa_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-7 h-7 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  );
}

/**
 * Redirects to /auth if user is not authenticated.
 */
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
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
    return <LoadingScreen />;
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
 * Verifies directly with the server (/api/me) to prevent client-side role tampering.
 * Redirects to /dashboard immediately if the server rejects or role is customer.
 */
export function RequireAdmin() {
  const { isAuthenticated, isLoading, setUser } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isServerAdmin, setIsServerAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyWithServer = async () => {
      const token = localStorage.getItem("babyspa_token");
      if (!token) {
        if (isMounted) {
          setIsServerAdmin(false);
          setIsVerifying(false);
        }
        return;
      }

      try {
        const realUser = await getMe();
        if (isMounted) {
          setUser(realUser);
          setIsServerAdmin(realUser.role === "admin");
          setIsVerifying(false);
        }
      } catch {
        if (isMounted) {
          setIsServerAdmin(false);
          setIsVerifying(false);
        }
      }
    };

    verifyWithServer();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading || isVerifying) {
    return <LoadingScreen />;
  }

  const tokenInStorage = localStorage.getItem("babyspa_token");
  if (!isAuthenticated && !tokenInStorage) return <Navigate to="/auth" replace />;
  if (!isServerAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/**
 * Ensures authenticated user has the 'customer' role.
 * Redirects to /admin if user is admin.
 */
export function RequireCustomer() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const tokenInStorage = localStorage.getItem("babyspa_token");
  const currentUser = user || getStoredUser();

  if (!isAuthenticated && !tokenInStorage) return <Navigate to="/auth" replace />;
  if (currentUser && currentUser.role !== "customer") return <Navigate to="/admin" replace />;

  return <Outlet />;
}
