import { createBrowserRouter } from "react-router";
import AppShell from "./components/AppShell";
import Home from "./pages/public/Home";
import Auth from "./pages/public/Auth";
import Booking from "./pages/customer/Booking";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BookingDetail from "./pages/customer/BookingDetail";
import PaymentSuccess from "./pages/public/PaymentSuccess";
import {
  RedirectIfAuth,
  RequireAdmin,
  RequireCustomer,
} from "@/components/guards/RouteGuards";

function RootErrorBoundary() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--bg)]">
      <div className="card-surface max-w-md w-full p-8">
        <span className="overline-label block mb-2">MAYESHA BABY SPA</span>
        <h2 className="text-[26px] leading-[34px] font-editorial text-[var(--text)] mb-2">
          Memperbarui Halaman
        </h2>
        <p className="text-[var(--text-muted)] text-[14px] leading-[22px] mb-6">
          Sistem sedang memperbarui sesi Anda. Apabila halaman belum terbuka secara otomatis, silakan gunakan tombol di bawah ini.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          className="btn-primary w-full"
        >
          Buka Akun Saya
        </button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    ErrorBoundary: RootErrorBoundary,
    children: [
      // ── Public ───────────────────────────────────────────────────────────
      { index: true, Component: Home },

      // ── Auth (redirect to dashboard if already logged in) ─────────────
      {
        Component: RedirectIfAuth,
        children: [
          { path: "auth", Component: Auth },
        ],
      },

      // ── Customer-only routes ──────────────────────────────────────────
      {
        Component: RequireCustomer,
        children: [
          { path: "reservasi",                  Component: Booking },
          { path: "dashboard",                  Component: CustomerDashboard },
          { path: "dashboard/reservasi/:id",    Component: BookingDetail },
          { path: "pembayaran-sukses",          Component: PaymentSuccess },
        ],
      },

      // ── Admin-only routes ─────────────────────────────────────────────
      {
        Component: RequireAdmin,
        children: [
          { path: "admin", Component: AdminDashboard },
        ],
      },
    ],
  },
]);