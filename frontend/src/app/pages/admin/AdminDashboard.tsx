import { useEffect, useState } from "react";
import {
  Search,
  Calendar,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  Loader2,
  RefreshCw,
  FileImage,
  Users,
  TrendingUp,
  Printer,
  FileText,
  BarChart2,
  Download,
  MapPin,
  MessageCircle,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import {
  adminGetServices,
  adminCreateService,
  adminUpdateService,
  adminDeleteService,
  adminGetTherapists,
  adminCreateTherapist,
  adminUpdateTherapist,
  adminDeleteTherapist,
} from "@/services/service.service";
import {
  adminGetReservations,
  adminVerifyReservation,
  adminGetStats,
  adminRescheduleReservation,
} from "@/services/reservation.service";
import type { Reservation, Service, Therapist } from "@/types/api.types";
import { getStorageUrl } from "@/lib/axios";

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<"reservations" | "services" | "reports" | "therapists">("reservations");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Reservations State ──────────────────────────────────────────────────────
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resFilter, setResFilter] = useState<string>("all");
  const [isResLoading, setIsResLoading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Reservation | null>(null);
  const [zoomedProofImage, setZoomedProofImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // ── Services State ──────────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [isServLoading, setIsServLoading] = useState(false);
  const [serviceModal, setServiceModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data: Partial<Service> | null;
  }>({ isOpen: false, mode: "create", data: null });



  // ── Reschedule Modal State ──────────────────────────────────────────────────
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    reservation: Reservation | null;
    date: string;
    time: string;
    notes: string;
  }>({ isOpen: false, reservation: null, date: "", time: "", notes: "" });
  const [isRescheduling, setIsRescheduling] = useState(false);

  // ── Therapists State ────────────────────────────────────────────────────────
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isTherapistsLoading, setIsTherapistsLoading] = useState(false);
  const [therapistModal, setTherapistModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data: Partial<Therapist> | null;
  }>({ isOpen: false, mode: "create", data: null });

  // ── Stats State ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    today_bookings: 0,
    total_customers: 0,
    completed_sessions: 0,
    total_revenue: 0,
  });

  // ── Fetch Data ──────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const data = await adminGetStats();
      setStats(data);
    } catch {
      // silent catch
    }
  };

  const fetchReservations = async () => {
    setIsResLoading(true);
    try {
      const data = await adminGetReservations();
      setReservations(data);
    } catch {
      toast.error("Gagal mengambil data reservasi.");
    } finally {
      setIsResLoading(false);
    }
  };

  const fetchServices = async () => {
    setIsServLoading(true);
    try {
      const data = await adminGetServices();
      setServices(data);
    } catch {
      toast.error("Gagal mengambil data layanan.");
    } finally {
      setIsServLoading(false);
    }
  };

  const fetchTherapists = async () => {
    setIsTherapistsLoading(true);
    try {
      const data = await adminGetTherapists();
      setTherapists(data);
    } catch {
      toast.error("Gagal mengambil data terapis.");
    } finally {
      setIsTherapistsLoading(false);
    }
  };

  const getIncomeData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const dailySum = reservations
        .filter((r) => {
          if (!r.created_at || (r.status !== "confirmed" && r.status !== "completed")) {
            return false;
          }
          const createdDate = new Date(r.created_at);
          const cYear = createdDate.getFullYear();
          const cMonth = String(createdDate.getMonth() + 1).padStart(2, "0");
          const cDay = String(createdDate.getDate()).padStart(2, "0");
          const createdDateStr = `${cYear}-${cMonth}-${cDay}`;
          return createdDateStr === dateStr;
        })
        .reduce((sum, r) => sum + Number(r.total_price), 0);

      data.push({
        date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        "Pendapatan": dailySum,
      });
    }
    return data;
  };

  const getPopularServicesData = () => {
    const counts: Record<string, number> = {};
    reservations
      .filter((r) => r.status === "confirmed" || r.status === "completed")
      .forEach((r) => {
        const name = r.service?.name || "Layanan Lain";
        counts[name] = (counts[name] || 0) + 1;
      });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 12) + "..." : name,
        "Jumlah Sesi": value,
      }))
      .sort((a, b) => b["Jumlah Sesi"] - a["Jumlah Sesi"])
      .slice(0, 5);
  };

  const getWaLinkFromPhone = (phone: string | null | undefined, message?: string) => {
    if (!phone) return "-";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    }
    if (!cleaned) return "-";
    const textParam = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${cleaned}${textParam}`;
  };

  const handleExportCSV = () => {
    const headers = ["Tanggal", "NO", "Nama Bayi", "Umur", "Alamat / Catatan", "No WA", "Link WA", "Tindakan/Layanan", "Terapis", "Tarif"];
    const rows = reservations.map((r, idx) => {
      const dateFormatted = new Date(r.reservation_date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
      const babyName = `"${r.baby_name.replace(/"/g, '""')}"`;
      const babyAge = `"${r.baby_age} Bulan"`;
      const notes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '"-"';
      const phone = `"${r.user?.phone_number ?? '-'}"`;
      const waLink = !r.user?.phone_number ? '"-"' : `"${getWaLinkFromPhone(r.user.phone_number)}"`;
      const serviceName = r.service?.name ? `"${r.service.name.replace(/"/g, '""')}"` : '"-"';
      const therapistName = `"${r.therapist?.name ?? 'Otomatis'}"`;
      const price = `"${r.total_price.toLocaleString("id-ID")}"`;

      return [
        dateFormatted,
        idx + 1,
        babyName,
        babyAge,
        notes,
        phone,
        waLink,
        serviceName,
        therapistName,
        price,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Data_Mayesha_Spa_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan Spreadsheet (CSV/Excel) 10 Kolom berhasil di-download!");
  };

  useEffect(() => {
    fetchReservations();
    fetchServices();
    fetchStats();
    fetchTherapists();
  }, []);

  // ── Reservation Actions ─────────────────────────────────────────────────────
  const handleVerify = async (id: number, action: "confirmed" | "cancelled" | "completed") => {
    try {
      await adminVerifyReservation(id, action);
      toast.success(
        action === "confirmed"
          ? "Reservasi berhasil dikonfirmasi!"
          : action === "completed"
          ? "Sesi spa berhasil diselesaikan! 🎉"
          : "Reservasi berhasil dibatalkan."
      );
      setSelectedProof(null);
      fetchReservations();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal memverifikasi reservasi.");
    }
  };



  // ── Reschedule Handler ──────────────────────────────────────────────────────
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModal.reservation || !rescheduleModal.date || !rescheduleModal.time) {
      toast.error("Mohon pilih tanggal dan jam baru.");
      return;
    }
    setIsRescheduling(true);
    try {
      await adminRescheduleReservation(rescheduleModal.reservation.id, {
        reservation_date: rescheduleModal.date,
        start_time: rescheduleModal.time,
        notes: rescheduleModal.notes || undefined,
      });
      toast.success("Jadwal reservasi berhasil direschedule!");
      setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" });
      fetchReservations();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengubah jadwal reservasi.");
    } finally {
      setIsRescheduling(false);
    }
  };

  // ── Service Actions ─────────────────────────────────────────────────────────
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceModal.data?.name || !serviceModal.data?.duration_minutes || !serviceModal.data?.price) {
      toast.error("Semua input wajib diisi.");
      return;
    }

    try {
      if (serviceModal.mode === "create") {
        await adminCreateService({
          name: serviceModal.data.name,
          description: serviceModal.data.description ?? "",
          duration_minutes: Number(serviceModal.data.duration_minutes),
          price: Number(serviceModal.data.price),
          is_active: serviceModal.data.is_active ?? true,
        });
        toast.success("Layanan baru berhasil ditambahkan!");
      } else {
        await adminUpdateService(serviceModal.data.id!, {
          name: serviceModal.data.name,
          description: serviceModal.data.description,
          duration_minutes: Number(serviceModal.data.duration_minutes),
          price: Number(serviceModal.data.price),
          is_active: serviceModal.data.is_active,
        });
        toast.success("Layanan berhasil diperbarui!");
      }
      setServiceModal({ isOpen: false, mode: "create", data: null });
      fetchServices();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menyimpan layanan.");
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus layanan ini?")) return;
    try {
      await adminDeleteService(id);
      toast.success("Layanan berhasil dihapus.");
      fetchServices();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menghapus layanan.");
    }
  };

  // ── Therapist Actions ───────────────────────────────────────────────────────
  const handleSaveTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapistModal.data?.name) {
      toast.error("Nama terapis wajib diisi.");
      return;
    }

    try {
      if (therapistModal.mode === "create") {
        await adminCreateTherapist({
          name: therapistModal.data.name,
          is_active: therapistModal.data.is_active ?? true,
        });
        toast.success("Terapis baru berhasil ditambahkan!");
      } else {
        await adminUpdateTherapist(therapistModal.data.id!, {
          name: therapistModal.data.name,
          is_active: therapistModal.data.is_active,
        });
        toast.success("Data terapis berhasil diperbarui!");
      }
      setTherapistModal({ isOpen: false, mode: "create", data: null });
      fetchTherapists();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menyimpan terapis.");
    }
  };

  const handleDeleteTherapist = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus staf terapis ini?")) return;
    try {
      await adminDeleteTherapist(id);
      toast.success("Terapis berhasil dihapus.");
      fetchTherapists();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal menghapus terapis.");
    }
  };

  // ── Filters & Search ────────────────────────────────────────────────────────
  const filteredReservations = reservations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      if (resFilter === "all") return true;
      if (resFilter === "rescheduled") return r.is_rescheduled;
      return r.status === resFilter;
    }

    const matchesSearch =
      r.booking_code.toLowerCase().includes(q) ||
      (r.user?.name ?? "").toLowerCase().includes(q) ||
      (r.baby_name ?? "").toLowerCase().includes(q) ||
      (r.service?.name ?? "").toLowerCase().includes(q) ||
      (r.therapist?.name ?? "").toLowerCase().includes(q) ||
      (r.user?.phone_number ?? "").toLowerCase().includes(q) ||
      (r.delivery_address ?? "").toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q);

    if (resFilter === "all") return matchesSearch;
    if (resFilter === "rescheduled") return r.is_rescheduled && matchesSearch;
    return r.status === resFilter && matchesSearch;
  });

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q)
    );
  });

  const filteredTherapists = therapists.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return t.name.toLowerCase().includes(q);
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-amber-50 text-amber-600 border-amber-100", text: "text-amber-600", label: "Belum Bayar" },
      waiting_verification: { bg: "bg-indigo-50 text-indigo-600 border-indigo-100", text: "text-indigo-600", label: "Menunggu Verifikasi" },
      confirmed: { bg: "bg-emerald-50 text-emerald-600 border-emerald-100", text: "text-emerald-600", label: "Dikonfirmasi" },
      cancelled: { bg: "bg-rose-50 text-rose-600 border-rose-100", text: "text-rose-600", label: "Dibatalkan" },
      completed: { bg: "bg-slate-50 text-slate-600 border-slate-100", text: "text-slate-600", label: "Selesai" },
    };
    const c = config[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", text: "text-slate-600", label: status };
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium inline-block ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-10 print:hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Admin Area <span className="text-pink-500 font-medium text-lg">Mayesha Portal</span>
          </h1>
          <p className="text-slate-500">Pantau pesanan, verifikasi pembayaran QRIS, dan atur layanan spa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeMenu === "reservations") {
                fetchReservations();
              } else if (activeMenu === "services") {
                fetchServices();
              } else if (activeMenu === "therapists") {
                fetchTherapists();
              }
              fetchStats();
            }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-800 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama orang tua, anak, kode..."
              className="input-glass pl-10 pr-9 py-2.5 w-full md:w-80 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            title: "Booking Hari Ini",
            value: stats.today_bookings,
            icon: <Calendar size={20} />,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            title: "Total Pelanggan",
            value: stats.total_customers,
            icon: <Users size={20} />,
            color: "text-purple-500",
            bg: "bg-purple-50",
          },
          {
            title: "Sesi Selesai",
            value: stats.completed_sessions,
            icon: <CheckCircle size={20} />,
            color: "text-green-500",
            bg: "bg-green-50",
          },
          {
            title: "Pendapatan",
            value: `Rp ${stats.total_revenue.toLocaleString("id-ID")}`,
            icon: <TrendingUp size={20} />,
            color: "text-pink-500",
            bg: "bg-pink-50",
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-panel p-5 flex items-center gap-4 border border-white/50 shadow-md shadow-slate-100/50"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-slate-200/60 pb-px mb-8 print:hidden">
        <button
          onClick={() => setActiveMenu("reservations")}
          className={`pb-3 text-lg font-semibold transition-all relative cursor-pointer ${
            activeMenu === "reservations" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Kelola Reservasi
          {activeMenu === "reservations" && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
          )}
        </button>
        <button
          onClick={() => setActiveMenu("services")}
          className={`pb-3 text-lg font-semibold transition-all relative cursor-pointer ${
            activeMenu === "services" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Kelola Layanan
          {activeMenu === "services" && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
          )}
        </button>
        <button
          onClick={() => setActiveMenu("therapists")}
          className={`pb-3 text-lg font-semibold transition-all relative cursor-pointer ${
            activeMenu === "therapists" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Kelola Terapis
          {activeMenu === "therapists" && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
          )}
        </button>
        <button
          onClick={() => setActiveMenu("reports")}
          className={`pb-3 text-lg font-semibold transition-all relative cursor-pointer ${
            activeMenu === "reports" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Analisis & Laporan
          {activeMenu === "reports" && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeMenu === "reservations" ? (
          <motion.div
            key="reservations"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Semua" },
                { id: "waiting_verification", label: "Menunggu Verifikasi" },
                { id: "pending", label: "Belum Bayar" },
                { id: "confirmed", label: "Dikonfirmasi" },
                { id: "rescheduled", label: "Direschedule 🔄" },
                { id: "cancelled", label: "Dibatalkan" },
                { id: "completed", label: "Selesai" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setResFilter(f.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    resFilter === f.id
                      ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* List / Table */}
            <div className="glass-panel overflow-hidden border border-white/50 shadow-xl">
              {isResLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-pink-500" />
                  <p className="text-slate-500 text-sm">Mengambil data reservasi...</p>
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-20">
                  <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-600 font-semibold text-lg">Tidak ada reservasi ditemukan</p>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                    Coba ubah filter atau lakukan pencarian dengan kata kunci lain.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Code</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Layanan</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Terapis</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Jadwal</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Harga</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-slate-800 text-sm">{r.booking_code}</span>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                              {r.user?.name}
                            </p>
                            {r.baby_name && (
                              <p className="text-xs text-pink-600 font-medium mt-0.5">
                                Anak: <span className="font-semibold">{r.baby_name}</span> ({r.baby_age} Bln)
                              </p>
                            )}
                            {r.user?.phone_number ? (
                              <a
                                href={getWaLinkFromPhone(
                                  r.user.phone_number,
                                  `Halo Kak ${r.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa terkait reservasi (${r.booking_code}) untuk ${r.baby_name ? `anak ${r.baby_name}` : `layanan ${r.service?.name || "Baby Spa"}`}.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200 mt-1 transition-all group"
                                title="Klik untuk chat WhatsApp pelanggan"
                              >
                                <MessageCircle size={12} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                                <span className="font-mono">{r.user.phone_number}</span>
                              </a>
                            ) : (
                              <p className="text-xs text-slate-400 font-mono mt-0.5">-</p>
                            )}
                            {r.delivery_address ? (
                              <div className="mt-2 bg-pink-50/90 p-2 rounded-xl border border-pink-100 max-w-xs">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-700 uppercase tracking-wider">
                                  <MapPin size={11} className="text-pink-500" /> Home Care
                                </span>
                                <p className="text-xs text-slate-700 leading-snug mt-0.5 break-words line-clamp-2">
                                  {r.delivery_address.replace(/\n?📍 Titik GPS: https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g, "").trim() || "Titik GPS Terlampir"}
                                </p>
                                {r.delivery_address.match(/https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g)?.map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-800 underline mt-1"
                                  >
                                    📍 Buka Rute Google Maps →
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 mt-1">
                                🏠 Studio Mayesha
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-medium text-slate-800 text-sm">{r.service?.name}</p>
                            <p className="text-xs text-slate-400">{r.service?.duration_minutes} Menit</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-800 text-sm">{r.therapist?.name ?? 'Otomatis'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Staff Mayesha</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                              {new Date(r.reservation_date).toLocaleDateString("id-ID", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              {r.is_rescheduled && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
                                  <RefreshCw size={9} /> Rescheduled
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={12} /> {r.start_time.substring(0, 5)} - {r.end_time.substring(0, 5)}
                            </p>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800 text-sm">
                              Rp {r.total_price.toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="py-4 px-6">{getStatusBadge(r.status)}</td>
                          <td className="py-4 px-6 text-right flex items-center justify-end gap-1.5">
                            {r.status === "waiting_verification" ? (
                              <button
                                onClick={() => setSelectedProof(r)}
                                className="px-3 py-1.5 text-xs font-semibold bg-pink-500 hover:bg-pink-600 text-white rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={12} /> Verifikasi
                              </button>
                            ) : r.status === "confirmed" ? (
                              <button
                                onClick={() => handleVerify(r.id, "completed")}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Check size={12} /> Selesaikan Sesi
                              </button>
                            ) : null}

                            {r.status !== "completed" && r.status !== "cancelled" && (
                              <button
                                onClick={() => setRescheduleModal({
                                  isOpen: true,
                                  reservation: r,
                                  date: r.reservation_date,
                                  time: r.start_time.substring(0, 5),
                                  notes: "",
                                })}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Reschedule Jadwal Sesi"
                              >
                                <Calendar size={12} /> Reschedule
                              </button>
                            )}

                            {r.status === "completed" || r.status === "cancelled" ? (
                              <span className="text-xs text-slate-400 font-medium">-</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeMenu === "services" ? (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Create Service Trigger */}
            <div className="flex justify-end">
              <button
                onClick={() => setServiceModal({ isOpen: true, mode: "create", data: {} })}
                className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Tambah Layanan Baru
              </button>
            </div>

            {/* List / Table of Services */}
            <div className="glass-panel overflow-hidden border border-white/50 shadow-xl">
              {isServLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-pink-500" />
                  <p className="text-slate-500 text-sm">Mengambil data layanan...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-20">
                  <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-600 font-semibold text-lg">Belum ada layanan</p>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                    Mulai dengan menambahkan layanan baru untuk ditampilkan di menu booking.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Layanan</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Durasi</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Harga</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredServices.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-800 text-sm">{s.name}</td>
                          <td className="py-4 px-6 text-slate-500 text-xs max-w-xs truncate">{s.description}</td>
                          <td className="py-4 px-6 text-slate-700 text-sm font-medium">{s.duration_minutes} Menit</td>
                          <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                            Rp {s.price.toLocaleString("id-ID")}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                                s.is_active
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {s.is_active ? "Aktif" : "Non-aktif"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right flex justify-end gap-2.5">
                            <button
                              onClick={() => setServiceModal({ isOpen: true, mode: "edit", data: s })}
                              className="p-1.5 text-slate-500 hover:text-pink-500 transition-colors hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(s.id)}
                              className="p-1.5 text-slate-500 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeMenu === "therapists" ? (
          <motion.div
            key="therapists"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Create Therapist Trigger */}
            <div className="flex justify-end">
              <button
                onClick={() => setTherapistModal({ isOpen: true, mode: "create", data: {} })}
                className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-pink-100"
              >
                <Plus size={16} /> Tambah Staf Terapis
              </button>
            </div>

            {/* List / Table of Therapists */}
            <div className="glass-panel overflow-hidden border border-white/50 shadow-xl">
              {isTherapistsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-pink-500" />
                  <p className="text-slate-500 text-sm font-semibold">Mengambil data terapis...</p>
                </div>
              ) : therapists.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-600 font-semibold text-lg">Belum ada terapis</p>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                    Mulai dengan menambahkan staf terapis baru untuk menangani sesi spa bayi.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Staf</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Peran</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTherapists.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-800 text-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs uppercase">
                              {t.name.split(" ").slice(-1)[0].substring(0, 2)}
                            </div>
                            {t.name}
                          </td>
                          <td className="py-4 px-6 text-slate-500 text-xs font-semibold uppercase tracking-wider">Terapis Baby Spa</td>
                          <td className="py-4 px-6">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                t.is_active
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {t.is_active ? "Aktif" : "Non-aktif (Cuti)"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right flex justify-end gap-2.5">
                            <button
                              onClick={() => setTherapistModal({ isOpen: true, mode: "edit", data: t })}
                              className="p-1.5 text-slate-500 hover:text-pink-500 transition-colors hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteTherapist(t.id)}
                              className="p-1.5 text-slate-500 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Charts Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Chart 1: Revenue Trend */}
              <div className="glass-panel p-6 border border-white/50 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Tren Pendapatan (7 Hari Terakhir)</h3>
                </div>
                <div className="w-full h-80 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getIncomeData()}>
                      <defs>
                        <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                      <ChartTooltip formatter={(val: any) => [`Rp ${Number(val).toLocaleString("id-ID")}`, "Pendapatan"]} />
                      <Area type="monotone" dataKey="Pendapatan" stroke="#EC4899" strokeWidth={3} fillOpacity={1} fill="url(#incomeColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Popular Treatments */}
              <div className="glass-panel p-6 border border-white/50 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                    <BarChart2 size={16} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Layanan Terpopuler (Sesi Selesai)</h3>
                </div>
                <div className="w-full h-80 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getPopularServicesData()} layout="vertical">
                      <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} width={90} />
                      <ChartTooltip formatter={(val: any) => [val, "Jumlah Sesi"]} />
                      <Bar dataKey="Jumlah Sesi" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={16}>
                        {getPopularServicesData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={["#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Print & Export Report Section */}
            <div className="glass-panel p-6 border border-white/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <FileText className="text-pink-500" size={18} /> Ekspor & Cetak Laporan Rekapitulasi (10 Kolom)
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Format rekapitulasi data mencakup 10 kolom standar bisnis (Tanggal, No, Nama Bayi, Umur, Alamat, No WA, Link WA, Layanan, Terapis, Tarif).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-5 py-3 font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all cursor-pointer justify-center"
                >
                  <FileText size={16} /> Export Spreadsheet (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-3 font-bold text-sm bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-slate-200 transition-all cursor-pointer justify-center"
                >
                  <Printer size={16} /> Cetak Laporan (PDF)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Proof Verification Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProof(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-lg p-6 relative z-10 border border-white/80 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Bukti Pembayaran QRIS</h3>
                <button
                  onClick={() => setSelectedProof(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Booking Info Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Booking Code</p>
                  <p className="font-mono font-bold text-slate-800">{selectedProof.booking_code}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Pembayaran</p>
                  <p className="font-bold text-pink-600">Rp {selectedProof.total_price.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Pelanggan</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-semibold text-slate-800">{selectedProof.user?.name}</p>
                    {selectedProof.user?.phone_number && (
                      <a
                        href={getWaLinkFromPhone(
                          selectedProof.user.phone_number,
                          `Halo Kak ${selectedProof.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa terkait konfirmasi bukti pembayaran reservasi (${selectedProof.booking_code}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25 border border-[#25D366]/30 transition-colors"
                        title="Chat WhatsApp Pelanggan"
                      >
                        <MessageCircle size={11} className="text-[#25D366]" />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                  {selectedProof.user?.phone_number && (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedProof.user.phone_number}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Layanan</p>
                  <p className="font-medium text-slate-700">{selectedProof.service?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Bayi Gemes</p>
                  <p className="font-semibold text-slate-800">{selectedProof.baby_name} ({selectedProof.baby_age} Bulan)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Catatan Khusus</p>
                  <p className="font-medium text-slate-700 text-xs italic">{selectedProof.notes ?? "Tidak ada catatan."}</p>
                </div>
                {selectedProof.delivery_address && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Alamat Kunjungan (Home Care)</p>
                    <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-1 space-y-1.5">
                      <p>{selectedProof.delivery_address.replace(/\n?📍 Titik GPS: https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g, "").trim() || "Titik GPS telah disematkan."}</p>
                      {selectedProof.delivery_address.match(/https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g)?.map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-pink-600 hover:text-pink-700 font-bold underline text-[11px]"
                        >
                          📍 Buka Rute Google Maps →
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Proof Image */}
              <div
                onClick={() => {
                  if (selectedProof.payment_proof_url) {
                    setZoomedProofImage(getStorageUrl(selectedProof.payment_proof_url));
                    setZoomScale(1);
                  }
                }}
                className={`w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200/60 relative flex items-center justify-center ${
                  selectedProof.payment_proof_url ? "cursor-zoom-in group" : ""
                }`}
                title={selectedProof.payment_proof_url ? "Klik untuk melihat gambar ukuran penuh" : undefined}
              >
                {selectedProof.payment_proof_url ? (
                  <>
                    <img
                      src={getStorageUrl(selectedProof.payment_proof_url)}
                      alt="Bukti Transfer QRIS"
                      className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs backdrop-blur-[1px]">
                      <ZoomIn size={18} />
                      <span>Klik untuk perbesar layar penuh</span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-2">
                    <FileImage size={40} />
                    <p className="text-xs">Gambar bukti pembayaran tidak ditemukan</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end mt-2">
                <button
                  onClick={() => handleVerify(selectedProof.id, "cancelled")}
                  className="px-5 py-2.5 font-semibold text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <XCircle size={16} /> Tolak Pembayaran
                </button>
                <button
                  onClick={() => handleVerify(selectedProof.id, "confirmed")}
                  className="px-5 py-2.5 font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 hover:shadow transition-all cursor-pointer"
                >
                  <CheckCircle size={16} /> Konfirmasi / Terima
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Image Lightbox Fullscreen Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {zoomedProofImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center"
            >
              {/* Control Toolbar */}
              <div className="w-full flex items-center justify-between pb-3 text-white">
                <span className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                  Perbesaran: {Math.round(zoomScale * 100)}%
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white cursor-pointer"
                    title="Perkecil (-)"
                  >
                    <ZoomOut size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white cursor-pointer"
                    title="Reset Ukuran (100%)"
                  >
                    100%
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white cursor-pointer"
                    title="Perbesar (+)"
                  >
                    <ZoomIn size={18} />
                  </button>

                  <a
                    href={zoomedProofImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white cursor-pointer inline-flex items-center"
                    title="Buka Gambar di Tab Baru"
                  >
                    <ExternalLink size={18} />
                  </a>

                  <button
                    type="button"
                    onClick={() => setZoomedProofImage(null)}
                    className="p-2 rounded-xl bg-rose-500/80 hover:bg-rose-600 border border-rose-400/40 transition-all text-white cursor-pointer ml-2"
                    title="Tutup (Esc)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Zoomable Image Container */}
              <div className="w-full max-h-[82vh] overflow-auto rounded-2xl bg-slate-900/50 border border-white/10 p-2 flex items-center justify-center shadow-2xl">
                <img
                  src={zoomedProofImage}
                  alt="Bukti Transfer Diperbesar"
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center" }}
                  className="max-h-[78vh] object-contain transition-transform duration-200 select-none shadow-lg rounded-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create / Edit Service Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {serviceModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-md p-6 relative z-10 border border-white/80 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">
                  {serviceModal.mode === "create" ? "Tambah Layanan Baru" : "Edit Layanan"}
                </h3>
                <button
                  onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nama Layanan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Baby Massage Classic"
                    className="input-glass w-full"
                    value={serviceModal.data?.name ?? ""}
                    onChange={(e) =>
                      setServiceModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, name: e.target.value },
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Deskripsi Layanan</label>
                  <textarea
                    placeholder="Jelaskan detail treatment spa untuk bayi..."
                    className="input-glass w-full h-24 resize-none py-2.5"
                    value={serviceModal.data?.description ?? ""}
                    onChange={(e) =>
                      setServiceModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, description: e.target.value },
                      }))
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Durasi (Menit)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 60"
                      className="input-glass w-full"
                      value={serviceModal.data?.duration_minutes ?? ""}
                      onChange={(e) =>
                        setServiceModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, duration_minutes: Number(e.target.value) },
                        }))
                      }
                      required
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Harga (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      className="input-glass w-full"
                      value={serviceModal.data?.price ?? ""}
                      onChange={(e) =>
                        setServiceModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, price: Number(e.target.value) },
                        }))
                      }
                      required
                      min={0}
                    />
                  </div>
                </div>

                {serviceModal.mode === "edit" && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="is_active"
                      className="w-4.5 h-4.5 rounded border-slate-300 text-pink-500 focus:ring-pink-400"
                      checked={serviceModal.data?.is_active ?? true}
                      onChange={(e) =>
                        setServiceModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, is_active: e.target.checked },
                        }))
                      }
                    />
                    <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                      Layanan ini aktif (Tampilkan di menu booking)
                    </label>
                  </div>
                )}

                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
                    className="px-5 py-2.5 font-semibold text-sm text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 font-semibold text-sm bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-lg shadow-pink-100 hover:shadow transition-all cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create / Edit Therapist Modal ────────────────────────────────── */}
      <AnimatePresence>
        {therapistModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-md p-6 relative z-10 border border-white/80 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">
                  {therapistModal.mode === "create" ? "Tambah Staf Terapis Baru" : "Edit Staf Terapis"}
                </h3>
                <button
                  onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTherapist} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nama Lengkap Terapis</label>
                  <input
                    type="text"
                    placeholder="Contoh: Terapis Susi"
                    className="input-glass w-full"
                    value={therapistModal.data?.name ?? ""}
                    onChange={(e) =>
                      setTherapistModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, name: e.target.value },
                      }))
                    }
                    required
                  />
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="therapist_is_active"
                    className="w-4.5 h-4.5 rounded border-slate-300 text-pink-500 focus:ring-pink-400"
                    checked={therapistModal.data?.is_active ?? true}
                    onChange={(e) =>
                      setTherapistModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, is_active: e.target.checked },
                      }))
                    }
                  />
                  <label htmlFor="therapist_is_active" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                    Staf terapis ini aktif (Bisa menerima booking sesi)
                  </label>
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
                    className="px-5 py-2.5 font-semibold text-sm text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 font-semibold text-sm bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-lg shadow-pink-100 hover:shadow transition-all cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Reschedule Reservation Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {rescheduleModal.isOpen && rescheduleModal.reservation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
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
                  <h3 className="text-xl font-bold text-slate-800">Reschedule Sesi Spa</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ubah tanggal & jam reservasi sesuai kesepakatan WhatsApp</p>
                </div>
                <button
                  onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Summary target booking */}
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/60 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-amber-800 font-bold">Booking Code:</span>
                  <span className="font-mono font-bold text-amber-900">{rescheduleModal.reservation.booking_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-800 font-bold">Pelanggan:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 font-semibold">{rescheduleModal.reservation.user?.name}</span>
                    {rescheduleModal.reservation.user?.phone_number && (
                      <a
                        href={getWaLinkFromPhone(
                          rescheduleModal.reservation.user.phone_number,
                          `Halo Kak ${rescheduleModal.reservation.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa ingin mengonfirmasi terkait jadwal reservasi (${rescheduleModal.reservation.booking_code}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25 border border-[#25D366]/30 transition-colors"
                        title="Chat WhatsApp Pelanggan"
                      >
                        <MessageCircle size={10} className="text-[#25D366]" />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-bold">Layanan:</span>
                  <span className="text-slate-800 font-semibold">{rescheduleModal.reservation.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-bold">Jadwal Lama:</span>
                  <span className="text-slate-700">
                    {rescheduleModal.reservation.reservation_date} | {rescheduleModal.reservation.start_time.substring(0, 5)} WIB
                  </span>
                </div>
              </div>

              <form onSubmit={handleReschedule} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tanggal Baru <span className="text-pink-500">*</span></label>
                  <input
                    type="date"
                    className="input-glass w-full"
                    value={rescheduleModal.date}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Jam Mulai Baru <span className="text-pink-500">*</span></label>
                  <select
                    className="input-glass w-full"
                    value={rescheduleModal.time}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, time: e.target.value })}
                    required
                  >
                    <option value="">-- Pilih Jam Baru --</option>
                    {["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00"].map((t) => (
                      <option key={t} value={t}>{t} WIB</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Alasan / Catatan Reschedule (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="Misal: Permintaan pelanggan via WA karena bayi demam..."
                    className="input-glass w-full resize-none py-2"
                    value={rescheduleModal.notes}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
                    className="px-5 py-2.5 font-semibold text-sm text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isRescheduling}
                    className="px-5 py-2.5 font-semibold text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-100 hover:shadow transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isRescheduling ? (
                      <><Loader2 size={15} className="animate-spin" /> Memproses...</>
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

      {/* LAPORAN PRINT TEMPLATE (Only visible on print) */}
      <div className="hidden print:block text-slate-800 p-8">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Mayesha Mom, Kids & Baby Spa</h1>
          <p className="text-sm text-slate-500">Laporan Transaksi & Reservasi Layanan Spa</p>
          <p className="text-xs text-slate-400 mt-1">
            Dicetak pada: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <h2 className="text-base font-bold mb-4 uppercase text-center">Ringkasan Performa Spa</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-8 border border-slate-300 p-4 rounded-xl text-center">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Booking</p>
            <p className="text-base font-extrabold mt-0.5">{reservations.length} Sesi</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sesi Selesai</p>
            <p className="text-base font-extrabold mt-0.5">{stats.completed_sessions} Sesi</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pendapatan</p>
            <p className="text-base font-extrabold mt-0.5 text-pink-600">Rp {stats.total_revenue.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <h2 className="text-xs font-bold mb-3 uppercase tracking-wider">Rekapitulasi Data Transaksi (10 Kolom Standar Spa)</h2>
        <table className="w-full text-left border-collapse border border-slate-300 text-[9px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-1.5 border border-slate-300 font-bold">1. Tanggal</th>
              <th className="p-1.5 border border-slate-300 font-bold text-center">2. NO</th>
              <th className="p-1.5 border border-slate-300 font-bold">3. Nama Bayi</th>
              <th className="p-1.5 border border-slate-300 font-bold">4. Umur</th>
              <th className="p-1.5 border border-slate-300 font-bold">5. Alamat / Catatan</th>
              <th className="p-1.5 border border-slate-300 font-bold">6. No WA</th>
              <th className="p-1.5 border border-slate-300 font-bold">7. Link WA</th>
              <th className="p-1.5 border border-slate-300 font-bold">8. Tindakan/Layanan</th>
              <th className="p-1.5 border border-slate-300 font-bold">9. Terapis</th>
              <th className="p-1.5 border border-slate-300 font-bold">10. Tarif</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r, idx) => {
              const phone = r.user?.phone_number ?? "-";
              const waLink = !r.user?.phone_number ? "-" : getWaLinkFromPhone(r.user.phone_number);
              return (
                <tr key={r.id} className="border-b border-slate-200">
                  <td className="p-1.5 border border-slate-300">
                    {new Date(r.reservation_date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-center font-bold">{idx + 1}</td>
                  <td className="p-1.5 border border-slate-300 font-bold">{r.baby_name}</td>
                  <td className="p-1.5 border border-slate-300">{r.baby_age} Bulan</td>
                  <td className="p-1.5 border border-slate-300 max-w-[120px] truncate">{r.notes ?? "-"}</td>
                  <td className="p-1.5 border border-slate-300 font-mono">{phone}</td>
                  <td className="p-1.5 border border-slate-300 font-mono text-[8px] truncate max-w-[100px]">{waLink}</td>
                  <td className="p-1.5 border border-slate-300 font-semibold">{r.service?.name}</td>
                  <td className="p-1.5 border border-slate-300">{r.therapist?.name ?? "Otomatis"}</td>
                  <td className="p-1.5 border border-slate-300 font-bold">Rp {r.total_price.toLocaleString("id-ID")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature */}
        <div className="mt-12 flex justify-end">
          <div className="text-center w-48">
            <p className="text-[10px]">Mengetahui,</p>
            <p className="text-[10px] font-bold mt-1">Pemilik Mayesha Baby Spa</p>
            <div className="h-16"></div>
            <p className="text-[10px] border-t border-slate-800 pt-1 font-bold">( ____________________ )</p>
          </div>
        </div>
      </div>
    </>
  );
}