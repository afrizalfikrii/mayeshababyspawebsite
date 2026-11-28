import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Mail, Lock, User as UserIcon, Phone, Loader2, Eye, EyeOff } from "lucide-react";
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
        const loggedUser = await login(payload);
        toast.success("Selamat datang kembali.");
        const destination = loggedUser?.role === "admin" ? "/admin" : "/dashboard";
        navigate(destination, { replace: true });
      } else {
        if (!form.phone_number.trim()) {
          toast.error("Nomor WhatsApp / telepon wajib diisi.");
          return;
        }
        if (form.password !== form.password_confirmation) {
          toast.error("Konfirmasi kata sandi tidak cocok.");
          return;
        }
        const payload: RegisterPayload = {
          name: form.name,
          email: form.email,
          phone_number: form.phone_number.trim(),
          password: form.password,
          password_confirmation: form.password_confirmation,
        };
        const newUser = await register(payload);
        toast.success("Pendaftaran berhasil. Selamat datang di Mayesha Baby Spa.");
        const destination = newUser?.role === "admin" ? "/admin" : "/dashboard";
        navigate(destination, { replace: true });
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
        if (/phone number field is required/i.test(text) || /nomor whatsapp.*wajib diisi/i.test(text)) {
          return "Nomor WhatsApp / telepon wajib diisi.";
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

  const switchMode = (nextLogin?: boolean) => {
    setIsLogin((v) => (typeof nextLogin === "boolean" ? nextLogin : !v));
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setForm({ name: "", email: "", phone_number: "", password: "", password_confirmation: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#FAF7F2]">
      <div className="w-full max-w-5xl bg-white border border-[#E8DFD8] rounded-3xl shadow-sm overflow-hidden grid lg:grid-cols-12">
        {/* Left Editorial Brand Panel (Desktop, Photo-Free) */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#F4EFE8] border-r border-[#E8DFD8] p-8 xl:p-10 flex-col justify-between gap-8">
          <div className="space-y-7">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Mayesha Mom, Kids & Baby Spa Logo"
                className="w-12 h-12 object-contain rounded-full shrink-0"
              />
              <div className="leading-tight">
                <span className="font-editorial italic font-semibold text-2xl text-[#BE346E] tracking-tight block">
                  Mayesha
                </span>
                <span className="text-xs font-semibold text-[#3A2622] tracking-wide block -mt-0.5">
                  Mom, Kids &amp; Baby Spa
                </span>
              </div>
            </Link>

            <div className="space-y-2">
              <p className="font-editorial text-2xl font-semibold text-[#3A2622] leading-snug">
                Perawatan lembut untuk <span className="italic text-[#BE346E]">Si Kecil &amp; Bunda</span>
              </p>
              <p className="text-sm text-[#6E5D58] leading-relaxed">
                Nikmati kemudahan mengatur reservasi dan memantau riwayat perawatan dari Ruang Bunda.
              </p>
            </div>

            <ol className="divide-y divide-[#E8DFD8] border-y border-[#E8DFD8]">
              {[
                {
                  num: "01",
                  title: "Kelola Jadwal & Pembayaran",
                  desc: "Pantau status reservasi, unggah bukti QRIS, atau ubah jadwal dari satu tempat.",
                },
                {
                  num: "02",
                  title: "Profil Si Kecil Tersimpan",
                  desc: "Data nama dan usia anak tersimpan otomatis untuk pemesanan berikutnya.",
                },
                {
                  num: "03",
                  title: "Rekomendasi Sesuai Usia",
                  desc: "Dapatkan pilihan perawatan yang tepat sesuai tahap tumbuh kembang anak.",
                },
              ].map((item) => (
                <li key={item.num} className="py-3.5 flex items-start gap-3.5">
                  <span className="font-editorial text-sm font-semibold text-[#BE346E] tabular-nums pt-0.5 shrink-0">
                    {item.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#3A2622]">{item.title}</p>
                    <p className="text-xs text-[#6E5D58] leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="text-xs text-[#6E5D58] flex items-center justify-between gap-2 pt-2">
            <span className="font-medium text-[#3A2622]">Senin – Minggu · 08.30 – 16.30 WIB</span>
            <span>Tegalgede &amp; Home Care</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#6E5D58] hover:text-[#BE346E] transition-colors py-1"
            >
              <ArrowLeft size={16} />
              Kembali ke Beranda
            </Link>

            <Link to="/" className="flex lg:hidden items-center gap-2">
              <img
                src="/logo.png"
                alt="Mayesha Logo"
                className="w-9 h-9 object-contain rounded-full"
              />
              <span className="font-editorial italic font-semibold text-base text-[#BE346E]">
                Mayesha
              </span>
            </Link>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1.5 rounded-2xl bg-[#F4EFE8] border border-[#E8DFD8] mb-7">
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isLogin
                  ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#E8DFD8]"
                  : "text-[#6E5D58] hover:text-[#3A2622]"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                !isLogin
                  ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#E8DFD8]"
                  : "text-[#6E5D58] hover:text-[#3A2622]"
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#3A2622]">
              {isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}
            </h1>
            <p className="text-[#6E5D58] text-sm mt-1.5">
              {isLogin
                ? "Masuk untuk mengatur jadwal perawatan Si Kecil dan melihat riwayat reservasi."
                : "Lengkapi data berikut untuk membuat akun dan mulai memesan layanan."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#3A2622] mb-1.5">
                  Nama Lengkap Bunda / Ayah
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5D58] z-10 pointer-events-none" size={17} />
                  <input
                    name="name"
                    type="text"
                    placeholder="Contoh: Bunda Meisya"
                    className="input-glass pl-11"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#3A2622] mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5D58] z-10 pointer-events-none" size={17} />
                <input
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="input-glass pl-11"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#3A2622] mb-1.5">
                  Nomor WhatsApp / HP
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5D58] z-10 pointer-events-none" size={17} />
                  <input
                    name="phone_number"
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    className="input-glass pl-11 tabular-nums"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#3A2622] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5D58] z-10 pointer-events-none" size={17} />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 8 karakter"
                  className="input-glass pl-11 pr-11"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 inline-flex items-center justify-center rounded-full text-[#6E5D58] hover:text-[#BE346E] transition-colors cursor-pointer"
                  title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#3A2622] mb-1.5">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5D58] z-10 pointer-events-none" size={17} />
                  <input
                    name="password_confirmation"
                    type={showPasswordConfirmation ? "text" : "password"}
                    placeholder="Ulangi kata sandi"
                    className="input-glass pl-11 pr-11"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 inline-flex items-center justify-center rounded-full text-[#6E5D58] hover:text-[#BE346E] transition-colors cursor-pointer"
                    title={showPasswordConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                    aria-label={showPasswordConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                  >
                    {showPasswordConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
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
          <div className="mt-6 text-center text-sm text-[#6E5D58]">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <button
              type="button"
              onClick={() => switchMode(!isLogin)}
              className="text-[#BE346E] font-semibold hover:underline cursor-pointer"
            >
              {isLogin ? "Daftar di sini" : "Masuk"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}