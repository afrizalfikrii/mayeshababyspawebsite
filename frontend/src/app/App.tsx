import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes.tsx";
import { AuthProvider } from "@/context/AuthContext";
import "../styles/theme.css";
import "../styles/fonts.css";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          duration: 4000,
          style: {
            background: "#FFFFFF",
            color: "#29211D",
            border: "1px solid #E6DFD8",
            borderRadius: "8px",
            boxShadow: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "14px",
          },
        }}
      />
    </AuthProvider>
  );
}