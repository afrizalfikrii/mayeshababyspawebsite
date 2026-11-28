import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CalendarBlank as Calendar,
  Clock,
  CheckCircle,
  CaretRight as ChevronRight,
  User,
  CircleNotch as Loader2,
  Sparkle as Sparkles,
  Baby as BabyIcon,
  Plus,
  WarningCircle as AlertCircle,
  MapPin,
  NavigationArrow as Navigation,
  PencilSimple as Pencil,
  MagnifyingGlass as Search,
  X as CloseIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { getServices, getTherapists } from "@/services/service.service";
import { createReservation, getSlotAvailability } from "@/services/reservation.service";
import { getBabies, createBaby } from "@/services/baby.service";
import { useAuth } from "@/context/AuthContext";
import type { Service, Therapist, Baby, SlotAvailability } from "@/types/api.types";

const TIME_SLOTS = ["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00"];

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [serviceSearch, setServiceSearch] = useState("");
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
      /kids|anak|1[-–]3\s*(th|tahun)|3[-–]4\s*(th|tahun)/i.test(s.name)
    ) {
      return "Anak";
    }
    return "Bayi";
  };

  const formatServiceAge = (service: Service): string => {
    const min = service.age_min_months;
    const max = service.age_max_months;
    if (service.category === "mom_treatment" || (min !== null && min >= 216)) return "Bunda";
    if (min === null) return "Semua Usia";
    if (max === null) return "Dewasa";
    if (max <= 12) return `${min}–${max} Bulan`;
    const isCleanYearMin = min === 0 || min % 12 === 0 || min % 12 === 1;
    const isCleanYearMax = max % 12 === 0;
    if (isCleanYearMin && isCleanYearMax) {
      return `${min === 0 ? 0 : Math.floor(min / 12)}–${max / 12} Tahun`;
    }
    return `${min}–${max} Bulan`;
  };

  const normalizedServiceSearch = serviceSearch.trim().toLowerCase();
  const filteredBookingServices = services.filter((s) => {
    const matchesSegment = segmentFilter === "all" ? true : getServiceClassification(s) === segmentFilter;
    const matchesQuery = !normalizedServiceSearch
      ? true
      : s.name.toLowerCase().includes(normalizedServiceSearch) ||
        (s.description || "").toLowerCase().includes(normalizedServiceSearch);
    return matchesSegment && matchesQuery;
  });

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

  // ── Slot Availability State ─────────────────────────────────────────────────
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // ── Baby State ──────────────────────────────────────────────────────────────
  const [babies, setBabies] = useState<Baby[]>([]);
  const [isLoadingBabies, setIsLoadingBabies] = useState(true);
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

        // Baca ?service_id dari URL (dari tombol "Pesan Sekarang" di rekomendasi)
        const preselectedId = parseInt(searchParams.get("service_id") ?? "0");
        const defaultService = preselectedId && servicesData.find((s) => s.id === preselectedId)
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
        toast.error("Gagal mengambil data layanan. Coba muat ulang halaman.");
      } finally {
        setIsLoadingServices(false);
        setIsLoadingBabies(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch slot availability whenever date or service changes (on Step 2)
  useEffect(() => {
    if (!formData.date || !formData.serviceId || step !== 2) return;

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setSlotAvailability(null);
      try {
        const data = await getSlotAvailability(formData.date, formData.serviceId);
        setSlotAvailability(data);
        // Reset selected time if it was previously full
        if (formData.time && data.slots[formData.time]?.is_full) {
          setFormData((prev) => ({ ...prev, time: "" }));
        }
      } catch {
        // Silently fail — slots will still render, just without availability info
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [formData.date, formData.serviceId, step]);

  // Helper: check if a slot time is already in the past
  const isSlotPast = (time: string): boolean => {
    if (!formData.date) return false;
    if (slotAvailability?.slots[time]?.is_past) return true;

    // Client-side fallback check
    const [year, month, day] = formData.date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const slotDate = new Date(year, month - 1, day, hours, minutes);
    return slotDate.getTime() <= Date.now();
  };

  // Helper: get slot status for a given time
  const getSlotStatus = (time: string): "available" | "limited" | "full" | "past" | "unknown" => {
    if (isSlotPast(time)) return "past";
    if (!slotAvailability) return "unknown";
    const slot = slotAvailability.slots[time];
    if (!slot) return "unknown";
    if (slot.is_full) return "full";
    if (slot.available === 1) return "limited";
    return "available";
  };

  // ── Derived: selected service & category ───────────────────────────────────
  const selectedService = services.find((s) => s.id === formData.serviceId);
  const isMomTreatment = selectedService?.category === 'mom_treatment';
  // ── Helper: Deteksi Lokasi GPS Saat Ini ───────────────────────────────────
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
            ? prev.deliveryAddress.replace(/\n?📍 Titik GPS: https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g, "").trim()
            : "";
          const newAddress = baseAddress
            ? `${baseAddress}\n📍 Titik GPS: ${mapsLink}`
            : `📍 Titik GPS: ${mapsLink}`;

          return { ...prev, deliveryAddress: newAddress };
        });

        toast.success(`Lokasi GPS berhasil terdeteksi (akurasi ±${Math.round(accuracy)} m).`);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Izin lokasi ditolak. Silakan aktifkan izin lokasi di browser Anda.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Sinyal GPS / lokasi tidak terdeteksi.");
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
    if (step === 1 && !formData.serviceId) return toast.error("Silakan pilih layanan terlebih dahulu.");
    if (step === 2 && !formData.date) return toast.error("Silakan pilih tanggal reservasi terlebih dahulu.");
    if (step === 2 && !formData.time) return toast.error("Silakan pilih jam sesi terlebih dahulu.");
    if (step === 3 && babyProfileMode === "manual") {
      const cleanManualName = formData.babyName.trim();
      if (!cleanManualName || !formData.babyAge) return toast.error("Silakan lengkapi nama dan usia si Kecil.");
      if (!/^[a-zA-Z\s'.-]+$/.test(cleanManualName) || !/[a-zA-Z]/.test(cleanManualName)) {
        return toast.error("Nama anak hanya boleh berisi huruf (tidak boleh angka).");
      }
    }
    if (step === 3 && babyProfileMode === "select" && !formData.babyId) return toast.error("Silakan pilih profil anak terlebih dahulu.");

    if (step < 4) {
      // If mom treatment, skip Step 3 (baby data) entirely
      if (step === 2 && isMomTreatment) {
        setStep(4);
      } else {
        setStep(step + 1);
      }
    } else {
      // Step 4: Submit to API
      setIsSubmitting(true);
      try {
        const booking = await createReservation({
          service_id: formData.serviceId,
          reservation_date: formData.date,
          start_time: formData.time,
          // Only send baby data for non-mom services
          baby_name: (!isMomTreatment && babyProfileMode === "manual") ? formData.babyName : undefined,
          baby_age: (!isMomTreatment && babyProfileMode === "manual") ? Number(formData.babyAge) : undefined,
          notes: formData.notes || undefined,
          therapist_id: formData.therapistId ? Number(formData.therapistId) : undefined,
          baby_id: (!isMomTreatment && babyProfileMode === "select") ? Number(formData.babyId) : undefined,
          delivery_address: formData.deliveryAddress || undefined,
        });
        toast.success("Reservasi berhasil dibuat. Silakan lanjutkan pembayaran.");
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
      toast.error(err.response?.data?.message ?? "Gagal mendaftarkan profil bayi.");
    } finally {
      setIsCreatingBaby(false);
    }
  };


  return (
    <>
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-32">
      <div className="mb-8 text-center">
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#3A2622] mb-2">
          Reservasi Sesi Perawatan
        </h1>
        <p className="text-[#6E5D58] text-sm sm:text-base">
          Pilih layanan untuk Si Kecil atau Bunda dan atur jadwal kedatangan
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-10 relative max-w-md mx-auto">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[#E8DFD8] -z-10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#BE346E] -z-10 rounded-full transition-all duration-300"
          style={{ width: `${isMomTreatment ? ((step === 4 ? 3 : step - 1) / 3) * 100 : ((step - 1) / 3) * 100}%` }}
        />
        {[1, 2, 3, 4].map((i) => {
          const isSkipped = isMomTreatment && i === 3;
          const isActive  = isMomTreatment
            ? (i === 3 ? false : (i < 3 ? step >= i : step >= 4))
            : step >= i;
          return (
            <div
              key={i}
              title={isSkipped ? 'Dilewati (layanan untuk Bunda)' : undefined}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all tabular-nums ${
                isSkipped
                  ? 'bg-[#F4EFE8] text-[#9A8C87] border border-[#E8DFD8]'
                  : isActive
                  ? 'bg-[#BE346E] text-white'
                  : 'bg-white text-[#6E5D58] border border-[#D7C9BE]'
              }`}
            >
              {isSkipped ? '–' : i}
            </div>
          );
        })}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel p-5 sm:p-8 overflow-hidden w-full max-w-full"
      >
        {isLoadingServices ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-[#BE346E]" />
            <p className="text-[#6E5D58] text-sm">Menyiapkan menu layanan spa...</p>
          </div>
        ) : (
          <>
            {/* ── STEP 1: Pilih Layanan ─────────────────────────────────── */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <h2 className="font-editorial text-2xl font-semibold text-[#3A2622]">
                      1. Pilih Layanan Perawatan
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6E5D58] mt-1">
                      Layanan Baby &amp; Kids ditujukan untuk usia 0–5 tahun. Ketuk layanan untuk memilih.
                    </p>
                  </div>
                  <span className="text-xs text-[#6E5D58] tabular-nums shrink-0">
                    {filteredBookingServices.length} layanan tersedia
                  </span>
                </div>

                {/* Filter + Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 p-1 rounded-2xl bg-[#F4EFE8] border border-[#E8DFD8] w-full sm:w-fit">
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
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
                            isActive
                              ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#E8DFD8]"
                              : "text-[#6E5D58] hover:text-[#3A2622] hover:bg-white/60"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5D58] pointer-events-none" size={15} />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Cari layanan..."
                      aria-label="Cari layanan perawatan"
                      className="input-glass w-full pl-10 pr-9 py-2 text-sm rounded-full"
                    />
                    {serviceSearch && (
                      <button
                        type="button"
                        onClick={() => setServiceSearch("")}
                        aria-label="Hapus pencarian"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full inline-flex items-center justify-center text-[#6E5D58] hover:text-[#3A2622] hover:bg-[#F4EFE8] cursor-pointer"
                      >
                        <CloseIcon size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact Service List (2-col desktop, tight 1-col mobile) */}
                {filteredBookingServices.length === 0 ? (
                  <div className="text-center py-10 bg-[#FAF7F2] border border-[#E8DFD8] rounded-2xl">
                    <p className="text-sm font-semibold text-[#3A2622]">Layanan tidak ditemukan</p>
                    <p className="text-xs text-[#6E5D58] mt-1">
                      Coba kata kunci lain atau pilih kategori Semua.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {filteredBookingServices.map((s) => {
                      const cls = getServiceClassification(s);
                      const ageLabel = formatServiceAge(s);
                      const isSelected = formData.serviceId === s.id;
                      return (
                        <label
                          key={s.id}
                          className={`flex flex-col gap-2 p-3.5 sm:p-4 border rounded-2xl cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#BE346E] bg-[#F9EBEF]/45 ring-1 ring-[#BE346E]"
                              : "border-[#E8DFD8] hover:border-[#D7C9BE] bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <input
                                type="radio"
                                name="serviceId"
                                value={s.id}
                                checked={isSelected}
                                onChange={() => setFormData({ ...formData, serviceId: s.id })}
                                className="w-4 h-4 mt-1 shrink-0 accent-[#BE346E] cursor-pointer"
                              />
                              <div className="min-w-0">
                                <h4 className="font-semibold text-[#3A2622] text-sm leading-snug">
                                  {s.name}
                                </h4>
                                <p className="text-[11px] text-[#6E5D58] mt-1 tabular-nums">
                                  <span className="font-semibold text-[#BE346E]">{cls}</span>
                                  {" · "}
                                  {ageLabel}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-[#3A2622] text-sm whitespace-nowrap tabular-nums block">
                                Rp {s.price.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[11px] text-[#6E5D58] inline-flex items-center justify-end gap-1 mt-0.5 tabular-nums">
                                <Clock size={11} className="shrink-0" />
                                {s.duration_minutes} Menit
                              </span>
                            </div>
                          </div>

                          {isSelected && s.description && (
                            <p className="text-xs text-[#6E5D58] leading-relaxed pl-7 border-t border-[#E8DFD8]/70 pt-2">
                              {s.description}
                            </p>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Tanggal & Jam ─────────────────────────────────── */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <h2 className="font-editorial text-2xl font-semibold text-[#3A2622]">
                  2. Pilih Tanggal &amp; Jam Kedatangan
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Tanggal Sesi</label>
                    <div className="relative w-full max-w-full">
                      <Calendar className="absolute left-4 top-3.5 text-[#6E5D58] pointer-events-none" size={18} />
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        className="input-glass pl-11 w-full max-w-full"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData({ ...formData, date: e.target.value, time: "" });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider">Pilih Jam</label>
                      {isLoadingSlots && (
                        <span className="flex items-center gap-1 text-[10px] text-[#BE346E] font-medium">
                          <Loader2 size={11} className="animate-spin" /> Cek ketersediaan...
                        </span>
                      )}
                    </div>

                    {!formData.date ? (
                      <div className="flex items-center gap-2 p-4 bg-[#F7F3EE] rounded-xl border border-[#E8DFD8] text-[#6E5D58] text-sm">
                        <Calendar size={16} />
                        Pilih tanggal dulu untuk melihat slot tersedia
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
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
                                className={`relative flex flex-col items-center justify-center py-3 border rounded-xl text-sm font-semibold transition-all ${
                                  isFull
                                    ? "bg-[#F4EFE8] border-[#E8DFD8] text-[#D7C9BE] cursor-not-allowed opacity-60"
                                    : isSelected
                                    ? "bg-[#BE346E] text-white border-[#BE346E] shadow-sm"
                                    : isLimited
                                    ? "bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-400 cursor-pointer"
                                    : "bg-white border-[#E8DFD8] text-[#6E5D58] hover:border-[#D7C9BE] cursor-pointer"
                                }`}
                              >
                                <span>{t} WIB</span>
                                {isPast ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#6E5D58] mt-0.5">Lewat</span>
                                ) : isFull ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#6E5D58] mt-0.5">Penuh</span>
                                ) : isLimited && !isSelected ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 mt-0.5">Sisa 1 Slot</span>
                                ) : isSelected && isLimited ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#F9EBEF] mt-0.5">Sisa 1 Slot</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span className="flex items-center gap-1.5 text-[10px] text-[#6E5D58] font-medium">
                            <span className="w-3 h-3 rounded-full bg-white border-2 border-[#E8DFD8] inline-block" /> Tersedia
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium">
                            <span className="w-3 h-3 rounded-full bg-amber-100 border-2 border-amber-300 inline-block" /> Hampir Penuh
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-[#6E5D58] font-medium">
                            <span className="w-3 h-3 rounded-full bg-[#E8DFD8] border-2 border-[#D7C9BE] inline-block" /> Penuh
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pemilihan terapis */}
                <div className="border-t border-[#E8DFD8] pt-6 mt-2">
                  <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Pilih Terapis (Opsional)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label
                      className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all text-center ${
                        !formData.therapistId
                          ? "bg-[#BE346E] text-white border-[#BE346E] shadow-sm"
                          : "bg-white border-[#E8DFD8] text-[#6E5D58] hover:border-[#D7C9BE]"
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
                      Bebas / Mana Saja (Auto)
                    </label>

                    {therapists.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all text-center ${
                          formData.therapistId === String(t.id)
                            ? "bg-[#BE346E] text-white border-[#BE346E] shadow-sm"
                            : "bg-white border-[#E8DFD8] text-[#6E5D58] hover:border-[#D7C9BE]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="therapistId"
                          value={t.id}
                          checked={formData.therapistId === String(t.id)}
                          onChange={() => setFormData({ ...formData, therapistId: String(t.id) })}
                          className="hidden"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#6E5D58] mt-2 leading-relaxed text-left">
                    * Jika memilih terapis tertentu, pemesanan hanya diizinkan bila terapis bersangkutan sedang kosong. Jika memilih &quot;Bebas / Mana Saja&quot;, sistem akan menugaskan terapis yang senggang secara otomatis.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 3: Data Bayi ─────────────────────────────────────── */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <h2 className="font-editorial text-2xl font-semibold text-[#3A2622]">3. Data Si Kecil &amp; Lokasi</h2>

                {/* Reminder usia anak */}
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Layanan ini untuk anak usia <span className="font-bold">maksimal 5 tahun</span>. Jika usia si Kecil sudah melebihi itu, silakan hubungi kami langsung ya, Bun.
                  </p>
                </div>

                {/* Segmented Control Mode Profil Anak */}
                <div
                  className={`grid ${
                    babies.length > 0 ? "grid-cols-3" : "grid-cols-2"
                  } bg-[#F4EFE8] p-1.5 rounded-2xl gap-1.5 border border-[#E8DFD8] shadow-xs`}
                >
                  {babies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBabyProfileMode("select")}
                      className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center leading-tight ${
                        babyProfileMode === "select"
                          ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#3A2622]/10 font-extrabold"
                          : "text-[#6E5D58] hover:text-[#3A2622] hover:bg-white/60"
                      }`}
                    >
                      <BabyIcon size={14} className="shrink-0 text-[#BE346E]" />
                      <span className="truncate">Profil Anak ({babies.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBabyProfileMode("manual")}
                    className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center leading-tight ${
                      babyProfileMode === "manual"
                        ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#3A2622]/10 font-extrabold"
                        : "text-[#6E5D58] hover:text-[#3A2622] hover:bg-white/60"
                    }`}
                  >
                    <Pencil size={13} className="shrink-0 text-[#6E5D58]" />
                    <span className="truncate">Tulis Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBabyProfileMode("create")}
                    className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center leading-tight ${
                      babyProfileMode === "create"
                        ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#3A2622]/10 font-extrabold"
                        : "text-[#6E5D58] hover:text-[#3A2622] hover:bg-white/60"
                    }`}
                  >
                    <Plus size={14} className="shrink-0 text-[#6E5D58]" />
                    <span className="truncate">Tambah Baru</span>
                  </button>
                </div>

                {babyProfileMode === "select" && babies.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-4">
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
                          className={`p-4 border rounded-2xl cursor-pointer transition-all flex flex-col gap-2 text-left relative ${
                            isSelected
                              ? "border-[#BE346E] bg-[#F9EBEF]/40 ring-1 ring-[#BE346E] shadow-sm"
                              : "border-[#E8DFD8] hover:border-[#D7C9BE] bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#F9EBEF] text-[#BE346E] flex items-center justify-center font-bold text-xs uppercase">
                              {b.name.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-[#3A2622] text-sm">{b.name}</h4>
                              <p className="text-[#6E5D58] text-[10px] font-medium">Lahir: {new Date(b.birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                          </div>
                          <div className="text-xs text-[#6E5D58] font-semibold mt-1">
                            Usia: <span className="text-[#BE346E]">{age} Bulan</span>
                          </div>
                          {b.notes && (
                            <p className="text-[10px] text-[#6E5D58] italic line-clamp-1 mt-1 border-t border-[#E8DFD8] pt-1">
                              Catatan: {b.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {babyProfileMode === "manual" && (
                  <div className="grid gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Nama Panggilan Anak</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 text-[#6E5D58]" size={18} />
                        <input
                          type="text"
                          placeholder="Contoh: Kenzie"
                          className="input-glass pl-11"
                          value={formData.babyName}
                          onChange={(e) =>
                            setFormData({ ...formData, babyName: e.target.value.replace(/[^a-zA-Z\s'.-]/g, "") })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Usia Anak (Bulan)</label>
                      <input
                        type="number"
                        placeholder="Masukkan usia dalam bulan (mis. 6)"
                        className="input-glass"
                        value={formData.babyAge}
                        onChange={(e) => setFormData({ ...formData, babyAge: e.target.value })}
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Pesan / Catatan Khusus (Opsional)</label>
                      <textarea
                        rows={3}
                        placeholder="Misalnya kulit sensitif, alergi minyak tertentu, atau kondisi khusus..."
                        className="input-glass resize-none py-2.5"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {babyProfileMode === "create" && (
                  <form onSubmit={handleCreateBabyProfile} className="flex flex-col gap-4 bg-[#FAF7F2] p-5 rounded-2xl border border-[#E8DFD8] text-left">
                    <h3 className="font-bold text-[#3A2622] text-sm mb-1 uppercase tracking-wider">Registrasi Profil Anak</h3>
                    <p className="text-xs text-[#6E5D58] mb-2">Data ini akan disimpan permanen agar bisa dipilih lagi di booking selanjutnya.</p>
                    <div>
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Nama Lengkap Anak</label>
                      <input
                        type="text"
                        placeholder="Contoh: Kenzie"
                        className="input-glass bg-white"
                        value={newBabyData.name}
                        onChange={(e) =>
                          setNewBabyData({ ...newBabyData, name: e.target.value.replace(/[^a-zA-Z\s'.-]/g, "") })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Tanggal Lahir</label>
                      <input
                        type="date"
                        className="input-glass bg-white"
                        value={newBabyData.birthDate}
                        onChange={(e) => setNewBabyData({ ...newBabyData, birthDate: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6E5D58] uppercase tracking-wider mb-2">Pesan / Kondisi Kesehatan Khusus (Opsional)</label>
                      <textarea
                        rows={2}
                        placeholder="Misal: Alergi lavender oil, kulit kering..."
                        className="input-glass bg-white resize-none py-2"
                        value={newBabyData.notes}
                        onChange={(e) => setNewBabyData({ ...newBabyData, notes: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCreatingBaby}
                      className="btn-primary py-2.5 mt-2 font-bold text-sm w-full shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isCreatingBaby ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Mendaftarkan...
                        </>
                      ) : (
                        "Simpan & Pilih Profil"
                      )}
                    </button>
                  </form>
                )}

                {/* Input Alamat Pengiriman — selalu muncul di Step 3 */}
                <div className="border-t border-[#E8DFD8] pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <label className="text-xs font-bold text-[#3A2622] uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#BE346E]" /> Alamat Kunjungan (Home Visit)
                      </label>
                      <span className="text-[11px] text-[#6E5D58] block mt-0.5">
                        Tulis alamat manual atau klik bagikan titik GPS
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#F9EBEF] hover:bg-[#F9EBEF] text-[#BE346E] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 self-start sm:self-auto border border-[#E8DFD8]/60"
                    >
                      {isLocating ? (
                        <Loader2 size={13} className="animate-spin text-[#BE346E]" />
                      ) : (
                        <Navigation size={13} className="text-[#BE346E]" />
                      )}
                      <span>{isLocating ? "Mencari Titik GPS..." : "Bagikan Lokasi Saat Ini (GPS)"}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Contoh: Jl. Lawu No. 10, Tegalgede, Karanganyar (isi atau bagikan lokasi GPS jika Home Care, kosongkan jika datang ke studio)."
                    className="input-glass w-full resize-none py-2.5 text-sm"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  />

                  {formData.deliveryAddress.includes("https://maps.google.com") && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <CheckCircle size={14} className="shrink-0" />
                      <span>Titik koordinat GPS berhasil disematkan ke dalam alamat reservasi.</span>
                    </div>
                  )}

                  <p className="text-[10px] text-[#6E5D58] mt-1.5 leading-relaxed">
                    * Isi kolom di atas jika memesan layanan <span className="font-semibold text-[#6E5D58]">Home Visit (terapis datang ke rumah)</span>. Kosongkan jika Anda ingin datang ke studio Mayesha.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review & Konfirmasi ──────────────────────────── */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 bg-[#EDF5F0] text-[#2F6B45] rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} />
                  </div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#3A2622]">
                    4. Konfirmasi &amp; Pembayaran
                  </h2>
                  <p className="text-sm text-[#6E5D58] mt-1">
                    Pastikan jadwal dan detail layanan sudah sesuai sebelum melanjutkan.
                  </p>
                </div>

                <div className="bg-[#F7F3EE] rounded-2xl p-6 border border-[#E8DFD8] flex flex-col gap-4 text-sm">
                  <div className="flex justify-between border-b border-[#E8DFD8] pb-3">
                    <span className="text-[#6E5D58] font-medium">Layanan</span>
                    <span className="font-bold text-[#3A2622]">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E8DFD8] pb-3">
                    <span className="text-[#6E5D58] font-medium">Jadwal Sesi</span>
                    <span className="font-bold text-[#3A2622]">
                      {new Date(formData.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      | {formData.time} WIB
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E8DFD8] pb-3">
                    <span className="text-[#6E5D58] font-medium">Terapis</span>
                    <span className="font-bold text-[#3A2622] font-medium">
                      {formData.therapistId
                        ? therapists.find((t) => String(t.id) === formData.therapistId)?.name
                        : "Bebas / Otomatis"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E8DFD8] pb-3">
                    <span className="text-[#6E5D58] font-medium">{isMomTreatment ? 'Untuk' : 'Si Kecil'}</span>
                    <span className="font-bold text-[#3A2622]">
                      {isMomTreatment
                        ? 'Bunda (Mom Treatment)'
                        : `${formData.babyName} (${formData.babyAge} Bulan)`}
                    </span>
                  </div>
                  {formData.deliveryAddress && (
                    <div className="flex justify-between border-b border-[#E8DFD8] pb-3">
                      <span className="text-[#6E5D58] font-medium flex items-center gap-1">
                        <MapPin size={13} /> Alamat
                      </span>
                      <span className="font-semibold text-[#3A2622] text-right max-w-[60%] text-xs leading-relaxed">
                        {formData.deliveryAddress}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between pt-2 gap-4">
                    <div>
                      <span className="font-extrabold text-[#3A2622] block">Total Pembayaran</span>
                      <span className="text-xs text-[#6E5D58] mt-0.5 block">
                        Bisa bayar penuh atau <strong className="text-[#3A2622]">DP minimal 50%</strong>{" "}
                        (Rp {Math.ceil((selectedService?.price ?? 0) * 0.5).toLocaleString("id-ID")})
                      </span>
                    </div>
                    <span className="font-extrabold text-[#BE346E] text-xl tabular-nums whitespace-nowrap">
                      Rp {selectedService?.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E8DFD8] text-xs text-[#6E5D58] leading-relaxed">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#BE346E]" />
                  <p>
                    Anda dapat melunasi langsung atau membayar <strong className="text-[#3A2622]">DP 50% terlebih dahulu</strong> via QRIS (sisa pelunasan dibayar saat sesi berlangsung). Setelah booking dibuat, unggah bukti pembayaran dalam <strong className="text-[#3A2622]">15 menit</strong> agar slot tidak terlepas.
                  </p>
                </div>
              </div>
            )}


          </>
        )}
      </motion.div>
    </div>

    {/* ── Sticky Bottom Navigation Bar ─────────────────────────────── */}
    {!isLoadingServices && (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-[#E8DFD8] shadow-[0_-4px_24px_rgba(236,72,153,0.08)]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Step indicator */}
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-[#6E5D58] font-medium uppercase tracking-wider">
              Langkah {step} dari {isMomTreatment ? '3' : '4'}
            </span>
            <span className="text-xs font-bold text-[#3A2622]">
              {step === 1 && 'Pilih Layanan'}
              {step === 2 && 'Pilih Jadwal'}
              {step === 3 && 'Data Bayi'}
              {step === 4 && 'Konfirmasi'}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(isMomTreatment && step === 4 ? 2 : step - 1)}
                className="px-5 py-2.5 font-semibold text-sm border border-[#E8DFD8] text-[#6E5D58] hover:bg-[#F7F3EE] rounded-xl transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                ← Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="btn-primary flex items-center justify-center gap-2 px-8 py-2.5 font-semibold text-sm shadow-sm cursor-pointer min-w-[160px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sedang Memesan...
                </>
              ) : step === 4 ? (
                '✓ Pesan Sesi Sekarang'
              ) : (
                <>
                  Lanjut <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}