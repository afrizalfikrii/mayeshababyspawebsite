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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold shadow-sm">
        🌸
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Sedang Memuat Halaman</h2>
      <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
        Sistem sedang memperbarui sesi Anda. Jika halaman belum terbuka otomatis, silakan klik tombol di bawah.
      </p>
      <button
        onClick={() => {
          window.location.href = "/dashboard";
        }}
        className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full shadow-md transition-all cursor-pointer"
      >
        Lanjut ke Dashboard
      </button>
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