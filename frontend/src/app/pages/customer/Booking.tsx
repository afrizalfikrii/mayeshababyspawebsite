import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { getServices, getTherapists } from "@/services/service.service";
import { createReservation, getSlotAvailability } from "@/services/reservation.service";
import { getBabies, createBaby } from "@/services/baby.service";
import { useAuth } from "@/context/AuthContext";
import type { Service, Therapist, Baby, SlotAvailability } from "@/types/api.types";
import BookingStepper, { BOOKING_STEPS } from "@/app/components/BookingStepper";

const TIME_SLOTS = ["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00"];
const GPS_PREFIX_REGEX = /\n?(?:\u{1F4CD}\s*)?Titik GPS:\s*https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/gu;

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const getServiceClassification = (s: Service): "Bayi" | "Anak" | "Ibu" => {
    if (s.category === "mom_treatment" || (s.age_min_months !== null && s.age_min_months >= 216)) {
      return "Ibu";
    }
    if (
      (s.age_min_months !== null && s.age_min_months >= 13) ||
      /kids|anak|1-3th|3-4th/i.test(s.name)
    ) {
      return "Anak";
    }
    return "Bayi";
  };

  const filteredBookingServices = services.filter((s) =>
    segmentFilter === "all" ? true : getServiceClassification(s) === segmentFilter
  );

  const [formData, setFormData] = useState({
    serviceId: 0,
    date: "",
    time: "",
    babyName: "",
    babyAge: "",
    notes: "",
    therapistId: "",
    babyId: "",
    deliveryAddress: "",
  });

  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [babies, setBabies] = useState<Baby[]>([]);
  const [, setIsLoadingBabies] = useState(true);
  const [babyProfileMode, setBabyProfileMode] = useState<"select" | "manual" | "create">("select");
  const [newBabyData, setNewBabyData] = useState({ name: "", birthDate: "", notes: "" });
  const [isCreatingBaby, setIsCreatingBaby] = useState(false);

  const calculateAgeInMonths = (birthDateString: string) => {
    const birth = new Date(birthDateString);
    const today = new Date();
    const yearsDiff = today.getFullYear() - birth.getFullYear();
    const monthsDiff = today.getMonth() - birth.getMonth();
    const total = yearsDiff * 12 + monthsDiff;
    return Math.max(0, total);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [servicesData, therapistsData, babiesData] = await Promise.all([
          getServices(),
          getTherapists(),
          getBabies(),
        ]);
        setServices(servicesData);
        setTherapists(therapistsData);
        setBabies(babiesData);

        const preselectedId = parseInt(searchParams.get("service_id") ?? "0");
        const defaultService =
          preselectedId && servicesData.find((s) => s.id === preselectedId)
            ? preselectedId
            : servicesData[0]?.id ?? 0;
        setFormData((prev) => ({ ...prev, serviceId: defaultService, deliveryAddress: user?.address ?? "" }));
        if (babiesData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            babyId: String(babiesData[0].id),
            babyName: babiesData[0].name,
            babyAge: String(calculateAgeInMonths(babiesData[0].birth_date)),
            notes: babiesData[0].notes || "",
            deliveryAddress: user?.address ?? "",
          }));
          setBabyProfileMode("select");
        } else {
          setBabyProfileMode("manual");
        }
      } catch {
        toast.error("Gagal mengambil data layanan. Silakan muat ulang halaman.");
      } finally {
        setIsLoadingServices(false);
        setIsLoadingBabies(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!formData.date || !formData.serviceId || step !== 2) return;

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setSlotAvailability(null);
      try {
        const data = await getSlotAvailability(formData.date, formData.serviceId);
        setSlotAvailability(data);
        if (formData.time && data.slots[formData.time]?.is_full) {
          setFormData((prev) => ({ ...prev, time: "" }));
        }
      } catch {
        // Silent fallback
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [formData.date, formData.serviceId, step]);

  const isSlotPast = (time: string): boolean => {
    if (!formData.date) return false;
    if (slotAvailability?.slots[time]?.is_past) return true;

    const [year, month, day] = formData.date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const slotDate = new Date(year, month - 1, day, hours, minutes);
    return slotDate.getTime() <= Date.now();
  };

  const getSlotStatus = (time: string): "available" | "limited" | "full" | "past" | "unknown" => {
    if (isSlotPast(time)) return "past";
    if (!slotAvailability) return "unknown";
    const slot = slotAvailability.slots[time];
    if (!slot) return "unknown";
    if (slot.is_full) return "full";
    if (slot.available === 1) return "limited";
    return "available";
  };

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const isMomTreatment = selectedService?.category === "mom_treatment";

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung fitur deteksi GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

        setFormData((prev) => {
          const baseAddress = prev.deliveryAddress
            ? prev.deliveryAddress.replace(GPS_PREFIX_REGEX, "").trim()
            : "";
          const newAddress = baseAddress
            ? `${baseAddress}\nTitik GPS: ${mapsLink}`
            : `Titik GPS: ${mapsLink}`;

          return { ...prev, deliveryAddress: newAddress };
        });

        toast.success(`Lokasi GPS berhasil diambil (akurasi ±${Math.round(accuracy)}m).`);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Izin lokasi ditolak. Silakan aktifkan izin lokasi di browser Anda.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Sinyal GPS tidak terdeteksi.");
            break;
          case error.TIMEOUT:
            toast.error("Waktu pencarian lokasi GPS habis. Silakan coba lagi.");
            break;
          default:
            toast.error("Gagal mendeteksi lokasi GPS.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleNext = async () => {
    if (step === 1 && !formData.serviceId) return toast.error("Pilih layanan terlebih dahulu.");
    if (step === 2 && !formData.date) return toast.error("Pilih tanggal sesi terlebih dahulu.");
    if (step === 2 && !formData.time) return toast.error("Pilih jam sesi terlebih dahulu.");
    if (step === 3 && babyProfileMode === "manual") {
      const cleanManualName = formData.babyName.trim();
      if (!cleanManualName || !formData.babyAge) return toast.error("Lengkapi nama dan usia anak.");
      if (!/^[a-zA-Z\s'.-]+$/.test(cleanManualName) || !/[a-zA-Z]/.test(cleanManualName)) {
        return toast.error("Nama anak hanya boleh berisi huruf (tidak boleh angka).");
      }
    }
    if (step === 3 && babyProfileMode === "select" && !formData.babyId) {
      return toast.error("Pilih profil anak terlebih dahulu.");
    }

    if (step < 4) {
      if (step === 2 && isMomTreatment) {
        setStep(4);
      } else {
        setStep(step + 1);
      }
    } else {
      setIsSubmitting(true);
      try {
        const booking = await createReservation({
          service_id: formData.serviceId,
          reservation_date: formData.date,
          start_time: formData.time,
          baby_name: !isMomTreatment && babyProfileMode === "manual" ? formData.babyName : undefined,
          baby_age: !isMomTreatment && babyProfileMode === "manual" ? Number(formData.babyAge) : undefined,
          notes: formData.notes || undefined,
          therapist_id: formData.therapistId ? Number(formData.therapistId) : undefined,
          baby_id: !isMomTreatment && babyProfileMode === "select" ? Number(formData.babyId) : undefined,
          delivery_address: formData.deliveryAddress || undefined,
        });
        toast.success("Reservasi berhasil dibuat. Silakan selesaikan pembayaran.");
        navigate(`/dashboard/reservasi/${booking.id}`);
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Gagal membuat reservasi. Slot mungkin sudah penuh.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCreateBabyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBabyData.name.trim();
    if (!cleanName || !newBabyData.birthDate) {
      toast.error("Nama dan tanggal lahir wajib diisi.");
      return;
    }
    if (!/^[a-zA-Z\s'.-]+$/.test(cleanName) || !/[a-zA-Z]/.test(cleanName)) {
      toast.error("Nama anak hanya boleh berisi huruf (tidak boleh angka).");
      return;
    }
    setIsCreatingBaby(true);
    try {
      const newBaby = await createBaby({
        name: cleanName,
        birth_date: newBabyData.birthDate,
        notes: newBabyData.notes || null,
      });
      toast.success("Profil anak berhasil disimpan.");
      setBabies((prev) => [...prev, newBaby]);
      setFormData((prev) => ({
        ...prev,
        babyId: String(newBaby.id),
        babyName: newBaby.name,
        babyAge: String(calculateAgeInMonths(newBaby.birth_date)),
        notes: newBaby.notes || "",
      }));
      setNewBabyData({ name: "", birthDate: "", notes: "" });
      setBabyProfileMode("select");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mendaftarkan profil anak.");
    } finally {
      setIsCreatingBaby(false);
    }
  };

  const selectedTherapistName = formData.therapistId
    ? therapists.find((t) => String(t.id) === formData.therapistId)?.name ?? "Otomatis"
    : "Otomatis";

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12 pb-[calc(7.5rem+env(safe-area-inset-bottom))] overflow-x-clip">
        <div className="mb-8">
          <h1 className="font-['Playfair_Display',Georgia,serif] font-medium text-[#4A2A1A] text-[28px] leading-[1.2] sm:text-[32px] md:text-[36px] mb-1.5">
            Reservasi sesi
          </h1>
          <p className="text-[15px] leading-[24px] text-[#6B5A52]">
            Pilih layanan, atur jadwal, dan lengkapi data peserta perawatan.
          </p>
        </div>

        <BookingStepper
          currentStep={step}
          skippedSteps={isMomTreatment ? [3] : []}
        />

        {/* Main 2-Column Layout: Form (8 cols) + Sticky Order Summary (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 bg-white border border-black/10 rounded-[12px] p-4 sm:p-8 w-full min-w-0">
            {isLoadingServices ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={24} className="animate-spin text-[#6B5A52]" />
                <p className="text-[#6B5A52] text-[14px]">Memuat daftar layanan...</p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="flex flex-col gap-5 sm:gap-6">
                    <h3 className="text-[20px] leading-[28px] font-semibold text-[#4A2A1A]">
                      Pilih layanan
                    </h3>

                    <div className="p-3.5 sm:p-4 bg-[#FAF6F2] border border-black/10 rounded-[8px]">
                      <p className="text-[14px] leading-[21px] text-[#4A2A1A]">
                        Layanan bayi dan anak untuk usia 0-5 tahun. Pastikan usia anak sesuai rentang layanan.
                      </p>
                    </div>

                    <div className="overflow-x-auto no-scrollbar max-w-full">
                      <div className="flex items-center gap-5 sm:gap-6 border-b border-black/10">
                        {[
                          { id: "all", label: "Semua" },
                          { id: "Bayi", label: "Bayi" },
                          { id: "Anak", label: "Anak" },
                          { id: "Ibu", label: "Ibu" },
                        ].map((tab) => {
                          const isActive = segmentFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setSegmentFilter(tab.id as "all" | "Bayi" | "Anak" | "Ibu")}
                              className={`pb-2.5 text-[15px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer ${
                                isActive
                                  ? "text-[#4A2A1A] font-medium border-[#D4568F]"
                                  : "text-[#6B5A52] font-normal border-transparent hover:text-[#4A2A1A]"
                              }`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {filteredBookingServices.map((s) => {
                        const cls = getServiceClassification(s);
                        const isSelected = formData.serviceId === s.id;
                        return (
                          <label
                            key={s.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-[#C94A83] focus-within:ring-offset-2 ${
                              isSelected
                                ? "bg-[#FFFBF8] border-[1.5px] border-[#C94A83]"
                                : "bg-white border border-black/10 hover:border-black/20"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <input
                                type="radio"
                                name="serviceId"
                                value={s.id}
                                checked={isSelected}
                                onChange={() => setFormData({ ...formData, serviceId: s.id })}
                                className="sr-only"
                              />
                              <span
                                aria-hidden="true"
                                className={`w-[18px] h-[18px] rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-colors duration-150 ${
                                  isSelected
                                    ? "border-[1.5px] border-[#C94A83] bg-white"
                                    : "border border-black/25 bg-white"
                                }`}
                              >
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#C94A83]" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="font-semibold text-[#4A2A1A] text-[15px] leading-[22px] break-words">
                                    {s.name}
                                  </span>
                                  <span className="text-[12px] text-[#6B5A52] shrink-0">
                                    • {cls}
                                  </span>
                                </div>
                                <p className="text-[#6B5A52] text-[13px] leading-[20px] mt-1 max-w-lg line-clamp-2">
                                  {s.description}
                                </p>
                                <p className="text-[13px] leading-[20px] text-[#6B5A52] tabular-nums mt-1.5">
                                  Durasi {s.duration_minutes} menit
                                </p>
                              </div>
                            </div>

                            <span className="font-medium text-[#4A2A1A] text-[16px] leading-[24px] tabular-nums whitespace-nowrap pl-[30px] sm:pl-4 sm:text-right shrink-0">
                              Rp {Number(s.price).toLocaleString("id-ID")}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-6 min-w-0">
                    <h3 className="text-[20px] leading-[28px] font-semibold text-[#4A2A1A]">
                      Atur tanggal dan waktu sesi
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      <div className="w-full min-w-0">
                        <label className="overline-label block mb-2">Tanggal Sesi</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          className="input-field tabular-nums"
                          value={formData.date}
                          onChange={(e) => {
                            setFormData({ ...formData, date: e.target.value, time: "" });
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="overline-label block">Jam Kedatangan</label>
                          {isLoadingSlots && (
                            <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                              <Loader2 size={12} className="animate-spin" /> Memeriksa slot...
                            </span>
                          )}
                        </div>

                        {!formData.date ? (
                          <div className="p-4 bg-[#FAF6F2] rounded-[8px] border border-black/10 text-[#6B5A52] text-[13px] leading-[20px]">
                            Pilih tanggal sesi terlebih dahulu untuk melihat ketersediaan jam.
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2.5">
                              {TIME_SLOTS.map((t) => {
                                const status = getSlotStatus(t);
                                const isPast = status === "past";
                                const isFull = status === "full" || isPast;
                                const isSelected = formData.time === t;
                                const isLimited = status === "limited";

                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    disabled={isFull}
                                    onClick={() => !isFull && setFormData({ ...formData, time: t })}
                                    className={`flex flex-col items-center justify-center py-2.5 px-2 sm:px-3 rounded-[8px] text-[14px] tabular-nums transition-colors duration-150 min-w-0 ${isFull
                                      ? "bg-white border border-black/10 text-[#6B5A52] opacity-50 cursor-not-allowed"
                                      : isSelected
                                        ? "bg-[#FFFBF8] border-[1.5px] border-[#C94A83] text-[#4A2A1A] font-semibold cursor-pointer"
                                        : "bg-white border border-black/10 text-[#4A2A1A] hover:border-black/25 font-medium cursor-pointer"
                                      }`}
                                  >
                                    <span>{t} WIB</span>
                                    {isPast ? (
                                      <span className="text-[11px] text-[#6B5A52] mt-0.5">Lewat</span>
                                    ) : isFull ? (
                                      <span className="text-[11px] text-[#6B5A52] mt-0.5">Penuh</span>
                                    ) : isLimited ? (
                                      <span className="text-[11px] text-[#C94A83] mt-0.5">Sisa 1 slot</span>
                                    ) : (
                                      <span className="text-[11px] text-[#6B5A52] mt-0.5">Tersedia</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <p className="text-[12px] text-[#6B5A52] mt-2.5">
                              Jam operasional setiap hari pukul 08.30–16.30 WIB.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-black/10 pt-6 mt-2">
                      <label className="overline-label block mb-2.5">Pilihan Terapis (Opsional)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <label
                          className={`flex items-center justify-center p-3 rounded-[8px] cursor-pointer text-[13px] transition-colors duration-150 text-center min-w-0 break-words ${!formData.therapistId
                            ? "bg-[#FFFBF8] border-[1.5px] border-[#C94A83] text-[#4A2A1A] font-semibold"
                            : "bg-white border border-black/10 text-[#4A2A1A] hover:border-black/25 font-medium"
                            }`}
                        >
                          <input
                            type="radio"
                            name="therapistId"
                            value=""
                            checked={!formData.therapistId}
                            onChange={() => setFormData({ ...formData, therapistId: "" })}
                            className="hidden"
                          />
                          Otomatis
                        </label>

                        {therapists.map((t) => {
                          const isChosen = formData.therapistId === String(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-center justify-center p-3 rounded-[8px] cursor-pointer text-[13px] transition-colors duration-150 text-center min-w-0 break-words ${isChosen
                                ? "bg-[#FFFBF8] border-[1.5px] border-[#C94A83] text-[#4A2A1A] font-semibold"
                                : "bg-white border border-black/10 text-[#4A2A1A] hover:border-black/25 font-medium"
                                }`}
                            >
                              <input
                                type="radio"
                                name="therapistId"
                                value={t.id}
                                checked={isChosen}
                                onChange={() => setFormData({ ...formData, therapistId: String(t.id) })}
                                className="hidden"
                              />
                              {t.name}
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[12px] leading-[18px] text-[#6B5A52] mt-2.5">
                        Jika memilih Otomatis, sistem akan menugaskan bidan atau terapis yang tersedia pada jam tersebut.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col gap-6 min-w-0">
                    <h3 className="text-[20px] leading-[28px] font-semibold text-[#4A2A1A]">
                      Data peserta dan lokasi perawatan
                    </h3>

                    <div className="p-3.5 sm:p-4 bg-[#FAF6F2] border border-black/10 rounded-[8px]">
                      <p className="text-[13px] leading-[20px] text-[#4A2A1A]">
                        Layanan ini ditujukan untuk anak usia maksimal 5 tahun (60 bulan). Untuk usia di atas 5 tahun, silakan hubungi kontak WhatsApp studio.
                      </p>
                    </div>

                    <div className="overflow-x-auto no-scrollbar max-w-full">
                      <div className="segmented-group">
                        {babies.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBabyProfileMode("select")}
                            className={`segmented-item tabular-nums ${babyProfileMode === "select" ? "segmented-item-active" : ""
                              }`}
                          >
                            Profil Anak ({babies.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setBabyProfileMode("manual")}
                          className={`segmented-item ${babyProfileMode === "manual" ? "segmented-item-active" : ""
                            }`}
                        >
                          Tulis Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => setBabyProfileMode("create")}
                          className={`segmented-item ${babyProfileMode === "create" ? "segmented-item-active" : ""
                            }`}
                        >
                          Tambah Profil Baru
                        </button>
                      </div>
                    </div>

                    {babyProfileMode === "select" && babies.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {babies.map((b) => {
                          const age = calculateAgeInMonths(b.birth_date);
                          const isSelected = formData.babyId === String(b.id);
                          return (
                            <div
                              key={b.id}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  babyId: String(b.id),
                                  babyName: b.name,
                                  babyAge: String(age),
                                  notes: b.notes || "",
                                }))
                              }
                              className={`p-4 rounded-[8px] cursor-pointer transition-colors duration-150 flex flex-col gap-1.5 text-left ${isSelected
                                ? "bg-[#FAF7F4] border-[1.5px] border-[var(--text)]"
                                : "bg-[#FFFFFF] border border-[var(--border)] hover:border-[var(--text-muted)]"
                                }`}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <h4 className="font-semibold text-[var(--text)] text-[15px]">{b.name}</h4>
                                <span className="text-[13px] font-medium text-[var(--text)] tabular-nums">
                                  {age} bulan
                                </span>
                              </div>
                              <p className="text-[var(--text-muted)] text-[12px] tabular-nums">
                                Tanggal lahir:{" "}
                                {new Date(b.birth_date).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              {b.notes && (
                                <p className="text-[12px] text-[var(--text-muted)] line-clamp-1 pt-1.5 mt-1 border-t border-[var(--border)]">
                                  Catatan: {b.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {babyProfileMode === "manual" && (
                      <div className="grid gap-4">
                        <div>
                          <label className="overline-label block mb-2">Nama Anak</label>
                          <input
                            type="text"
                            placeholder="Contoh: Kenzie"
                            className="input-field"
                            value={formData.babyName}
                            onChange={(e) =>
                              setFormData({ ...formData, babyName: e.target.value.replace(/[^a-zA-Z\s'.-]/g, "") })
                            }
                          />
                        </div>
                        <div>
                          <label className="overline-label block mb-2">Usia Anak (Bulan)</label>
                          <input
                            type="number"
                            placeholder="Contoh: 8"
                            className="input-field tabular-nums"
                            value={formData.babyAge}
                            onChange={(e) => setFormData({ ...formData, babyAge: e.target.value })}
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="overline-label block mb-2">Catatan Kesehatan (Opsional)</label>
                          <textarea
                            rows={3}
                            placeholder="Kondisi kulit sensitif, riwayat alergi minyak tertentu, atau catatan lain"
                            className="input-field resize-none py-2.5"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {babyProfileMode === "create" && (
                      <form
                        onSubmit={handleCreateBabyProfile}
                        className="flex flex-col gap-4 bg-[#FAF7F4] p-5 rounded-[8px] border border-[var(--border)] text-left"
                      >
                        <div>
                          <h4 className="font-semibold text-[var(--text)] text-[15px]">Simpan Profil Anak</h4>
                          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                            Data profil disimpan ke akun agar dapat dipilih kembali pada pemesanan berikutnya.
                          </p>
                        </div>
                        <div>
                          <label className="overline-label block mb-1.5">Nama Lengkap Anak</label>
                          <input
                            type="text"
                            placeholder="Contoh: Kenzie"
                            className="input-field"
                            value={newBabyData.name}
                            onChange={(e) =>
                              setNewBabyData({ ...newBabyData, name: e.target.value.replace(/[^a-zA-Z\s'.-]/g, "") })
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="overline-label block mb-1.5">Tanggal Lahir</label>
                          <input
                            type="date"
                            className="input-field tabular-nums"
                            value={newBabyData.birthDate}
                            onChange={(e) => setNewBabyData({ ...newBabyData, birthDate: e.target.value })}
                            max={new Date().toISOString().split("T")[0]}
                            required
                          />
                        </div>
                        <div>
                          <label className="overline-label block mb-1.5">Catatan Kesehatan (Opsional)</label>
                          <textarea
                            rows={2}
                            placeholder="Contoh: Alergi minyak lavender, kulit sensitif"
                            className="input-field resize-none py-2"
                            value={newBabyData.notes}
                            onChange={(e) => setNewBabyData({ ...newBabyData, notes: e.target.value })}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingBaby}
                          className="btn-primary w-full mt-1"
                        >
                          {isCreatingBaby && <Loader2 size={16} className="animate-spin" />}
                          {isCreatingBaby ? "Menyimpan..." : "Simpan & Pilih Profil"}
                        </button>
                      </form>
                    )}

                    <div className="border-t border-[var(--border)] pt-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <label className="overline-label flex items-center gap-1.5">
                            <MapPin size={14} className="text-[var(--text-muted)]" />
                            Alamat Kunjungan Rumah (Opsional)
                          </label>
                          <span className="text-[12px] text-[var(--text-muted)] block mt-0.5">
                            Isi alamat lengkap jika memilih kunjungan ke rumah. Kosongkan jika datang ke studio.
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className="btn-secondary-sm self-start sm:self-auto shrink-0"
                        >
                          {isLocating ? (
                            <Loader2 size={13} className="animate-spin text-[var(--text-muted)]" />
                          ) : (
                            <Navigation size={13} className="text-[var(--text-muted)]" />
                          )}
                          <span>{isLocating ? "Mendeteksi GPS..." : "Sematkan Titik GPS"}</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Contoh: Jl. Musi No. 10, RT 02/RW 13, Karanganyar. Kosongkan apabila sesi dilakukan di studio."
                        className="input-field w-full resize-none py-2.5 text-[14px]"
                        value={formData.deliveryAddress}
                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                      />

                      {formData.deliveryAddress.includes("https://maps.google.com") && (
                        <p className="mt-2 text-[12px] text-[var(--accent)] font-medium">
                          Tautan koordinat GPS telah ditambahkan ke alamat kunjungan.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="flex flex-col gap-6 min-w-0">
                    <div>
                      <h3 className="text-[20px] leading-[28px] font-semibold text-[#4A2A1A]">
                        Periksa rincian reservasi
                      </h3>
                      <p className="text-[14px] text-[#6B5A52] mt-1">
                        Pastikan layanan, jadwal kedatangan, dan data peserta sudah sesuai sebelum membuat pesanan.
                      </p>
                    </div>

                    <div className="border-t border-b border-black/10 divide-y divide-black/10 text-[14px]">
                      <div className="py-3.5 flex justify-between gap-4">
                        <span className="text-[#6B5A52] shrink-0">Layanan</span>
                        <span className="font-semibold text-[#4A2A1A] text-right min-w-0 break-words">{selectedService?.name}</span>
                      </div>
                      <div className="py-3.5 flex justify-between gap-4">
                        <span className="text-[#6B5A52] shrink-0">Jadwal Sesi</span>
                        <span className="font-semibold text-[#4A2A1A] tabular-nums text-right min-w-0 break-words">
                          {new Date(formData.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          • {formData.time} WIB
                        </span>
                      </div>
                      <div className="py-3.5 flex justify-between gap-4">
                        <span className="text-[#6B5A52] shrink-0">Terapis</span>
                        <span className="font-medium text-[#4A2A1A] text-right min-w-0 break-words">
                          {selectedTherapistName}
                        </span>
                      </div>
                      <div className="py-3.5 flex justify-between gap-4">
                        <span className="text-[#6B5A52] shrink-0">{isMomTreatment ? "Peserta" : "Data Peserta"}</span>
                        <span className="font-medium text-[#4A2A1A] tabular-nums text-right min-w-0 break-words">
                          {isMomTreatment
                            ? "Ibu (Mom Treatment)"
                            : `${formData.babyName} (${formData.babyAge} bulan)`}
                        </span>
                      </div>
                      <div className="py-3.5 flex justify-between gap-4">
                        <span className="text-[#6B5A52] shrink-0">Lokasi</span>
                        <span className="font-medium text-[#4A2A1A] text-right max-w-[65%] min-w-0 break-words [overflow-wrap:anywhere]">
                          {formData.deliveryAddress ? formData.deliveryAddress : "Studio Mayesha Baby Spa"}
                        </span>
                      </div>
                      <div className="py-4 flex justify-between items-baseline gap-4">
                        <span className="font-semibold text-[#4A2A1A] shrink-0">Total Pembayaran</span>
                        <span className="font-semibold text-[#C94A83] text-[20px] tabular-nums text-right">
                          Rp {Number(selectedService?.price ?? 0).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 bg-[#FAF6F2] rounded-[8px] border border-black/10 text-[13px] leading-[20px] text-[#4A2A1A]">
                      Setelah reservasi dibuat, unggah bukti pembayaran QRIS dalam waktu <span className="font-semibold tabular-nums">15 menit</span> agar jadwal tidak dibatalkan otomatis.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white border border-black/10 rounded-[12px] p-5 sm:p-6 w-full min-w-0">
            <span className="overline-label block mb-1">RINGKASAN PESANAN</span>
            <h3 className="text-[18px] leading-[26px] font-semibold text-[#4A2A1A] mb-4">
              Detail Sesi Terpilih
            </h3>

            <div className="divide-y divide-black/10 border-t border-b border-black/10 text-[13px] leading-[20px]">
              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">Layanan</span>
                <span className="font-semibold text-[#4A2A1A] text-right min-w-0 break-words">
                  {selectedService ? selectedService.name : "Belum dipilih"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">Durasi</span>
                <span className="text-[#4A2A1A] tabular-nums text-right">
                  {selectedService ? `${selectedService.duration_minutes} menit` : "—"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">Tanggal</span>
                <span className="text-[#4A2A1A] tabular-nums text-right">
                  {formData.date
                    ? new Date(formData.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                    : "Belum dipilih"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">Jam Sesi</span>
                <span className="text-[#4A2A1A] tabular-nums text-right">
                  {formData.time ? `${formData.time} WIB` : "Belum dipilih"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">Terapis</span>
                <span className="text-[#4A2A1A] text-right min-w-0 break-words">{selectedTherapistName}</span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">
                  Peserta
                </span>
                <span className="text-[#4A2A1A] tabular-nums text-right min-w-0 break-words">
                  {isMomTreatment
                    ? "Ibu (Mom Care)"
                    : formData.babyName
                      ? `${formData.babyName}${formData.babyAge ? ` (${formData.babyAge} bln)` : ""}`
                      : "Belum diisi"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-[#6B5A52] shrink-0">Lokasi</span>
                <span className="text-[#4A2A1A] text-right">
                  {formData.deliveryAddress ? "Kunjungan Rumah" : "Studio Tegalgede"}
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold text-[#4A2A1A]">Total Biaya</span>
              <span className="text-[20px] font-medium text-[#4A2A1A] tabular-nums">
                Rp {Number(selectedService?.price ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
          </aside>
        </div>
      </div>

      {!isLoadingServices && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFBF8] border-t border-black/10 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="hidden sm:flex flex-col">
              <span className="overline-label tabular-nums">
                Langkah {step} dari 4
              </span>
              <span className="text-[13px] font-medium text-[#4A2A1A]">
                {BOOKING_STEPS.find((item) => item.num === step)?.label}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(isMomTreatment && step === 4 ? 2 : step - 1)}
                  className="btn-secondary flex-1 sm:flex-none"
                  disabled={isSubmitting}
                >
                  Kembali
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-[8px] text-[15px] font-medium text-white bg-[#C94A83] hover:bg-[#B73F73] disabled:opacity-55 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer flex-1 sm:flex-none sm:min-w-[152px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting
                  ? "Memproses..."
                  : step === 4
                    ? "Buat Reservasi"
                    : "Lanjut"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
