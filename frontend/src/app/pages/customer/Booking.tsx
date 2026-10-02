import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Calendar, Clock, CheckCircle, ChevronRight, User, Loader2, Sparkles, Baby as BabyIcon, Plus, AlertCircle, MapPin } from "lucide-react";
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
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Helper: get slot status for a given time
  const getSlotStatus = (time: string): "available" | "limited" | "full" | "unknown" => {
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

  const handleNext = async () => {
    if (step === 1 && !formData.serviceId) return toast.error("Pilih layanan terlebih dahulu ya, Bun");
    if (step === 2 && !formData.date) return toast.error("Pilih tanggalnya dulu ya");
    if (step === 2 && !formData.time) return toast.error("Pilih jam sesinya dulu ya");
    if (step === 3 && babyProfileMode === "manual" && (!formData.babyName || !formData.babyAge)) return toast.error("Lengkapi data si Kecil ya");
    if (step === 3 && babyProfileMode === "select" && !formData.babyId) return toast.error("Pilih profil anak Bunda terlebih dahulu");

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
        toast.success("Reservasi berhasil dibuat! Silakan lakukan pembayaran.");
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
    if (!newBabyData.name || !newBabyData.birthDate) {
      toast.error("Nama dan tanggal lahir wajib diisi.");
      return;
    }
    setIsCreatingBaby(true);
    try {
      const newBaby = await createBaby({
        name: newBabyData.name,
        birth_date: newBabyData.birthDate,
        notes: newBabyData.notes || null,
      });
      toast.success("Profil anak berhasil disimpan secara permanen!");
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
    <div className="max-w-3xl mx-auto px-6 py-12 pb-32">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">Yuk, Booking Sesi! 🌸</h1>
        <p className="text-slate-500">Pilih layanan kesukaan si Kecil dan atur jadwalnya</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-12 relative max-w-md mx-auto">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-pink-100 -z-10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-pink-500 -z-10 rounded-full transition-all duration-300"
          style={{ width: `${isMomTreatment ? ((step === 4 ? 3 : step - 1) / 3) * 100 : ((step - 1) / 3) * 100}%` }}
        />
        {[1, 2, 3, 4].map((i) => {
          // For mom treatment, show step 3 as greyed out/skipped
          const isSkipped = isMomTreatment && i === 3;
          const isActive  = isMomTreatment
            ? (i === 3 ? false : (i < 3 ? step >= i : step >= 4))
            : step >= i;
          return (
            <div
              key={i}
              title={isSkipped ? 'Dilewati (layanan untuk Bunda)' : undefined}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                isSkipped
                  ? 'bg-slate-100 text-slate-300 border-2 border-slate-200'
                  : isActive
                  ? 'bg-pink-500 text-white shadow-pink-100 scale-105'
                  : 'bg-white text-slate-400 border-2 border-pink-100'
              }`}
            >
              {isSkipped ? '–' : i}
            </div>
          );
        })}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel p-8"
      >
        {isLoadingServices ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-pink-500" />
            <p className="text-slate-400 text-sm">Menyiapkan menu layanan spa...</p>
          </div>
        ) : (
          <>
            {/* ── STEP 1: Pilih Layanan ─────────────────────────────────── */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles size={20} className="text-pink-500" /> 1. Mau pilih layanan apa nih?
                </h2>

                {/* Info usia anak */}
                <div className="flex items-start gap-3 p-3.5 bg-pink-50 border border-pink-100 rounded-2xl">
                  <BabyIcon size={16} className="text-pink-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-pink-700 leading-relaxed">
                    <span className="font-bold">Layanan Baby &amp; Kids</span> di Mayesha Baby Spa ditujukan untuk anak usia <span className="font-bold">0 – 5 tahun</span>. Pastikan usia si Kecil sudah sesuai sebelum melakukan pemesanan ya, Bun! 🌸
                  </p>
                </div>

                <div className="grid gap-4">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all ${
                        formData.serviceId === s.id
                          ? "border-pink-500 bg-pink-50/50 ring-1 ring-pink-500 shadow-md shadow-pink-50"
                          : "border-slate-200 hover:border-pink-300 bg-white/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="serviceId"
                          value={s.id}
                          checked={formData.serviceId === s.id}
                          onChange={() => setFormData({ ...formData, serviceId: s.id })}
                          className="w-5 h-5 text-pink-500 focus:ring-pink-500 cursor-pointer"
                        />
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{s.name}</h4>
                          <p className="text-slate-500 text-xs mt-1 max-w-md line-clamp-2">{s.description}</p>
                          <p className="text-xs font-semibold text-pink-600 flex items-center gap-1 mt-2">
                            <Clock size={13} /> {s.duration_minutes} Menit
                          </p>
                        </div>
                      </div>
                      <span className="font-extrabold text-pink-500 text-lg whitespace-nowrap pl-4">
                        Rp {s.price.toLocaleString("id-ID")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 2: Tanggal & Jam ─────────────────────────────────── */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <h2 className="text-xl font-bold text-slate-800">2. Kapan mau datang?</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Sesi</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3.5 text-slate-400" size={18} />
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        className="input-glass pl-11"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData({ ...formData, date: e.target.value, time: "" });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Jam</label>
                      {isLoadingSlots && (
                        <span className="flex items-center gap-1 text-[10px] text-pink-500 font-medium">
                          <Loader2 size={11} className="animate-spin" /> Cek ketersediaan...
                        </span>
                      )}
                    </div>

                    {!formData.date ? (
                      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-sm">
                        <Calendar size={16} />
                        Pilih tanggal dulu untuk melihat slot tersedia
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {TIME_SLOTS.map((t) => {
                            const status = getSlotStatus(t);
                            const isFull = status === "full";
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
                                    ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100"
                                    : isLimited
                                    ? "bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-400 cursor-pointer"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-pink-300 cursor-pointer"
                                }`}
                              >
                                <span>{t} WIB</span>
                                {isFull && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Penuh</span>
                                )}
                                {isLimited && !isSelected && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 mt-0.5">Sisa 1 Slot</span>
                                )}
                                {isSelected && isLimited && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-pink-100 mt-0.5">Sisa 1 Slot</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                            <span className="w-3 h-3 rounded-full bg-white border-2 border-slate-200 inline-block" /> Tersedia
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium">
                            <span className="w-3 h-3 rounded-full bg-amber-100 border-2 border-amber-300 inline-block" /> Hampir Penuh
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                            <span className="w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-300 inline-block" /> Penuh
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pemilihan terapis */}
                <div className="border-t border-slate-100 pt-6 mt-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Terapis (Opsional)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label
                      className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all text-center ${
                        !formData.therapistId
                          ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100"
                          : "bg-white border-slate-200 text-slate-600 hover:border-pink-300"
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
                            ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100"
                            : "bg-white border-slate-200 text-slate-600 hover:border-pink-300"
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
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed text-left">
                    * Jika memilih terapis tertentu, pemesanan hanya diizinkan bila terapis bersangkutan sedang kosong. Jika memilih &quot;Bebas / Mana Saja&quot;, sistem akan menugaskan terapis yang senggang secara otomatis.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 3: Data Bayi ─────────────────────────────────────── */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <h2 className="text-xl font-bold text-slate-800">3. Kenalan sama si Kecil yuk!</h2>

                {/* Reminder usia anak */}
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Layanan ini untuk anak usia <span className="font-bold">maksimal 5 tahun</span>. Jika usia si Kecil sudah melebihi itu, silakan hubungi kami langsung ya, Bun.
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {babies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBabyProfileMode("select")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        babyProfileMode === "select" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <BabyIcon size={14} /> Pilih Profil Anak ({babies.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBabyProfileMode("manual")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      babyProfileMode === "manual" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tulis Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBabyProfileMode("create")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      babyProfileMode === "create" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Plus size={14} /> Tambah Profil Baru
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
                              ? "border-pink-500 bg-pink-50/40 ring-1 ring-pink-500 shadow-md shadow-pink-50"
                              : "border-slate-200 hover:border-pink-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs uppercase">
                              {b.name.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{b.name}</h4>
                              <p className="text-slate-400 text-[10px] font-medium">Lahir: {new Date(b.birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 font-semibold mt-1">
                            Usia: <span className="text-pink-600">{age} Bulan</span>
                          </div>
                          {b.notes && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-1 border-t border-slate-100 pt-1">
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
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Panggilan Anak</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="Contoh: Kenzie"
                          className="input-glass pl-11"
                          value={formData.babyName}
                          onChange={(e) => setFormData({ ...formData, babyName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usia Anak (Bulan)</label>
                      <input
                        type="number"
                        placeholder="Berapa bulan nih usianya?"
                        className="input-glass"
                        value={formData.babyAge}
                        onChange={(e) => setFormData({ ...formData, babyAge: e.target.value })}
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pesan / Catatan Khusus (Opsional)</label>
                      <textarea
                        rows={3}
                        placeholder="Mungkin kulit si Kecil sensitif, alergi baby oil tertentu, atau rewel..."
                        className="input-glass resize-none py-2.5"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {babyProfileMode === "create" && (
                  <form onSubmit={handleCreateBabyProfile} className="flex flex-col gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-left">
                    <h3 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-wider">Registrasi Profil Anak</h3>
                    <p className="text-xs text-slate-400 mb-2">Data ini akan disimpan permanen agar bisa dipilih lagi di booking selanjutnya.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Lengkap Anak</label>
                      <input
                        type="text"
                        placeholder="Contoh: Kenzie"
                        className="input-glass bg-white"
                        value={newBabyData.name}
                        onChange={(e) => setNewBabyData({ ...newBabyData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Lahir</label>
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
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pesan / Kondisi Kesehatan Khusus (Opsional)</label>
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
                      className="btn-primary py-2.5 mt-2 font-bold text-sm w-full shadow-md shadow-pink-100 flex items-center justify-center gap-1.5 cursor-pointer"
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
                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin size={12} /> Alamat Pengiriman (Home Visit)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Jl. Mawar No. 10, RT 02/03, Bekasi Utara — kosongkan jika datang ke studio"
                    className="input-glass w-full resize-none py-2.5 text-sm"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    * Isi jika memesan layanan <span className="font-semibold">home visit</span>. Kosongkan jika akan datang ke studio.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review & Konfirmasi ──────────────────────────── */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800">Cek lagi yuk detailnya!</h2>
                  <p className="text-sm text-slate-400">Pastikan jadwal dan informasi treatment sudah sesuai.</p>
                </div>

                <div className="bg-slate-50/70 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4 text-sm">
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium">Layanan</span>
                    <span className="font-bold text-slate-800">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium">Jadwal Sesi</span>
                    <span className="font-bold text-slate-800">
                      {new Date(formData.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      | {formData.time} WIB
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium">Terapis</span>
                    <span className="font-bold text-slate-800 font-medium">
                      {formData.therapistId
                        ? therapists.find((t) => String(t.id) === formData.therapistId)?.name
                        : "Bebas / Otomatis"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium">{isMomTreatment ? 'Untuk' : 'Si Kecil'}</span>
                    <span className="font-bold text-slate-800">
                      {isMomTreatment
                        ? '💆‍♀️ Bunda (Mom Treatment)'
                        : `${formData.babyName} (${formData.babyAge} Bulan)`}
                    </span>
                  </div>
                  {formData.deliveryAddress && (
                    <div className="flex justify-between border-b border-slate-200/60 pb-3">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <MapPin size={13} /> Alamat
                      </span>
                      <span className="font-semibold text-slate-700 text-right max-w-[60%] text-xs leading-relaxed">
                        {formData.deliveryAddress}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2">
                    <span className="font-extrabold text-slate-800">Total Pembayaran</span>
                    <span className="font-extrabold text-pink-500 text-xl">
                      Rp {selectedService?.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>Setelah booking dibuat, kamu punya <strong>15 menit</strong> untuk mengunggah bukti pembayaran. Lewat dari itu, slot akan otomatis dilepas.</p>
                </div>
              </div>
            )}


          </>
        )}
      </motion.div>
    </div>

    {/* ── Sticky Bottom Navigation Bar ─────────────────────────────── */}
    {!isLoadingServices && (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-pink-100 shadow-[0_-4px_24px_rgba(236,72,153,0.08)]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Step indicator */}
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Langkah {step} dari {isMomTreatment ? '3' : '4'}
            </span>
            <span className="text-xs font-bold text-slate-700">
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
                className="px-5 py-2.5 font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                ← Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="btn-primary flex items-center justify-center gap-2 px-8 py-2.5 font-semibold text-sm shadow-md shadow-pink-100 cursor-pointer min-w-[160px]"
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