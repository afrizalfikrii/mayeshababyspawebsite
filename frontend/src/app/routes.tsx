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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FCF7F9]">
      <div className="glass-panel max-w-md w-full p-8">
        <span className="text-xs font-bold uppercase tracking-widest text-[#BE346E] block mb-2">
          Mayesha Baby Spa
        </span>
        <h2 className="text-xl font-bold text-[#3A2622] mb-2">Sedang Memuat Halaman</h2>
        <p className="text-[#6E5D58] text-sm mb-6 leading-relaxed">
          Sistem sedang memperbarui sesi Anda. Jika halaman belum terbuka otomatis, silakan klik tombol di bawah.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          className="btn-primary w-full cursor-pointer"
        >
          Lanjut ke Dashboard
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