import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  Loader2,
  FileImage,
  Upload,
  CheckCircle,
  XCircle,
  Printer,
  Star,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  getMyReservations,
  uploadPaymentProof,
  submitReview,
  customerRescheduleReservation,
  getSlotAvailability,
} from "@/services/reservation.service";
import type { Reservation, SlotAvailability } from "@/types/api.types";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // State untuk form ulasan / rating
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // State untuk Reschedule Customer
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const all = await getMyReservations();
      const match = all.find((r) => r.id === Number(id));
      if (match) {
        setBooking(match);
      } else {
        toast.error("Reservasi tidak ditemukan.");
        navigate("/dashboard");
      }
    } catch {
      toast.error("Gagal mengambil detail reservasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setIsSubmittingReview(true);
    try {
      await submitReview(booking.id, { rating, comment });
      toast.success("Terima kasih! Ulasan Anda berhasil disimpan.");
      setComment("");
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Fetch slot availability when rescheduleDate changes in modal
  useEffect(() => {
    if (!rescheduleDate || !booking?.service_id || !rescheduleModal) return;

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setSlotAvailability(null);
      try {
        const data = await getSlotAvailability(rescheduleDate, booking.service_id);
        setSlotAvailability(data);
        if (rescheduleTime && data.slots[rescheduleTime]?.is_full) {
          setRescheduleTime("");
        }
      } catch {
        // Silently catch
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [rescheduleDate, booking?.service_id, rescheduleModal]);

  const handleCustomerReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !rescheduleDate || !rescheduleTime) {
      toast.error("Mohon pilih tanggal dan jam baru.");
      return;
    }
    setIsRescheduling(true);
    try {
      const updated = await customerRescheduleReservation(booking.id, {
        reservation_date: rescheduleDate,
        start_time: rescheduleTime,
        notes: rescheduleNotes || undefined,
      });
      toast.success("Jadwal reservasi berhasil diubah!");
      setBooking(updated);
      setRescheduleModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengubah jadwal reservasi.");
    } finally {
      setIsRescheduling(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // ── Countdown Timer for Pending Expiry ──────────────────────────────────────
  useEffect(() => {
    if (!booking || booking.status !== "pending" || !booking.expires_at) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const expiry = new Date(booking.expires_at!).getTime();
      const diff = expiry - new Date().getTime();

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft("EXPIRED");
        setBooking((prev) => (prev ? { ...prev, status: "cancelled" } : null));
        toast.error("Waktu pembayaran telah habis. Reservasi dibatalkan secara otomatis.");
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file gambar maksimal 2MB.");
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !booking) return;

    setIsUploading(true);
    try {
      await uploadPaymentProof(booking.id, selectedFile);
      toast.success("Bukti pembayaran berhasil diupload. Mohon tunggu verifikasi admin.");
      setSelectedFile(null);
      setFilePreview(null);
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengupload bukti pembayaran.");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string; desc: string }> = {
      pending: {
        bg: "bg-amber-50 text-amber-600 border-amber-100",
        text: "text-amber-600",
        label: "Belum Bayar",
        desc: "Selesaikan pembayaran QRIS di bawah ini sebelum batas waktu habis.",
      },
      waiting_verification: {
        bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
        text: "text-indigo-600",
        label: "Menunggu Verifikasi",
        desc: "Bukti transfer telah kami terima. Admin sedang memverifikasi pembayaran Anda.",
      },
      confirmed: {
        bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
        text: "text-emerald-600",
        label: "Dikonfirmasi",
        desc: "Pembayaran terverifikasi! Silakan datang sesuai jadwal yang telah ditentukan.",
      },
      cancelled: {
        bg: "bg-rose-50 text-rose-600 border-rose-100",
        text: "text-rose-600",
        label: "Dibatalkan / Expired",
        desc: "Reservasi dibatalkan. Batas waktu bayar telah habis atau bukti bayar tidak sesuai.",
      },
      completed: {
        bg: "bg-slate-50 text-slate-600 border-slate-100",
        text: "text-slate-600",
        label: "Selesai Sesi",
        desc: "Sesi spa si Kecil telah selesai dilakukan. Terima kasih atas kunjungan Anda!",
      },
    };
    return config[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", text: "text-slate-600", label: status, desc: "" };
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-pink-500" />
        <p className="text-slate-400 text-sm font-semibold">Mengambil data reservasi...</p>
      </div>
    );
  }

  if (!booking) return null;

  const status = getStatusDisplay(booking.status);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-pink-500 mb-6 transition-colors font-semibold text-sm print:hidden"
      >
        <ArrowLeft size={16} /> Balik ke Ruang Bunda
      </Link>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Detail Info (2 Columns) */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Detail Reservasi</h1>
                <p className="text-slate-400 text-xs font-mono mt-1">ID Booking: {booking.booking_code}</p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${status.bg}`}>
                {status.label}
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100/60 font-medium">
              {status.desc}
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              {/* Sesi Info */}
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                  <Calendar className="text-pink-500" size={16} /> Info Sesi Spa
                </h3>
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Tanggal Sesi</span>
                    <span className="font-bold text-slate-800">
                      {new Date(booking.reservation_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Jam Kedatangan</span>
                    <span className="font-bold text-slate-800">{booking.start_time.substring(0, 5)} WIB</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Layanan</span>
                    <span className="font-bold text-slate-800 text-right max-w-[65%] leading-tight">
                      {booking.service?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Durasi</span>
                    <span className="font-bold text-slate-800">{booking.service?.duration_minutes} Menit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Terapis</span>
                    <span className="font-bold text-slate-800">
                      {booking.therapist?.name || "Otomatis / Belum Ditentukan"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-3 mt-3">
                    <span className="text-slate-500 font-medium">Lokasi</span>
                    <span className="font-bold text-slate-800">Studio Bliss</span>
                  </div>
                </div>
              </div>

              {/* Bayi Info */}
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                  <User className="text-pink-500" size={16} /> Profil Si Kecil
                </h3>
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Nama Panggilan</span>
                    <span className="font-bold text-slate-800">{booking.baby_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Usia Bayi</span>
                    <span className="font-bold text-slate-800">{booking.baby_age} Bulan</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2 pt-3 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Catatan / Pesan:</span>
                    <span className="text-slate-700 font-medium italic">
                      {booking.notes ? `"${booking.notes}"` : "Tidak ada catatan khusus."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar (Print & Reschedule) */}
            <div className="border-t border-slate-200/60 pt-6 mt-8 flex flex-col sm:flex-row gap-3 justify-start items-center print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 font-bold text-sm text-slate-600 hover:text-pink-600 border border-slate-200 hover:border-pink-500 rounded-xl flex items-center gap-2 transition-all cursor-pointer w-full sm:w-auto justify-center bg-white"
              >
                <Printer size={16} /> Cetak Tiket
              </button>
              {booking.status !== "completed" && booking.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleDate(booking.reservation_date);
                    setRescheduleTime(booking.start_time.substring(0, 5));
                    setRescheduleNotes("");
                    setRescheduleModal(true);
                  }}
                  className="px-4 py-2.5 font-bold text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-2 transition-all cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Calendar size={16} /> Ubah Jadwal
                </button>
              )}
            </div>
          </motion.div>

          {/* Kartu untuk berikan ulasan & rating */}
          {booking.status === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-8 border-pink-100 flex flex-col gap-6"
            >
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Sparkles className="text-pink-500" size={18} /> Berikan Ulasan & Rating
                </h3>
                <p className="text-slate-400 text-xs mt-1">Bagaimana pengalaman Bunda dan si Kecil selama sesi spa?</p>
              </div>

              {booking.review ? (
                // Already Reviewed
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ulasan Anda</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={16}
                          className={idx < booking.review!.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm font-semibold italic">
                    &quot;{booking.review.comment || "Bunda tidak menulis komentar."}&quot;
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Ulasan Anda membantu kami untuk terus meningkatkan layanan spa.</p>
                </div>
              ) : (
                // Form to Submit Review
                <form onSubmit={handleSendReview} className="flex flex-col gap-5">
                  <div className="flex flex-col items-center gap-2 bg-slate-50/50 py-4 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Rating Bintang</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            size={28}
                            className={
                              star <= rating
                                ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                                : "text-slate-200 hover:text-amber-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Komentar Bunda</label>
                    <textarea
                      rows={3}
                      placeholder="Bagikan ulasan jujur Bunda tentang pijatan terapis, kebersihan kolam, ramahnya staf, dll..."
                      className="input-glass resize-none py-2.5"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="btn-primary py-3 w-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-pink-100 hover:shadow"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Mengirim Ulasan...
                      </>
                    ) : (
                      "Kirim Ulasan Sekarang"
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </div>

        {/* QRIS / Upload Proof Area (1 Column) */}
        <div className="md:col-span-1 print:hidden">
          {booking.status === "pending" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-6 border-pink-100 flex flex-col gap-6"
            >
              <div className="text-center">
                <h3 className="font-extrabold text-slate-800 text-lg">Metode Pembayaran QRIS</h3>
                <p className="text-slate-400 text-xs mt-1">Scan kode QRIS resmi Mayesha</p>
              </div>

              {/* Countdown Alert */}
              {timeLeft && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <Clock size={14} className="animate-pulse" /> Selesaikan dalam: {timeLeft}
                </div>
              )}

              {/* QR Image Simulation */}
              <div className="w-full aspect-square bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 relative flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=qris-booking-pay-${booking.booking_code}`}
                  alt="Official QRIS Mayesha"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-center text-sm font-semibold text-slate-700">
                Total Tagihan:{" "}
                <span className="font-extrabold text-pink-600 block text-lg mt-0.5">
                  Rp {booking.total_price.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUpload} className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                <div className="relative">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Upload Bukti Transfer
                  </label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-pink-300 rounded-2xl p-4 transition-colors relative cursor-pointer group bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                    {filePreview ? (
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-200">
                        <img src={filePreview} alt="Preview Bukti" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-2 group-hover:text-pink-500 transition-colors">
                        <Upload size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Pilih Gambar</span>
                        <span className="text-[10px] text-slate-400">(Max 2MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="btn-primary py-2.5 w-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-pink-100"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Mengupload...
                    </>
                  ) : (
                    "Kirim Bukti Pembayaran"
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* If already uploaded, show preview of proof */}
          {booking.status !== "pending" && booking.payment_proof_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-6 border-slate-100 flex flex-col gap-4"
            >
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileImage size={16} className="text-pink-500" /> Bukti Pembayaran Anda
              </h3>
              <div className="w-full aspect-[3/4] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-2">
                <img
                  src={
                    booking.payment_proof_url.startsWith("http")
                      ? booking.payment_proof_url
                      : `http://localhost:8000${booking.payment_proof_url}`
                  }
                  alt="Bukti Transfer QRIS"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Customer Reschedule Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {rescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRescheduleModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-md p-6 relative z-10 border border-white/80 shadow-2xl flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Ubah Jadwal Sesi Spa 🌸</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pilih tanggal dan jam kedatangan yang baru</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCustomerReschedule} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Pilih Tanggal Baru</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    className="input-glass w-full"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase block">Pilih Jam Baru</label>
                    {isLoadingSlots && (
                      <span className="flex items-center gap-1 text-[10px] text-pink-500 font-medium">
                        <Loader2 size={11} className="animate-spin" /> Memeriksa slot...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00"].map((t) => {
                      const slotInfo = slotAvailability?.slots[t];
                      const isFull = slotInfo?.is_full ?? false;
                      const isLimited = slotInfo?.available === 1;
                      const isSelected = rescheduleTime === t;

                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={isFull}
                          onClick={() => !isFull && setRescheduleTime(t)}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${isFull
                              ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                              : isSelected
                                ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100"
                                : isLimited
                                  ? "bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-400 cursor-pointer"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-pink-300 cursor-pointer"
                            }`}
                        >
                          <span>{t} WIB</span>
                          {isFull && <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Penuh</span>}
                          {isLimited && !isSelected && <span className="text-[8px] uppercase tracking-wider text-amber-600 font-bold">Sisa 1</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Alasan / Catatan (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="Misal: Si kecil baru imunisasi, mohon diundur..."
                    className="input-glass w-full resize-none py-2"
                    value={rescheduleNotes}
                    onChange={(e) => setRescheduleNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleModal(false)}
                    className="px-5 py-2.5 font-semibold text-sm text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isRescheduling}
                    className="btn-primary px-5 py-2.5 font-semibold text-sm shadow-md shadow-pink-100 flex items-center gap-2 cursor-pointer"
                  >
                    {isRescheduling ? (
                      <><Loader2 size={15} className="animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Calendar size={15} /> Simpan Jadwal Baru</>
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