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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
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