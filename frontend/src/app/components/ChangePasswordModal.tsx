import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { updatePassword } from "@/services/auth.service";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        resetForm();
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Semua kolom kata sandi wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage("Kata sandi baru harus berbeda dari kata sandi saat ini.");
      return;
    }

    setIsSubmitting(true);
    try {
      const msg = await updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      toast.success(msg || "Kata sandi berhasil diperbarui.");
      resetForm();
      onClose();
    } catch (err: any) {
      const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      const firstFieldError = errors ? Object.values(errors).flat()[0] : null;
      const msg = firstFieldError || err?.response?.data?.message || "Gagal memperbarui kata sandi.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-change-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-['DM_Sans',sans-serif]"
    >
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
      />
      <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-[calc(100vw-32px)] sm:max-w-md max-h-[90dvh] relative z-10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/10 shrink-0">
          <h3
            id="modal-change-password-title"
            className="text-[18px] leading-[24px] font-medium text-[#4A2A1A]"
          >
            Ubah kata sandi
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
            aria-label="Tutup modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4 text-left">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-[8px] border border-[#9B3B3B]/30 bg-[#9B3B3B]/5 px-3.5 py-2.5 text-[14px] leading-[20px] text-[#9B3B3B]"
              >
                {errorMessage}
              </div>
            )}

            <div>
              <label
                htmlFor="current-password"
                className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5"
              >
                Kata sandi saat ini
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi saat ini"
                  className="w-full h-[44px] pl-3.5 pr-12 rounded-[8px] bg-white border border-black/20 text-[16px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "Sembunyikan kata sandi saat ini" : "Tampilkan kata sandi saat ini"}
                  className="absolute right-0 top-0 w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] cursor-pointer rounded-r-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                >
                  {showCurrent ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5"
              >
                Kata sandi baru
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  className="w-full h-[44px] pl-3.5 pr-12 rounded-[8px] bg-white border border-black/20 text-[16px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
                  className="absolute right-0 top-0 w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] cursor-pointer rounded-r-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                >
                  {showNew ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5"
              >
                Konfirmasi kata sandi baru
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi baru"
                  minLength={8}
                  className="w-full h-[44px] pl-3.5 pr-12 rounded-[8px] bg-white border border-black/20 text-[16px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                  className="absolute right-0 top-0 w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] cursor-pointer rounded-r-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                >
                  {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end px-5 sm:px-6 py-4 border-t border-black/10 shrink-0 bg-white">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-[8px] border border-black/20 text-[15px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[15px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Menyimpan..." : "Simpan kata sandi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
