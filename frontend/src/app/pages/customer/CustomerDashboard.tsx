import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getMyReservations } from "@/services/reservation.service";
import { getBabies, createBaby, deleteBaby } from "@/services/baby.service";
import { updateProfile } from "@/services/auth.service";
import type { Reservation, Baby } from "@/types/api.types";
import RecommendationSection from "@/components/RecommendationSection";

export default function CustomerDashboard() {
  const { user, setUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [isBabyModalOpen, setIsBabyModalOpen] = useState(false);
  const [babyForm, setBabyForm] = useState({ name: "", birthDate: "", notes: "" });
  const [isCreatingBaby, setIsCreatingBaby] = useState(false);
  const [babyToDelete, setBabyToDelete] = useState<Baby | null>(null);
  const [isDeletingBaby, setIsDeletingBaby] = useState(false);

  const calculateAgeInMonths = (birthDateString: string) => {
    const birth = new Date(birthDateString);
    const today = new Date();
    const yearsDiff = today.getFullYear() - birth.getFullYear();
    const monthsDiff = today.getMonth() - birth.getMonth();
    const total = yearsDiff * 12 + monthsDiff;
    return Math.max(0, total);
  };

  const formatBabyAge = (birthDateString: string) => {
    const totalMonths = calculateAgeInMonths(birthDateString);
    if (totalMonths < 12) return `${totalMonths} bulan`;
    const years = Math.floor(totalMonths / 12);
    const rem = totalMonths % 12;
    return rem === 0 ? `${years} tahun` : `${years} thn ${rem} bln`;
  };

  const fetchMyData = async () => {
    try {
      const [resData, babiesData] = await Promise.all([
        getMyReservations(),
        getBabies(),
      ]);
      setReservations(resData);
      setBabies(babiesData);
    } catch {
      // Soft error handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  useEffect(() => {
    const hasPendingCountdown = reservations.some(
      (r) => r.status === "pending" && Boolean(r.expires_at)
    );
    if (!hasPendingCountdown) return;

    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [reservations]);

  const formatRemainingCountdown = (expiresAt: string | null): string | null => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - nowTick;
    if (diff <= 0) return "00:00";
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const handleCreateBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = babyForm.name.trim();
    if (!cleanName || !babyForm.birthDate) {
      toast.error("Nama dan tanggal lahir anak wajib diisi.");
      return;
    }
    if (!/^[a-zA-Z\s'.-]+$/.test(cleanName) || !/[a-zA-Z]/.test(cleanName)) {
      toast.error("Nama anak hanya boleh berisi huruf (tidak boleh angka).");
      return;
    }

    setIsCreatingBaby(true);
    try {
      await createBaby({
        name: cleanName,
        birth_date: babyForm.birthDate,
        notes: babyForm.notes || null,
      });
      toast.success("Profil anak berhasil disimpan.");
      setBabyForm({ name: "", birthDate: "", notes: "" });
      setIsBabyModalOpen(false);
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menyimpan profil anak.");
    } finally {
      setIsCreatingBaby(false);
    }
  };

  const handleConfirmDeleteBaby = async () => {
    if (!babyToDelete || isDeletingBaby) return;
    setIsDeletingBaby(true);
    try {
      await deleteBaby(babyToDelete.id);
      toast.success("Profil anak berhasil dihapus.");
      setBabyToDelete(null);
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menghapus profil anak.");
    } finally {
      setIsDeletingBaby(false);
    }
  };

  const handleStartEditAddress = () => {
    setAddressInput(user?.address ?? "");
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    setIsSavingAddress(true);
    try {
      const updatedUser = await updateProfile({ address: addressInput || null });
      setUser(updatedUser);
      toast.success("Alamat berhasil disimpan.");
      setIsEditingAddress(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menyimpan alamat.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const renderStatus = (booking: Reservation) => {
    let label = booking.status;
    let textColor = "text-[#6B5A52]";
    let dotColor = "bg-[#6B5A52]";

    if (booking.status === "pending") {
      label = "Belum bayar";
      textColor = "text-[#8A5A00]";
      dotColor = "bg-[#8A5A00]";
    } else if (booking.status === "waiting_verification") {
      label = "Menunggu verifikasi";
      textColor = "text-[#8A5A00]";
      dotColor = "bg-[#8A5A00]";
    } else if (booking.status === "confirmed") {
      label = "Dikonfirmasi";
      textColor = "text-[#2F6B45]";
      dotColor = "bg-[#2F6B45]";
    } else if (booking.status === "completed") {
      label = "Selesai";
      textColor = "text-[#6B5A52]";
      dotColor = "bg-[#6B5A52]";
    } else if (booking.status === "cancelled") {
      label = "Dibatalkan";
      textColor = "text-[#9B3B3B]";
      dotColor = "bg-[#9B3B3B]";
    }

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-2 text-[13px] leading-[18px] font-medium ${textColor}`}>
          <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <span>{label}</span>
        </span>
        {booking.is_rescheduled && booking.status !== "cancelled" && (
          <span className="inline-flex items-center gap-2 text-[13px] leading-[18px] font-medium text-[#5A4A8A]">
            <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0 bg-[#5A4A8A]" />
            <span>Reschedule</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#FAF6F2] w-full font-['DM_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
        {/* Header Halaman */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 sm:pb-8 mb-8 border-b border-black/10 gap-4">
          <div>
            <h1 className="font-['Playfair_Display',Georgia,serif] font-medium text-[32px] leading-[1.15] md:text-[40px] text-[#4A2A1A]">
              Ruang Bunda
            </h1>
            <p className="text-[15px] leading-[24px] text-[#6B5A52] mt-1.5">
              {user?.name ? (
                <>
                  Halo, <span className="capitalize">{user.name}</span>. Pantau jadwal perawatan dan profil si kecil di sini.
                </>
              ) : (
                "Pantau jadwal perawatan dan profil si kecil di sini."
              )}
            </p>
          </div>
          <Link
            to="/reservasi"
            className="inline-flex items-center justify-center h-[44px] px-5 rounded-[8px] border border-[#C94A83] bg-transparent text-[#C94A83] hover:bg-[#C94A83] hover:text-white text-[15px] font-medium transition-colors duration-150 self-start sm:self-auto shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
          >
            Buat reservasi
          </Link>
        </div>

        {/* Layout 2 Kolom Desktop (>= 1024px): Kiri Profil (320px) + Kanan Daftar Reservasi */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          {/* Kolom Kiri: Kartu Profil */}
          <aside className="bg-white border border-black/10 rounded-[12px] p-5 sm:p-6 min-w-0">
            <div>
              <h2 className="font-['DM_Sans',sans-serif] text-[18px] leading-[24px] font-medium text-[#4A2A1A] break-words capitalize">
                {user?.name ?? "Bunda"}
              </h2>
              <p className="text-[14px] leading-[20px] text-[#6B5A52] break-all mt-1">
                {user?.email ?? "-"}
              </p>
              {user?.phone_number && (
                <p className="text-[14px] leading-[20px] text-[#6B5A52] tabular-nums mt-0.5">
                  {user.phone_number}
                </p>
              )}
            </div>

            {/* Bagian Alamat Rumah */}
            <div className="pt-5 mt-5 border-t border-black/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-[14px] leading-[20px] font-medium text-[#4A2A1A]">
                  Alamat rumah
                </h3>
                {!isEditingAddress && (
                  <button
                    type="button"
                    onClick={handleStartEditAddress}
                    className="text-[14px] font-medium text-[#C94A83] hover:underline underline-offset-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm"
                  >
                    Ubah
                  </button>
                )}
              </div>

              {isEditingAddress ? (
                <div className="flex flex-col gap-2.5">
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 rounded-[8px] bg-white border border-black/20 text-[14px] leading-[20px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 resize-none focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                    placeholder="Contoh: Jl. Musi No. 10, RT 02/RW 13, Karanganyar"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="h-[36px] px-3.5 rounded-[8px] border border-black/20 text-[13px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress}
                      className="inline-flex items-center justify-center gap-1.5 h-[36px] px-4 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[13px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60"
                    >
                      {isSavingAddress && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                      {isSavingAddress ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[14px] leading-[22px] text-[#6B5A52] break-words">
                  {user?.address || "Belum diisi. Diperlukan apabila Bunda memilih layanan kunjungan rumah."}
                </p>
              )}
            </div>

            {/* Bagian Profil Si Kecil */}
            <div className="pt-5 mt-5 border-t border-black/10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-[14px] leading-[20px] font-medium text-[#4A2A1A]">
                  Profil si kecil
                </h3>
                <button
                  type="button"
                  onClick={() => setIsBabyModalOpen(true)}
                  className="text-[14px] font-medium text-[#C94A83] hover:underline underline-offset-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm"
                >
                  Tambah anak
                </button>
              </div>

              {babies.length === 0 ? (
                <p className="text-[14px] leading-[22px] text-[#6B5A52]">
                  Belum diisi. Tambahkan data anak agar pemesanan lebih cepat dan rekomendasi sesuai usia.
                </p>
              ) : (
                <ul className="divide-y divide-black/10">
                  {babies.map((b) => (
                    <li key={b.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[14px] leading-[20px] font-medium text-[#4A2A1A] truncate">
                            {b.name ?? "-"}
                          </span>
                          <span className="text-[13px] leading-[20px] text-[#6B5A52] tabular-nums shrink-0">
                            {b.birth_date ? formatBabyAge(b.birth_date) : "-"}
                          </span>
                        </div>
                        {b.notes && (
                          <p className="text-[12px] leading-[18px] text-[#6B5A52] truncate mt-0.5">
                            {b.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setBabyToDelete(b)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#9B3B3B] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer shrink-0 -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                        title={`Hapus profil ${b.name}`}
                        aria-label={`Hapus profil ${b.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Kolom Kanan: Daftar Reservasi */}
          <section aria-labelledby="reservasi-saya-heading" className="min-w-0">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2
                id="reservasi-saya-heading"
                className="font-['DM_Sans',sans-serif] text-[20px] leading-[28px] font-medium text-[#4A2A1A]"
              >
                Reservasi saya
              </h2>
              {!isLoading && reservations.length > 0 && (
                <span className="text-[14px] text-[#6B5A52] tabular-nums">
                  {reservations.length} reservasi
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="bg-white border border-black/10 rounded-[12px] flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={24} className="animate-spin text-[#6B5A52]" aria-hidden="true" />
                <p className="text-[#6B5A52] text-[14px]">Memuat daftar reservasi...</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="bg-white border border-black/10 rounded-[12px] p-8 text-center">
                <p className="text-[15px] leading-[24px] text-[#6B5A52]">
                  Belum ada reservasi.{" "}
                  <Link
                    to="/reservasi"
                    className="font-medium text-[#4A2A1A] underline decoration-[#D4568F] decoration-[1.5px] underline-offset-4 hover:text-[#C94A83] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm"
                  >
                    Buat reservasi
                  </Link>
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {reservations.map((booking) => {
                  const countdown =
                    booking.status === "pending"
                      ? formatRemainingCountdown(booking.expires_at)
                      : null;
                  const isCancelled = booking.status === "cancelled";
                  const formattedDate = booking.reservation_date
                    ? new Date(booking.reservation_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                    : "-";
                  const formattedTime = booking.start_time
                    ? `${booking.start_time.substring(0, 5)} WIB`
                    : "-";
                  const locationText = booking.delivery_address
                    ? "Kunjungan rumah"
                    : "Studio Mayesha";

                  return (
                    <article
                      key={booking.id}
                      className={`border border-black/10 rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isCancelled ? "bg-white/75" : "bg-white"
                        }`}
                    >
                      <div className="min-w-0 flex-1 flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {renderStatus(booking)}
                          {countdown && (
                            <span className="text-[13px] leading-[18px] text-[#8A5A00] tabular-nums">
                              Sisa {countdown}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-[16px] leading-[24px] font-medium break-words ${isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                            }`}
                        >
                          {booking.service?.name ?? "Layanan"}
                        </h3>

                        <p className="text-[14px] leading-[21px] text-[#6B5A52] tabular-nums">
                          {formattedDate} • {formattedTime} • {locationText}
                          {booking.baby_name ? ` • ${booking.baby_name}` : ""}
                        </p>

                        <p className="text-[13px] leading-[18px] text-[#6B5A52] mt-0.5 booking-code">
                          {booking.booking_code}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-black/10 shrink-0">
                        <span
                          className={`text-[16px] sm:text-[17px] leading-[24px] font-medium tabular-nums ${isCancelled ? "text-[#6B5A52] line-through" : "text-[#4A2A1A]"
                            }`}
                        >
                          Rp {Number(booking.total_price ?? 0).toLocaleString("id-ID")}
                        </span>

                        <Link
                          to={`/dashboard/reservasi/${booking.id}`}
                          className={`inline-flex items-center justify-center rounded-[8px] px-[14px] py-[6px] text-[14px] font-medium border transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 ${isCancelled
                            ? "border-black/20 text-[#6B5A52] hover:border-[#4A2A1A] hover:text-[#4A2A1A]"
                            : "border-[#C94A83] text-[#C94A83] hover:bg-[#C94A83] hover:text-white"
                            }`}
                        >
                          {booking.status === "pending" ? "Detail dan bayar" : "Lihat detail"}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Bagian Rekomendasi / Layanan Terpopuler */}
        <div className="mt-12 pt-10 border-t border-black/10">
          <RecommendationSection />
        </div>
      </div>

      {/* Modal Tambah Profil Anak */}
      {isBabyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-baby-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={() => setIsBabyModalOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-md p-6 relative z-10 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <h3 id="modal-add-baby-title" className="text-[18px] font-medium text-[#4A2A1A]">
                Tambah profil anak
              </h3>
              <button
                type="button"
                onClick={() => setIsBabyModalOpen(false)}
                className="p-1.5 text-[#6B5A52] hover:text-[#4A2A1A] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBaby} className="flex flex-col gap-4 text-left">
              <div>
                <label htmlFor="baby-name" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                  Nama lengkap anak
                </label>
                <input
                  id="baby-name"
                  type="text"
                  placeholder="Contoh: Kenzie"
                  className="w-full h-[44px] px-3.5 rounded-[8px] bg-white border border-black/20 text-[15px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={babyForm.name}
                  onChange={(e) =>
                    setBabyForm({ ...babyForm, name: e.target.value.replace(/[^a-zA-Z\s'.-]/g, "") })
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="baby-birthdate" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                  Tanggal lahir
                </label>
                <input
                  id="baby-birthdate"
                  type="date"
                  className="w-full h-[44px] px-3.5 rounded-[8px] bg-white border border-black/20 text-[15px] text-[#4A2A1A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={babyForm.birthDate}
                  onChange={(e) => setBabyForm({ ...babyForm, birthDate: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div>
                <label htmlFor="baby-notes" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                  Catatan kesehatan (opsional)
                </label>
                <textarea
                  id="baby-notes"
                  rows={2}
                  placeholder="Contoh: Alergi minyak lavender, kulit sensitif"
                  className="w-full px-3.5 py-2.5 rounded-[8px] bg-white border border-black/20 text-[14px] text-[#4A2A1A] placeholder:text-[#6B5A52]/70 resize-none focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={babyForm.notes}
                  onChange={(e) => setBabyForm({ ...babyForm, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsBabyModalOpen(false)}
                  className="h-[44px] px-4 rounded-[8px] border border-black/20 text-[15px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBaby}
                  className="inline-flex items-center justify-center gap-2 h-[44px] px-5 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[15px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  {isCreatingBaby && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                  {isCreatingBaby ? "Menyimpan..." : "Simpan profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dialog Konfirmasi Hapus Profil Anak */}
      {babyToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="modal-delete-baby-title"
          aria-describedby="modal-delete-baby-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={() => !isDeletingBaby && setBabyToDelete(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-sm p-6 relative z-10 flex flex-col gap-4">
            <h3 id="modal-delete-baby-title" className="text-[18px] leading-[24px] font-medium text-[#4A2A1A]">
              Hapus profil anak?
            </h3>
            <p id="modal-delete-baby-desc" className="text-[14px] leading-[22px] text-[#6B5A52]">
              Profil <span className="font-medium text-[#4A2A1A]">{babyToDelete.name}</span> akan dihapus dari daftar anak Bunda.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingBaby}
                onClick={() => setBabyToDelete(null)}
                className="h-[40px] px-4 rounded-[8px] border border-black/20 text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingBaby}
                onClick={handleConfirmDeleteBaby}
                className="inline-flex items-center justify-center gap-2 h-[40px] px-4 rounded-[8px] bg-[#9B3B3B] hover:bg-[#822F2F] text-white text-[14px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B3B3B] focus-visible:ring-offset-2"
              >
                {isDeletingBaby && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {isDeletingBaby ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
