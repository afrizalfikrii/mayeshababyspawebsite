import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { LoginPayload, RegisterPayload } from "@/types/api.types";
import BrandLogo from "@/app/components/BrandLogo";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    password_confirmation: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setFieldErrors({});
    setFormError(null);
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
          const msg = "Nomor WhatsApp / telepon wajib diisi.";
          setFieldErrors({ phone_number: msg });
          toast.error(msg);
          return;
        }
        if (form.password !== form.password_confirmation) {
          const msg = "Konfirmasi kata sandi tidak cocok.";
          setFieldErrors({ password_confirmation: msg });
          toast.error(msg);
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
        toast.success("Pendaftaran akun berhasil.");
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
        const nextFieldErrors: Record<string, string> = {};
        Object.entries(validationErrors).forEach(([field, messages]) => {
          const translated = translateErrorMessage(messages[0] ?? msg);
          nextFieldErrors[field] = translated;
          messages.forEach((m) => toast.error(translateErrorMessage(m)));
        });
        setFieldErrors(nextFieldErrors);
      } else {
        const translated = translateErrorMessage(msg);
        setFormError(translated);
        toast.error(translated);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin((v) => !v);
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setFieldErrors({});
    setFormError(null);
    setForm({ name: "", email: "", phone_number: "", password: "", password_confirmation: "" });
  };

  const inputClass = (hasError?: boolean) =>
    `w-full h-[44px] px-3.5 rounded-[8px] bg-white text-[16px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 ${
      hasError ? "border-[#B3261E]" : "border-black/20 focus:border-[#C94A83]"
    }`;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#FAF6F2] px-4 py-8 sm:p-6 font-['DM_Sans',sans-serif]">
      <div className="w-full max-w-[420px] mb-5 flex items-center justify-between gap-4">
        <BrandLogo size="sm" hideTaglineOnMobile />
        <Link
          to="/"
          className="min-h-[44px] inline-flex items-center px-1 text-[15px] font-medium text-[#4A2A1A] underline decoration-[#D4568F] decoration-[1.5px] underline-offset-4 hover:text-[#C94A83] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm shrink-0"
        >
          Ke beranda
        </Link>
      </div>

      <main className="w-full max-w-[420px] bg-white border border-black/10 rounded-[12px] p-5 sm:p-8">
        <div className="mb-6">
          <h1 className="font-['Playfair_Display',Georgia,serif] font-medium text-[clamp(28px,7vw,34px)] leading-[1.2] text-[#4A2A1A]">
            {isLogin ? "Masuk" : "Daftar akun"}
          </h1>
          <p className="text-[16px] leading-[1.6] text-[#6B5A52] mt-2">
            {isLogin
              ? "Masuk untuk melihat dan mengatur reservasi Bunda."
              : "Lengkapi data berikut untuk membuat akun dan memesan layanan."}
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-[8px] bg-[#FFF5F5] border border-[#B3261E]/30 text-[13px] leading-[19px] text-[#B3261E]"
          >
            Periksa kembali: {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div>
              <label htmlFor="auth-name" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                Nama lengkap
              </label>
              <input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nama lengkap Bunda atau Ayah"
                className={inputClass(Boolean(fieldErrors.name))}
                value={form.name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "auth-name-error" : undefined}
                required
              />
              {fieldErrors.name && (
                <p id="auth-name-error" role="alert" className="mt-1.5 text-[13px] leading-[18px] text-[#B3261E]">
                  Kesalahan: {fieldErrors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
              Alamat email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              className={inputClass(Boolean(fieldErrors.email))}
              value={form.email}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
              required
            />
            {fieldErrors.email && (
              <p id="auth-email-error" role="alert" className="mt-1.5 text-[13px] leading-[18px] text-[#B3261E]">
                Kesalahan: {fieldErrors.email}
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="auth-phone" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                Nomor WhatsApp
              </label>
              <input
                id="auth-phone"
                name="phone_number"
                type="tel"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                className={`${inputClass(Boolean(fieldErrors.phone_number))} tabular-nums`}
                value={form.phone_number}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.phone_number)}
                aria-describedby={fieldErrors.phone_number ? "auth-phone-error" : undefined}
                required
              />
              {fieldErrors.phone_number && (
                <p id="auth-phone-error" role="alert" className="mt-1.5 text-[13px] leading-[18px] text-[#B3261E]">
                  Kesalahan: {fieldErrors.phone_number}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
              Kata sandi
            </label>
            <div className="relative">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="Minimal 8 karakter"
                className={`${inputClass(Boolean(fieldErrors.password))} pr-12`}
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] transition-colors duration-150 cursor-pointer rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="auth-password-error" role="alert" className="mt-1.5 text-[13px] leading-[18px] text-[#B3261E]">
                Kesalahan: {fieldErrors.password}
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="auth-password-confirmation" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                Konfirmasi kata sandi
              </label>
              <div className="relative">
                <input
                  id="auth-password-confirmation"
                  name="password_confirmation"
                  type={showPasswordConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi"
                  className={`${inputClass(Boolean(fieldErrors.password_confirmation))} pr-12`}
                  value={form.password_confirmation}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.password_confirmation)}
                  aria-describedby={fieldErrors.password_confirmation ? "auth-password-confirmation-error" : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] transition-colors duration-150 cursor-pointer rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                  title={showPasswordConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                  aria-label={showPasswordConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                >
                  {showPasswordConfirmation ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password_confirmation && (
                <p id="auth-password-confirmation-error" role="alert" className="mt-1.5 text-[13px] leading-[18px] text-[#B3261E]">
                  Kesalahan: {fieldErrors.password_confirmation}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] mt-2 inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[15px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isLoading ? "Memproses..." : isLogin ? "Masuk" : "Daftar akun"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-black/10 flex flex-wrap items-center justify-center gap-1 text-[15px] text-[#6B5A52]">
          <span>{isLogin ? "Belum punya akun?" : "Sudah punya akun?"}</span>
          <button
            type="button"
            onClick={switchMode}
            className="min-h-[44px] px-1.5 inline-flex items-center text-[15px] font-medium text-[#4A2A1A] underline decoration-[#D4568F] decoration-[1.5px] underline-offset-4 hover:text-[#C94A83] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm"
          >
            {isLogin ? "Daftar" : "Masuk"}
          </button>
        </div>
      </main>
    </div>
  );
}
