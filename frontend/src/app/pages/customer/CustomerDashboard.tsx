import { useEffect, useState } from "react";
import { Link } from "react-router";
import { User, Calendar, Clock, MapPin, Plus, Loader2, Trash2, X, Baby as BabyIcon, Pencil, Check } from "lucide-react";
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
    if (!babyForm.name || !babyForm.birthDate) {
      toast.error("Nama dan tanggal lahir anak wajib diisi.");
      return;
    }

    setIsCreatingBaby(true);
    try {
      await createBaby({
        name: babyForm.name,
        birth_date: babyForm.birthDate,
        notes: babyForm.notes || null,
      });
      toast.success("Profil anak berhasil disimpan permanen!");
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
      toast.success("Alamat berhasil disimpan!");
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
      waiting_verification: { bg: "bg-indigo-50 border-indigo-100 text-indigo-600", text: "text-indigo-600", label: "Menunggu Verifikasi" },
      confirmed: { bg: "bg-emerald-50 border-emerald-100 text-emerald-600", text: "text-emerald-600", label: "Dikonfirmasi" },
      cancelled: { bg: "bg-rose-50 border-rose-100 text-rose-600", text: "text-rose-600", label: "Dibatalkan" },
      completed: { bg: "bg-slate-50 border-slate-100 text-slate-600", text: "text-slate-600", label: "Selesai" },
    };
    return configs[status] || { bg: "bg-slate-100 border-slate-200 text-slate-600", text: "text-slate-600", label: status };
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Ruang Bunda</h1>
          <p className="text-slate-500">Hai Bunda {user?.name}! Yuk, pantau jadwal sesi si Kecil di sini.</p>
        </div>
        <Link to="/reservasi" className="btn-primary flex items-center gap-2 w-max shadow-lg shadow-pink-100">
          <Plus size={18} /> Booking Sesi Baru
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Card Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
              <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center text-pink-500">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{user?.name}</h3>
                <p className="text-sm text-slate-500">{user?.phone_number ?? "-"}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-100 mt-1 inline-block">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Alamat Rumah */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={11} /> Alamat Rumah
                </h4>
                {!isEditingAddress && (
                  <button
                    onClick={handleStartEditAddress}
                    className="text-pink-500 hover:text-pink-600 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
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
                    placeholder="Contoh: Jl. Mawar No. 10, RT 02/03, Bekasi Utara"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {isSavingAddress ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Simpan
                    </button>
                    <button
                      onClick={() => setIsEditingAddress(false)}
                      className="flex-1 py-1.5 border border-slate-200 text-slate-500 text-[11px] font-bold rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {user?.address ?? <span className="italic text-slate-400">Belum diisi. Diperlukan untuk layanan home visit.</span>}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profil Si Kecil</h4>
                <button
                  onClick={() => setIsBabyModalOpen(true)}
                  className="text-pink-500 hover:text-pink-600 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                >
                  <Plus size={10} /> Tambah Anak
                </button>
              </div>



              {babies.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada profil anak terdaftar.</p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {babies.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-pink-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-extrabold uppercase">
                          {b.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">{b.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {formatBabyAge(b.birth_date)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBaby(b.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 cursor-pointer"
                        title="Hapus Profil"
                      >
                        <Trash2 size={12} />
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
            <h2 className="text-xl font-bold text-slate-800 mb-6">Daftar Riwayat Reservasi</h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={32} className="animate-spin text-pink-500" />
                <p className="text-slate-400 text-sm font-medium">Mengambil riwayat reservasi...</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-600 font-semibold text-lg">Belum ada jadwal sesi</p>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                  Yuk, jadwalkan spa atau pijat rileks untuk buah hati Bunda sekarang juga.
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
                      className="bg-white/50 border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-pink-200 transition-colors shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-pink-100 text-pink-500">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-400">{booking.booking_code}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${status.bg}`}>
                              {status.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-base">{booking.service?.name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              {new Date(booking.reservation_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              , {booking.start_time.substring(0, 5)} WIB
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={13} />
                              Studio Bliss
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch sm:items-end gap-2">
                        <span className="font-extrabold text-slate-800 text-sm sm:text-right">
                          Rp {booking.total_price.toLocaleString("id-ID")}
                        </span>
                        <Link
                          to={`/dashboard/reservasi/${booking.id}`}
                          className="btn-secondary py-2 px-4 text-xs font-semibold text-center border-slate-200 hover:border-pink-500 hover:text-pink-600"
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-md p-6 relative z-10 border border-white/80 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Tambah Profil Anak</h3>
                <button
                  onClick={() => setIsBabyModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateBaby} className="flex flex-col gap-4 text-left">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nama Lengkap Anak</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kenzie"
                    className="input-glass w-full"
                    value={babyForm.name}
                    onChange={(e) => setBabyForm({ ...babyForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tanggal Lahir</label>
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
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Catatan Khusus / Kesehatan (Opsional)</label>
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
                    className="px-5 py-2.5 font-semibold text-sm text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingBaby}
                    className="px-5 py-2.5 font-semibold text-sm bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-lg shadow-pink-100 hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
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