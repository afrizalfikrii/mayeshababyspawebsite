import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  User,
  CalendarBlank as Calendar,
  Clock,
  MapPin,
  Plus,
  CircleNotch as Loader2,
  Trash as Trash2,
  X,
  Baby as BabyIcon,
  PencilSimple as Pencil,
  Check,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
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

  // State untuk edit alamat
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // State untuk modal tambah data anak
  const [isBabyModalOpen, setIsBabyModalOpen] = useState(false);
  const [babyForm, setBabyForm] = useState({ name: "", birthDate: "", notes: "" });
  const [isCreatingBaby, setIsCreatingBaby] = useState(false);

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
    if (totalMonths < 12) return `${totalMonths} Bulan`;
    const years = Math.floor(totalMonths / 12);
    const rem = totalMonths % 12;
    return rem === 0 ? `${years} Tahun` : `${years} Thn ${rem} Bln`;
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

  const handleDeleteBaby = async (id: number) => {
    if (!confirm("Apakah Bunda yakin ingin menghapus profil anak ini?")) return;
    try {
      await deleteBaby(id);
      toast.success("Profil anak berhasil dihapus.");
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menghapus profil anak.");
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-amber-50 border-amber-100 text-amber-600", text: "text-amber-600", label: "Belum Bayar" },
      waiting_verification: { bg: "bg-[#F9EBEF] border-[#E8DFD8] text-[#9F285B]", text: "text-[#9F285B]", label: "Menunggu Verifikasi" },
      confirmed: { bg: "bg-emerald-50 border-emerald-100 text-emerald-600", text: "text-emerald-600", label: "Dikonfirmasi" },
      cancelled: { bg: "bg-rose-50 border-rose-100 text-rose-600", text: "text-rose-600", label: "Dibatalkan" },
      completed: { bg: "bg-[#F7F3EE] border-[#E8DFD8] text-[#6E5D58]", text: "text-[#6E5D58]", label: "Selesai" },
    };
    return configs[status] || { bg: "bg-[#F4EFE8] border-[#E8DFD8] text-[#6E5D58]", text: "text-[#6E5D58]", label: status };
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#3A2622] tracking-tight">Ruang Bunda</h1>
          <p className="text-[#6E5D58] mt-1">
            Halo {user?.name ?? "Bunda"}, pantau jadwal sesi perawatan dan profil Si Kecil di sini.
          </p>
        </div>
        <Link to="/reservasi" className="btn-primary w-max">
          <Plus size={18} /> Booking Sesi Baru
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Card Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
            <div className="flex items-center gap-4 border-b border-[#E8DFD8] pb-4 mb-4">
              <div className="w-12 h-12 bg-[#F9EBEF] rounded-full flex items-center justify-center text-[#BE346E] shrink-0">
                <User size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#3A2622] truncate">{user?.name}</h3>
                <p className="text-sm text-[#6E5D58] tabular-nums">{user?.phone_number ?? "-"}</p>
              </div>
            </div>

            {/* Alamat Rumah */}
            <div className="border-t border-[#E8DFD8] pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#6E5D58] uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={11} /> Alamat Rumah
                </h4>
                {!isEditingAddress && (
                  <button
                    onClick={handleStartEditAddress}
                    className="text-[#BE346E] hover:text-[#BE346E] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                )}
              </div>

              {isEditingAddress ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={3}
                    className="input-glass w-full resize-none py-2 text-xs"
                    placeholder="Contoh: Jl. Lawu No. 10, Tegalgede, Karanganyar"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#BE346E] hover:bg-[#BE346E] text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {isSavingAddress ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Simpan
                    </button>
                    <button
                      onClick={() => setIsEditingAddress(false)}
                      className="flex-1 py-1.5 border border-[#E8DFD8] text-[#6E5D58] text-[11px] font-bold rounded-lg hover:bg-[#F7F3EE] transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#6E5D58] leading-relaxed">
                  {user?.address ?? <span className="italic text-[#6E5D58]">Belum diisi. Diperlukan untuk layanan home visit.</span>}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-t border-[#E8DFD8] pt-4">
                <h4 className="text-xs font-bold text-[#6E5D58] uppercase tracking-wider">Profil Si Kecil</h4>
                <button
                  onClick={() => setIsBabyModalOpen(true)}
                  className="text-[#BE346E] hover:text-[#BE346E] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                >
                  <Plus size={10} /> Tambah Anak
                </button>
              </div>



              {babies.length === 0 ? (
                <p className="text-[11px] text-[#6E5D58] italic">Belum ada profil anak terdaftar.</p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {babies.map((b) => (
                    <div
                      key={b.id}
                      className="bg-[#F7F3EE] p-3 rounded-xl border border-[#E8DFD8] flex items-center justify-between group hover:border-[#E8DFD8] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F9EBEF] text-[#BE346E] rounded-full flex items-center justify-center text-xs font-extrabold uppercase">
                          {(b.name ?? "A").substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#3A2622] text-xs">{b.name ?? "-"}</p>
                          <p className="text-[10px] text-[#6E5D58] font-medium">
                            {b.birth_date ? formatBabyAge(b.birth_date) : "-"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBaby(b.id)}
                        className="text-[#6E5D58] hover:text-red-700 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg hover:bg-white cursor-pointer"
                        title="Hapus Profil"
                        aria-label={`Hapus profil ${b.name ?? "anak"}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>


        </div>

        {/* Bookings List */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6"
          >
            <h2 className="text-xl font-bold text-[#3A2622] mb-6">Daftar Riwayat Reservasi</h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={32} className="animate-spin text-[#BE346E]" />
                <p className="text-[#6E5D58] text-sm font-medium">Mengambil riwayat reservasi...</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="mx-auto text-[#D7C9BE] mb-4" size={48} />
                <p className="text-[#6E5D58] font-semibold text-lg">Belum ada jadwal sesi</p>
                <p className="text-[#6E5D58] text-sm max-w-sm mx-auto mt-1">
                  Jadwalkan sesi spa atau pijat lembut untuk buah hati Anda kapan saja.
                </p>
                <Link to="/reservasi" className="btn-primary mt-6 inline-flex items-center gap-2 py-2.5 px-6">
                  Buat Reservasi Pertama
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reservations.map((booking) => {
                  const status = getStatusConfig(booking.status);
                  return (
                    <div
                      key={booking.id}
                      className="bg-white/50 border border-[#E8DFD8] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#E8DFD8] transition-colors shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F9EBEF] text-[#BE346E]">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-[#6E5D58]">{booking.booking_code}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${status.bg}`}>
                              {status.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#3A2622] text-base">{booking.service?.name ?? "Layanan"}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-medium text-[#6E5D58]">
                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              {booking.reservation_date
                                ? new Date(booking.reservation_date).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                              , {booking.start_time ? booking.start_time.substring(0, 5) : "-"} WIB
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={13} />
                              {booking.delivery_address ? "Home Care" : "Studio Mayesha"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch sm:items-end gap-2">
                        <span className="font-extrabold text-[#3A2622] text-sm sm:text-right">
                          Rp {Number(booking.total_price ?? 0).toLocaleString("id-ID")}
                        </span>
                        <Link
                          to={`/dashboard/reservasi/${booking.id}`}
                          className="btn-secondary py-2 px-4 text-xs font-semibold text-center border-[#E8DFD8] hover:border-[#BE346E] hover:text-[#BE346E]"
                        >
                          Detail & Bayar
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Rekomendasi Layanan (Content-Based Filtering) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-2"
      >
        <RecommendationSection />
      </motion.div>

      <AnimatePresence>
        {isBabyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBabyModalOpen(false)}
              className="absolute inset-0 bg-[#3A2622]/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-md p-6 relative z-10 border border-[#E8DFD8] shadow-xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#3A2622]">Tambah Profil Anak</h3>
                <button
                  onClick={() => setIsBabyModalOpen(false)}
                  className="p-1 text-[#6E5D58] hover:text-[#6E5D58] rounded-full hover:bg-[#F4EFE8] transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateBaby} className="flex flex-col gap-4 text-left">
                <div>
                  <label className="text-xs font-bold text-[#6E5D58] uppercase block mb-1.5">Nama Lengkap Anak</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kenzie"
                    className="input-glass w-full"
                    value={babyForm.name}
                    onChange={(e) =>
                      setBabyForm({ ...babyForm, name: e.target.value.replace(/[^a-zA-Z\s'.-]/g, "") })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#6E5D58] uppercase block mb-1.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    className="input-glass w-full"
                    value={babyForm.birthDate}
                    onChange={(e) => setBabyForm({ ...babyForm, birthDate: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#6E5D58] uppercase block mb-1.5">Catatan Khusus / Kesehatan (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Alergi lavender oil, kulit sensitif..."
                    className="input-glass w-full resize-none py-2"
                    value={babyForm.notes}
                    onChange={(e) => setBabyForm({ ...babyForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setIsBabyModalOpen(false)}
                    className="px-5 py-2.5 font-semibold text-sm text-[#6E5D58] hover:bg-[#F7F3EE] border border-[#E8DFD8] rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingBaby}
                    className="px-5 py-2.5 font-semibold text-sm bg-[#BE346E] hover:bg-[#BE346E] text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isCreatingBaby ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}