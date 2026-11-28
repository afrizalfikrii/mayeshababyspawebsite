import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { generateQrMatrix } from "@/utils/qrGenerator";
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
import { getStorageUrl } from "@/lib/axios";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [imageError, setImageError] = useState(false);

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
      toast.success("Jadwal reservasi berhasil diubah.");
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
        bg: "bg-[#F9EBEF] text-[#9F285B] border-[#E8DFD8]",
        text: "text-[#9F285B]",
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
        bg: "bg-[#F7F3EE] text-[#6E5D58] border-[#E8DFD8]",
        text: "text-[#6E5D58]",
        label: "Selesai Sesi",
        desc: "Sesi spa si Kecil telah selesai dilakukan. Terima kasih atas kunjungan Anda!",
      },
    };
    return config[status] || { bg: "bg-[#F4EFE8] text-[#6E5D58] border-[#E8DFD8]", text: "text-[#6E5D58]", label: status, desc: "" };
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-[#BE346E]" />
        <p className="text-[#6E5D58] text-sm font-semibold">Mengambil data reservasi...</p>
      </div>
    );
  }

  if (!booking) return null;

  const status = getStatusDisplay(booking.status);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-[#6E5D58] hover:text-[#BE346E] mb-6 transition-colors font-semibold text-sm print:hidden"
      >
        <ArrowLeft size={16} /> Balik ke Ruang Bunda
      </Link>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Detail Info (2 Columns) */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8DFD8] pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-[#3A2622] tracking-tight">Detail Reservasi</h1>
                <p className="text-[#6E5D58] text-xs font-mono mt-1">ID Booking: {booking.booking_code}</p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${status.bg}`}>
                {status.label}
              </div>
            </div>

            <p className="text-[#6E5D58] text-sm mb-6 bg-[#F7F3EE] p-4 rounded-xl border border-[#E8DFD8] font-medium">
              {status.desc}
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              {/* Sesi Info */}
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-[#3A2622] flex items-center gap-2 text-sm uppercase tracking-wider text-[#6E5D58]">
                  <Calendar className="text-[#BE346E]" size={16} /> Info Sesi Spa
                </h3>
                <div className="bg-[#F7F3EE] p-5 rounded-2xl border border-[#E8DFD8] flex flex-col gap-3.5 text-sm shadow-xs">
                  {/* Tanggal Sesi */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Tanggal</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right whitespace-nowrap tabular-nums">
                      {booking.reservation_date
                        ? new Date(booking.reservation_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>

                  {/* Jam Kedatangan */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Jam</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right whitespace-nowrap tabular-nums">
                      {booking.start_time ? booking.start_time.substring(0, 5) : "-"} WIB
                    </span>
                  </div>

                  {/* Layanan */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Layanan</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right leading-snug">
                      {booking.service?.name ?? "-"}
                    </span>
                  </div>

                  {/* Durasi */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Durasi</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right whitespace-nowrap tabular-nums">
                      {booking.service?.duration_minutes ?? 0} Menit
                    </span>
                  </div>

                  {/* Terapis */}
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Terapis</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right leading-snug">
                      {booking.therapist?.name || "Otomatis / Belum Ditentukan"}
                    </span>
                  </div>

                  {/* Lokasi */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[#6E5D58] font-medium text-xs shrink-0">Lokasi</span>
                      <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right leading-snug">
                        {booking.delivery_address ? "Home Care (Kunjungan Rumah)" : "Studio Mayesha Baby Spa"}
                      </span>
                    </div>

                    {booking.delivery_address && (
                      <div className="mt-2 p-3.5 bg-white rounded-xl border border-[#E8DFD8] text-xs text-[#6E5D58] leading-relaxed shadow-xs break-words">
                        <span className="font-bold text-[#3A2622] flex items-center gap-1.5 mb-1.5">
                          <MapPin size={13} className="text-[#BE346E] shrink-0" />
                          Detail Alamat Kunjungan:
                        </span>
                        {booking.delivery_address.includes("https://maps.google.com") ? (
                          <div className="space-y-2 mt-1">
                            <p>{booking.delivery_address.replace(/\n?📍 Titik GPS: https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g, "").trim() || "Titik GPS telah disematkan."}</p>
                            {booking.delivery_address.match(/https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g)?.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm active:scale-95"
                              >
                                📍 Buka Rute di Google Maps →
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-0.5">{booking.delivery_address}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bayi Info */}
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-[#3A2622] flex items-center gap-2 text-sm uppercase tracking-wider text-[#6E5D58]">
                  <User className="text-[#BE346E]" size={16} /> Profil Si Kecil
                </h3>
                <div className="bg-[#F7F3EE] p-5 rounded-2xl border border-[#E8DFD8] flex flex-col gap-3.5 text-sm h-full">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Nama Panggilan</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right">
                      {booking.baby_name ?? "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E8DFD8]">
                    <span className="text-[#6E5D58] font-medium text-xs shrink-0">Usia Bayi</span>
                    <span className="font-bold text-[#3A2622] text-xs sm:text-sm text-right whitespace-nowrap tabular-nums">
                      {booking.baby_age != null ? `${booking.baby_age} Bulan` : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[#6E5D58] font-medium text-xs">Catatan / Pesan</span>
                    <p className="text-xs sm:text-sm text-[#3A2622] italic leading-relaxed">
                      {booking.notes ? `"${booking.notes}"` : "Tidak ada catatan khusus."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar (Print & Reschedule) */}
            <div className="border-t border-[#E8DFD8] pt-6 mt-8 flex flex-col sm:flex-row gap-3 justify-start items-center print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 font-bold text-sm text-[#6E5D58] hover:text-[#BE346E] border border-[#E8DFD8] hover:border-[#BE346E] rounded-xl flex items-center gap-2 transition-all cursor-pointer w-full sm:w-auto justify-center bg-white"
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
              className="glass-panel p-8 border-[#E8DFD8] flex flex-col gap-6"
            >
              <div>
                <h3 className="text-lg font-extrabold text-[#3A2622] flex items-center gap-2">
                  <Sparkles className="text-[#BE346E]" size={18} /> Berikan Ulasan & Rating
                </h3>
                <p className="text-[#6E5D58] text-xs mt-1">Bagaimana pengalaman Bunda dan si Kecil selama sesi spa?</p>
              </div>

              {booking.review ? (
                // Already Reviewed
                <div className="bg-[#F7F3EE] p-5 rounded-2xl border border-[#E8DFD8] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6E5D58] font-bold uppercase tracking-wider">Ulasan Anda</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={16}
                          className={idx < booking.review!.rating ? "text-amber-400 fill-amber-400" : "text-[#FAF7F2]"}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[#3A2622] text-sm font-semibold italic">
                    &quot;{booking.review.comment || "Bunda tidak menulis komentar."}&quot;
                  </p>
                  <p className="text-[10px] text-[#6E5D58] font-medium">Ulasan Anda membantu kami untuk terus meningkatkan layanan spa.</p>
                </div>
              ) : (
                // Form to Submit Review
                <form onSubmit={handleSendReview} className="flex flex-col gap-5">
                  <div className="flex flex-col items-center gap-2 bg-[#FAF7F2] py-4 rounded-2xl border border-[#E8DFD8]">
                    <span className="text-xs font-bold text-[#6E5D58] uppercase tracking-wider">Pilih Rating Bintang</span>
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
                                : "text-[#D7C9BE] hover:text-amber-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#6E5D58] uppercase tracking-wider block mb-2">Komentar Bunda</label>
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
                    className="btn-primary py-3 w-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-none hover:shadow"
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
              className="glass-panel p-6 border-[#E8DFD8] flex flex-col gap-6"
            >
              <div className="text-center">
                <h3 className="font-extrabold text-[#3A2622] text-lg">Metode Pembayaran QRIS</h3>
                <p className="text-[#6E5D58] text-xs mt-1">Scan kode QRIS resmi Mayesha</p>
              </div>

              {/* Countdown Alert */}
              {timeLeft && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <Clock size={14} className="animate-pulse" /> Selesaikan dalam: {timeLeft}
                </div>
              )}

              {/* Generated QRIS Barcode Card */}
              <div className="bg-white border border-[#E8DFD8] rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
                <img
                  src="/qris-logo.png"
                  alt="QRIS"
                  className="h-7 w-auto object-contain"
                />
                {(() => {
                  const qrPayload = `MAYESHA-QRIS|${booking.booking_code}|${booking.total_price}`;
                  const qr = generateQrMatrix(qrPayload);
                  return (
                    <div className="p-3 bg-white border border-[#E8DFD8] rounded-xl">
                      <svg
                        viewBox={`0 0 ${qr.size} ${qr.size}`}
                        className="w-40 h-40 text-[#3A2622]"
                        shapeRendering="crispEdges"
                        role="img"
                        aria-label={`Kode QRIS untuk ${booking.booking_code}`}
                      >
                        <rect width={qr.size} height={qr.size} fill="#FFFFFF" />
                        {qr.modules.map((dark, idx) =>
                          dark ? (
                            <rect
                              key={idx}
                              x={idx % qr.size}
                              y={Math.floor(idx / qr.size)}
                              width={1}
                              height={1}
                              fill="currentColor"
                            />
                          ) : null
                        )}
                      </svg>
                    </div>
                  );
                })()}
                <div className="w-full pt-2 border-t border-[#E8DFD8]">
                  <span className="text-[11px] font-semibold text-[#3A2622] block">
                    Mayesha Baby Spa · Karanganyar
                  </span>
                  <span className="text-[11px] font-mono text-[#6E5D58] break-all">
                    {booking.booking_code}
                  </span>
                </div>
              </div>

              <div className="text-center text-sm font-semibold text-[#3A2622]">
                Total Tagihan:{" "}
                <span className="font-extrabold text-[#BE346E] block text-lg mt-0.5 tabular-nums">
                  Rp {booking.total_price.toLocaleString("id-ID")}
                </span>
                <span className="text-[11px] font-normal text-[#6E5D58] block mt-1">
                  Bisa lunas atau DP 50% (Rp {Math.ceil(booking.total_price * 0.5).toLocaleString("id-ID")})
                </span>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUpload} className="flex flex-col gap-4 border-t border-[#E8DFD8] pt-4">
                <div className="relative">
                  <label className="text-xs font-bold text-[#6E5D58] uppercase tracking-wider block mb-2">
                    Upload Bukti Transfer
                  </label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#E8DFD8] hover:border-[#D7C9BE] rounded-2xl p-4 transition-colors relative cursor-pointer group bg-[#FAF7F2]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                    {filePreview ? (
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-[#E8DFD8]">
                        <img src={filePreview} alt="Preview Bukti" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="text-[#6E5D58] flex flex-col items-center gap-2 group-hover:text-[#BE346E] transition-colors">
                        <Upload size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Pilih Gambar</span>
                        <span className="text-[10px] text-[#6E5D58]">(Max 2MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="btn-primary py-2.5 w-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-none"
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
              className="glass-panel p-6 border-[#E8DFD8] flex flex-col gap-4"
            >
              <h3 className="font-bold text-[#3A2622] text-sm uppercase tracking-wider text-[#6E5D58] flex items-center gap-1.5">
                <FileImage size={16} className="text-[#BE346E]" /> Bukti Pembayaran Anda
              </h3>
              <div className="w-full aspect-[3/4] bg-[#F7F3EE] border border-[#E8DFD8] rounded-2xl overflow-hidden p-2 relative flex items-center justify-center">
                {imageError ? (
                  <div className="text-center p-4 flex flex-col items-center gap-2 text-[#6E5D58]">
                    <FileImage size={36} className="text-[#D7C9BE]" />
                    <p className="text-xs font-medium text-[#6E5D58]">File bukti tidak dapat dimuat</p>
                    <p className="text-[11px] text-[#6E5D58]">
                      Foto pada server sementara mungkin telah terhapus saat redeploy.
                    </p>
                  </div>
                ) : (
                  <img
                    src={getStorageUrl(booking.payment_proof_url)}
                    alt="Bukti Transfer QRIS"
                    className="w-full h-full object-cover rounded-xl"
                    onError={() => setImageError(true)}
                  />
                )}
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
              className="absolute inset-0 bg-[#3A2622]/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-md p-6 relative z-10 border border-white/80 shadow-2xl flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#3A2622]">Ubah Jadwal Sesi Spa 🌸</h3>
                  <p className="text-xs text-[#6E5D58] mt-0.5">Pilih tanggal dan jam kedatangan yang baru</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleModal(false)}
                  className="p-1 text-[#6E5D58] hover:text-[#6E5D58] rounded-full hover:bg-[#F4EFE8] transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCustomerReschedule} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-[#6E5D58] uppercase block mb-1.5">Pilih Tanggal Baru</label>
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
                    <label className="text-xs font-bold text-[#6E5D58] uppercase block">Pilih Jam Baru</label>
                    {isLoadingSlots && (
                      <span className="flex items-center gap-1 text-[10px] text-[#BE346E] font-medium">
                        <Loader2 size={11} className="animate-spin" /> Memeriksa slot...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00"].map((t) => {
                      const slotInfo = slotAvailability?.slots[t];
                      const isPast = slotInfo?.is_past ?? false;
                      const isFull = (slotInfo?.is_full ?? false) || isPast;
                      const isLimited = slotInfo?.available === 1;
                      const isSelected = rescheduleTime === t;

                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={isFull}
                          onClick={() => !isFull && setRescheduleTime(t)}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${isFull
                              ? "bg-[#F4EFE8] border-[#E8DFD8] text-[#D7C9BE] cursor-not-allowed opacity-60"
                              : isSelected
                                ? "bg-[#BE346E] text-white border-[#BE346E] shadow-md shadow-none"
                                : isLimited
                                  ? "bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-400 cursor-pointer"
                                  : "bg-white border-[#E8DFD8] text-[#3A2622] hover:border-[#D7C9BE] cursor-pointer"
                            }`}
                        >
                          <span>{t} WIB</span>
                          {isPast ? (
                            <span className="text-[8px] uppercase tracking-wider text-[#6E5D58] font-bold">Lewat</span>
                          ) : isFull ? (
                            <span className="text-[8px] uppercase tracking-wider text-[#6E5D58] font-bold">Penuh</span>
                          ) : isLimited && !isSelected ? (
                            <span className="text-[8px] uppercase tracking-wider text-amber-600 font-bold">Sisa 1</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#6E5D58] uppercase block mb-1.5">Alasan / Catatan (Opsional)</label>
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
                    className="px-5 py-2.5 font-semibold text-sm text-[#6E5D58] hover:bg-[#F7F3EE] border border-[#E8DFD8] rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isRescheduling}
                    className="btn-primary px-5 py-2.5 font-semibold text-sm shadow-md shadow-none flex items-center gap-2 cursor-pointer"
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