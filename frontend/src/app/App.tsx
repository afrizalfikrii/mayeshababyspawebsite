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
          classNames: {
            toast:
              "!bg-white !border !border-[#E8DFD8] !text-[#3A2622] !rounded-2xl !shadow-md !font-sans !text-sm !px-4 !py-3.5",
            title: "!font-semibold !text-[#3A2622]",
            description: "!text-[#6E5D58] !text-xs",
            closeButton:
              "!bg-[#FAF7F2] !border-[#E8DFD8] !text-[#6E5D58] hover:!text-[#3A2622]",
            success: "!border-l-4 !border-l-[#2F6B45]",
            error: "!border-l-4 !border-l-[#BE346E]",
            warning: "!border-l-4 !border-l-amber-500",
            info: "!border-l-4 !border-l-[#6E5D58]",
          },
        }}
      />
    </AuthProvider>
  );
}