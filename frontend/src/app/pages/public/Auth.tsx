import { useState } from "react";
import { useNavigate } from "react-router";
import { Baby, Mail, Lock, User as UserIcon, Phone, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { LoginPayload, RegisterPayload } from "@/types/api.types";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    password_confirmation: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const payload: LoginPayload = { email: form.email, password: form.password };
        await login(payload);
        toast.success("Selamat datang kembali! 👋");
        // Redirect based on role will happen via the route guard
        // We read user after login — but since state updates async, use navigate
        navigate("/dashboard");
      } else {
        if (form.password !== form.password_confirmation) {
          toast.error("Konfirmasi kata sandi tidak cocok.");
          return;
        }
        const payload: RegisterPayload = {
          name: form.name,
          email: form.email,
          phone_number: form.phone_number || undefined,
          password: form.password,
          password_confirmation: form.password_confirmation,
        };
        await register(payload);
        toast.success("Pendaftaran berhasil! Selamat datang 🎉");
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; data?: Record<string, string[]> } } };
      const msg = err?.response?.data?.message ?? "Terjadi kesalahan, coba lagi.";
      const validationErrors = err?.response?.data?.data;

      const translateErrorMessage = (text: string) => {
        if (/provided credentials are incorrect/i.test(text) || /invalid credentials/i.test(text)) {
          return "Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.";
        }
        if (/email has already been taken/i.test(text)) {
          return "Alamat email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk.";
        }
        if (/password field must be at least/i.test(text)) {
          return "Kata sandi minimal terdiri dari 8 karakter.";
        }
        if (/password confirmation does not match/i.test(text)) {
          return "Konfirmasi kata sandi tidak cocok.";
        }
        if (/email field must be a valid email/i.test(text)) {
          return "Format alamat email tidak valid.";
        }
        return text;
      };

      if (validationErrors && typeof validationErrors === "object") {
        Object.values(validationErrors).flat().forEach((e) => toast.error(translateErrorMessage(e)));
      } else {
        toast.error(translateErrorMessage(msg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin((v) => !v);
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setForm({ name: "", email: "", phone_number: "", password: "", password_confirmation: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1583417657209-d3dd44dc9c09?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzcGElMjBpbnRlcmlvcnxlbnwxfHx8fDE3ODAzNzI0Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />

      <motion.div
        key={isLogin ? "login" : "register"}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel w-full max-w-md p-8 relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img
            src="/logo.png"
            alt="Mayesha Baby Spa Logo"
            className="w-16 h-16 object-cover rounded-full shadow-md"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {isLogin ? "Selamat Datang Kembali!" : "Yuk, Bikin Akun"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isLogin
              ? "Masuk dulu buat atur jadwal si Kecil ya, Bun."
              : "Daftar sebentar buat dapetin akses ke layanan seru Mayesha."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                name="name"
                type="text"
                placeholder="Nama Bunda / Ayah"
                className="input-glass pl-11"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              name="email"
              type="email"
              placeholder="Alamat Email"
              className="input-glass pl-11"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                name="phone_number"
                type="tel"
                placeholder="Nomor Telepon (opsional)"
                className="input-glass pl-11"
                value={form.phone_number}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Kata Sandi"
              className="input-glass pl-11 pr-11"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-pink-500 transition-colors cursor-pointer p-0.5"
              title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                name="password_confirmation"
                type={showPasswordConfirmation ? "text" : "password"}
                placeholder="Konfirmasi Kata Sandi"
                className="input-glass pl-11 pr-11"
                value={form.password_confirmation}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-pink-500 transition-colors cursor-pointer p-0.5"
                title={showPasswordConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                aria-label={showPasswordConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
              >
                {showPasswordConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isLogin ? "Masuk Sekarang" : "Daftar Akun"}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {isLogin ? "Belum punya akun? " : "Udah punya akun? "}
          <button
            type="button"
            onClick={switchMode}
            className="text-pink-500 font-semibold hover:underline"
          >
            {isLogin ? "Daftar di sini" : "Masuk"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}