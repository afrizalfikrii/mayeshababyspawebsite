import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  MapPin,
  Loader2,
  FileImage,
  Upload,
  Printer,
  X,
} from "lucide-react";
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

const GPS_PREFIX_REGEX = /\n?(?:\u{1F4CD}\s*)?Titik GPS:\s*https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/gu;

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

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      toast.success("Terima kasih. Ulasan Anda berhasil disimpan.");
      setComment("");
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
        // Silent catch
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
      toast.success("Jadwal reservasi berhasil diperbarui.");
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
        setTimeLeft("00:00");
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
      toast.success("Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.");
      setSelectedFile(null);
      setFilePreview(null);
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengunggah bukti pembayaran.");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const config: Record<string, { textClass: string; label: string; desc: string }> = {
      pending: {
        textClass: "text-[var(--text)] font-semibold",
        label: "Menunggu Pembayaran",
        desc: "Silakan pindai kode QRIS dan unggah bukti pembayaran sebelum batas waktu berakhir.",
      },
      waiting_verification: {
        textClass: "text-[var(--text-muted)] font-semibold",
        label: "Menunggu Verifikasi",
        desc: "Bukti transfer telah diterima. Admin sedang memverifikasi pembayaran Anda.",
      },
      confirmed: {
        textClass: "text-[var(--accent)] font-semibold",
        label: "Dikonfirmasi",
        desc: "Pembayaran telah terverifikasi. Silakan hadir sesuai jadwal yang dipilih.",
      },
      cancelled: {
        textClass: "text-[var(--text-muted)] font-medium",
        label: "Dibatalkan",
        desc: "Reservasi dibatalkan karena melewati batas waktu pembayaran atau verifikasi tidak sesuai.",
      },
      completed: {
        textClass: "text-[var(--sage)] font-semibold",
        label: "Selesai",
        desc: "Sesi perawatan telah selesai dilaksanakan.",
      },
    };
    return config[status] || { textClass: "text-[var(--text-muted)] font-medium", label: status, desc: "" };
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={26} className="animate-spin text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] text-[14px]">Memuat rincian reservasi...</p>
      </div>
    );
  }

  if (!booking) return null;

  const status = getStatusDisplay(booking.status);
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6 print:hidden">
        <Link
          to="/dashboard"
          className="text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150"
        >
          Kembali ke Akun Saya
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="card-surface p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[var(--border)] pb-5 mb-5">
              <div>
                <span className="overline-label block mb-1">RINCIAN RESERVASI</span>
                <h2 className="text-[28px] leading-[36px] font-editorial text-[var(--text)]">
                  Detail Reservasi
                </h2>
                <p className="text-[var(--text-muted)] text-[13px] mt-1">
                  Kode:{" "}
                  <span className="booking-code font-medium text-[var(--text)]">
                    {booking.booking_code}
                  </span>
                </p>
              </div>
              <div className="text-left sm:text-right text-[14px]">
                <span className={status.textClass}>{status.label}</span>
                {booking.is_rescheduled && (
                  <span className="block text-[12px] text-[var(--text-muted)] mt-0.5">
                    Dijadwalkan ulang
                  </span>
                )}
              </div>
            </div>

            {status.desc && (
              <div className="p-4 bg-[var(--fill-subtle)] rounded-[8px] border border-[var(--border)] text-[13px] leading-[20px] text-[var(--text)] mb-6">
                {status.desc}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <span className="overline-label block mb-3">INFORMASI SESI</span>
                <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)] text-[14px]">
                  <div className="py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Tanggal</span>
                    <span className="font-medium text-[var(--text)] tabular-nums text-right">
                      {booking.reservation_date
                        ? new Date(booking.reservation_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>

                  <div className="py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Jam Sesi</span>
                    <span className="font-medium text-[var(--text)] tabular-nums text-right">
                      {booking.start_time ? booking.start_time.substring(0, 5) : "-"} WIB
                    </span>
                  </div>

                  <div className="py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Layanan</span>
                    <span className="font-semibold text-[var(--text)] text-right">
                      {booking.service?.name ?? "-"}
                    </span>
                  </div>

                  <div className="py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Durasi</span>
                    <span className="font-medium text-[var(--text)] tabular-nums text-right">
                      {booking.service?.duration_minutes ?? 0} menit
                    </span>
                  </div>

                  <div className="py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Terapis</span>
                    <span className="font-medium text-[var(--text)] text-right">
                      {booking.therapist?.name || "Otomatis"}
                    </span>
                  </div>

                  <div className="py-3 flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Total Biaya</span>
                    <span
                      className={`tabular-nums text-right ${
                        isCancelled
                          ? "text-[var(--text-muted)] line-through"
                          : "font-semibold text-[var(--accent)]"
                      }`}
                    >
                      Rp {Number(booking.total_price).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <span className="overline-label block mb-3">PESERTA &amp; LOKASI</span>
                  <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)] text-[14px]">
                    <div className="py-3 flex items-baseline justify-between gap-3">
                      <span className="text-[var(--text-muted)]">Nama Anak / Peserta</span>
                      <span className="font-medium text-[var(--text)] text-right">
                        {booking.baby_name ?? "-"}
                      </span>
                    </div>
                    <div className="py-3 flex items-baseline justify-between gap-3">
                      <span className="text-[var(--text-muted)]">Usia</span>
                      <span className="font-medium text-[var(--text)] tabular-nums text-right">
                        {booking.baby_age != null ? `${booking.baby_age} bulan` : "-"}
                      </span>
                    </div>
                    <div className="py-3 flex items-baseline justify-between gap-3">
                      <span className="text-[var(--text-muted)]">Lokasi</span>
                      <span className="font-medium text-[var(--text)] text-right">
                        {booking.delivery_address ? "Kunjungan Rumah" : "Studio Mayesha"}
                      </span>
                    </div>
                  </div>
                </div>

                {booking.delivery_address && (
                  <div className="p-3.5 bg-[#FAF7F4] rounded-[8px] border border-[var(--border)] text-[13px] leading-[20px]">
                    <span className="font-semibold text-[var(--text)] flex items-center gap-1.5 mb-1">
                      <MapPin size={14} className="text-[var(--text-muted)] shrink-0" />
                      Alamat Kunjungan
                    </span>
                    {booking.delivery_address.includes("https://maps.google.com") ? (
                      <div className="space-y-2">
                        <p className="text-[var(--text-muted)] break-words">
                          {booking.delivery_address.replace(GPS_PREFIX_REGEX, "").trim() ||
                            "Koordinat GPS terlampir."}
                        </p>
                        {booking.delivery_address
                          .match(/https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g)
                          ?.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block font-semibold text-[var(--text)] underline underline-offset-4"
                            >
                              Buka Lokasi di Google Maps
                            </a>
                          ))}
                      </div>
                    ) : (
                      <p className="text-[var(--text-muted)] break-words">{booking.delivery_address}</p>
                    )}
                  </div>
                )}

                <div>
                  <span className="overline-label block mb-1.5">CATATAN</span>
                  <p className="text-[13px] leading-[20px] text-[var(--text-muted)]">
                    {booking.notes ? booking.notes : "Tidak ada catatan tambahan."}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6 mt-8 flex flex-wrap gap-3 items-center print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary"
              >
                <Printer size={16} className="text-[var(--text-muted)]" />
                Cetak Bukti Reservasi
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
                  className="btn-secondary"
                >
                  Ubah Jadwal
                </button>
              )}
            </div>
          </div>

          {booking.status === "completed" && (
            <div className="card-surface p-6 sm:p-8 flex flex-col gap-5 print:hidden">
              <div>
                <span className="overline-label block mb-1">ULASAN LAYANAN</span>
                <h3 className="text-[20px] leading-[28px] font-semibold text-[var(--text)]">
                  Penilaian Sesi Perawatan
                </h3>
                <p className="text-[14px] text-[var(--text-muted)] mt-0.5">
                  Bagikan pengalaman perawatan Anda sebagai masukan bagi pelayanan studio.
                </p>
              </div>

              {booking.review ? (
                <div className="p-4 bg-[#FAF7F4] rounded-[8px] border border-[var(--border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="overline-label">ULASAN TERSIMPAN</span>
                    <span className="text-[13px] font-semibold text-[var(--accent)] tabular-nums">
                      Nilai {booking.review.rating}/5
                    </span>
                  </div>
                  <p className="text-[14px] leading-[22px] text-[var(--text)]">
                    &ldquo;{booking.review.comment || "Tanpa catatan tertulis."}&rdquo;
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendReview} className="flex flex-col gap-4">
                  <div>
                    <label className="overline-label block mb-2">Skala Kepuasan (1–5)</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const isChosen = rating === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setRating(score)}
                            className={`w-11 h-11 rounded-[8px] text-[15px] tabular-nums transition-colors duration-150 cursor-pointer ${
                              isChosen
                                ? "bg-[#FAF7F4] border-[1.5px] border-[var(--text)] text-[var(--text)] font-semibold"
                                : "bg-[#FFFFFF] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text)] font-medium"
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="overline-label block mb-2">Catatan Ulasan</label>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan kesan mengenai ketepatan jadwal, kenyamanan ruang, atau pelayanan terapis"
                      className="input-field resize-none py-2.5"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="btn-primary self-start"
                  >
                    {isSubmittingReview && <Loader2 size={16} className="animate-spin" />}
                    {isSubmittingReview ? "Menyimpan..." : "Simpan Ulasan"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-1 print:hidden">
          {booking.status === "pending" && (
            <div className="card-surface p-6 flex flex-col gap-5">
              <div>
                <span className="overline-label block mb-1">PEMBAYARAN</span>
                <h3 className="text-[18px] leading-[26px] font-semibold text-[var(--text)]">
                  Pembayaran QRIS
                </h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                  Pindai kode QRIS resmi Mayesha Baby Spa di bawah ini.
                </p>
              </div>

              {timeLeft && (
                <div className="p-3 bg-[var(--fill-subtle)] border border-[var(--border)] rounded-[8px] flex items-center justify-between text-[13px]">
                  <span className="text-[var(--text-muted)]">Batas waktu</span>
                  <span className="font-semibold text-[var(--text)] tabular-nums">{timeLeft}</span>
                </div>
              )}

              <div className="bg-[#FFFFFF] border border-[var(--border)] rounded-[12px] p-5 flex flex-col items-center gap-4">
                <img
                  src="/qris-logo.png"
                  alt="QRIS"
                  className="h-9 w-auto object-contain"
                />

                <div className="w-full aspect-square max-w-[200px] bg-[#FFFFFF] p-2.5 border border-[var(--border)] rounded-[8px] flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=qris-mayesha-${booking.booking_code}`}
                    alt="Kode QRIS Mayesha Baby Spa"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="flex items-baseline justify-between py-3 border-t border-b border-[var(--border)]">
                <span className="text-[13px] text-[var(--text-muted)]">Total Tagihan</span>
                <span className="text-[18px] font-semibold text-[var(--accent)] tabular-nums">
                  Rp {Number(booking.total_price).toLocaleString("id-ID")}
                </span>
              </div>

              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div>
                  <label className="overline-label block mb-2">Unggah Bukti Transfer</label>
                  <div className="flex flex-col items-center justify-center border border-dashed border-[var(--border)] hover:border-[var(--text)] rounded-[8px] p-4 transition-colors duration-150 relative cursor-pointer bg-[#FAF7F4]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                    {filePreview ? (
                      <div className="w-full aspect-video rounded-[8px] overflow-hidden border border-[var(--border)] bg-[#FFFFFF]">
                        <img src={filePreview} alt="Pratinjau bukti pembayaran" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="text-[var(--text-muted)] flex flex-col items-center gap-1.5 py-2">
                        <Upload size={20} />
                        <span className="text-[13px] font-medium text-[var(--text)]">Pilih Gambar Bukti</span>
                        <span className="text-[12px] text-[var(--text-muted)]">Format JPG/PNG, maks. 2MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="btn-primary w-full"
                >
                  {isUploading && <Loader2 size={16} className="animate-spin" />}
                  {isUploading ? "Mengunggah..." : "Kirim Bukti Pembayaran"}
                </button>
              </form>
            </div>
          )}

          {booking.status !== "pending" && booking.payment_proof_url && (
            <div className="card-surface p-6 flex flex-col gap-4">
              <span className="overline-label">BUKTI PEMBAYARAN</span>
              <div className="w-full aspect-[3/4] bg-[#FAF7F4] border border-[var(--border)] rounded-[8px] overflow-hidden p-2 flex items-center justify-center">
                {imageError ? (
                  <div className="text-center p-4 flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <FileImage size={28} />
                    <p className="text-[13px] font-medium text-[var(--text)]">Gambar bukti tidak dapat dimuat</p>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Berkas bukti pembayaran pada penyimpanan tidak ditemukan.
                    </p>
                  </div>
                ) : (
                  <img
                    src={getStorageUrl(booking.payment_proof_url)}
                    alt="Bukti Transfer QRIS"
                    className="w-full h-full object-cover rounded-[8px]"
                    onError={() => setImageError(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setRescheduleModal(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="card-surface w-full max-w-md p-6 relative z-10 flex flex-col gap-5">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-[18px] font-semibold text-[var(--text)]">Ubah Jadwal Sesi</h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                  Pilih tanggal dan jam kedatangan yang baru.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModal(false)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[8px] hover:bg-[var(--fill-subtle)] transition-colors duration-150 cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCustomerReschedule} className="flex flex-col gap-4">
              <div>
                <label className="overline-label block mb-1.5">Tanggal Baru</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="input-field tabular-nums"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="overline-label block">Jam Baru</label>
                  {isLoadingSlots && (
                    <span className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                      <Loader2 size={12} className="animate-spin" /> Memeriksa slot...
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
                        className={`py-2 px-3 rounded-[8px] text-[13px] tabular-nums transition-colors duration-150 flex flex-col items-center justify-center ${
                          isFull
                            ? "bg-[#FFFFFF] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "bg-[#FAF7F4] border-[1.5px] border-[var(--text)] text-[var(--text)] font-semibold cursor-pointer"
                              : "bg-[#FFFFFF] border border-[var(--border)] text-[var(--text)] hover:border-[var(--text-muted)] font-medium cursor-pointer"
                        }`}
                      >
                        <span>{t} WIB</span>
                        {isPast ? (
                          <span className="text-[10px] text-[var(--text-muted)]">Lewat</span>
                        ) : isFull ? (
                          <span className="text-[10px] text-[var(--text-muted)]">Penuh</span>
                        ) : isLimited ? (
                          <span className="text-[10px] text-[var(--accent)]">Sisa 1 slot</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="overline-label block mb-1.5">Catatan Perubahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Penyesuaian jadwal imunisasi anak"
                  className="input-field resize-none py-2"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRescheduling}
                  className="btn-primary"
                >
                  {isRescheduling && <Loader2 size={15} className="animate-spin" />}
                  {isRescheduling ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
