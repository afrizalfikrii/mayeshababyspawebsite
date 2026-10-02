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
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </AuthProvider>
  );
}