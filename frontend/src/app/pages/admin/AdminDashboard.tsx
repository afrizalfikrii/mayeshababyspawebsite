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
  const [proofImgError, setProofImgError] = useState(false);
  const [zoomedProofImage, setZoomedProofImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // ── Services State ──────────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSegmentFilter, setServiceSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [isServLoading, setIsServLoading] = useState(false);
  const [serviceModal, setServiceModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data: Partial<Service> | null;
  }>({ isOpen: false, mode: "create", data: null });

  // ── Reports & Analytics Filter State ────────────────────────────────────────
  const [reportPreset, setReportPreset] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all");
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [reportSegment, setReportSegment] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [reportServiceId, setReportServiceId] = useState<string>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<"valid" | "all" | "completed" | "confirmed" | "cancelled">("all");
  const [chartTimeMode, setChartTimeMode] = useState<"monthly" | "daily">("monthly");
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [topServicesSort, setTopServicesSort] = useState<"most" | "least">("most");
  const [showAllTopServices, setShowAllTopServices] = useState<boolean>(false);



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

  // ── Klasifikasi Segmen (Bayi / Anak / Ibu) ──────────────────────────────────
  const getServiceClassification = (s?: Service | null): "Bayi" | "Anak" | "Ibu" => {
    if (!s) return "Bayi";
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

  const getReservationClassification = (r: Reservation): "Bayi" | "Anak" | "Ibu" => {
    const s = r.service;
    if (s?.category === "mom_treatment" || (s?.age_min_months !== null && s?.age_min_months !== undefined && s.age_min_months >= 216)) {
      return "Ibu";
    }
    if (
      (s?.age_min_months !== null && s?.age_min_months !== undefined && s.age_min_months >= 13) ||
      /kids|anak|1-3th|3-4th/i.test(s?.name ?? "")
    ) {
      return "Anak";
    }
    if (s?.age_max_months !== null && s?.age_max_months !== undefined && s.age_max_months <= 12) {
      return "Bayi";
    }
    if (r.baby_age > 12) {
      return "Anak";
    }
    return "Bayi";
  };

  const getClassificationBadge = (cls: "Bayi" | "Anak" | "Ibu") => {
    const styles: Record<"Bayi" | "Anak" | "Ibu", { bg: string; dot: string; label: string }> = {
      Bayi: { bg: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", label: "Bayi" },
      Anak: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Anak" },
      Ibu: { bg: "bg-pink-50 text-pink-700 border-pink-200", dot: "bg-pink-500", label: "Ibu" },
    };
    const st = styles[cls];
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-bold whitespace-nowrap ${st.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        <span>{st.label}</span>
      </span>
    );
  };

  const getReservationDateStr = (r: Reservation): string => {
    if (r.reservation_date) return r.reservation_date.slice(0, 10);
    if (r.created_at) return r.created_at.slice(0, 10);
    return "";
  };

  const formatLocalYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const applyReportPreset = (preset: "all" | "today" | "week" | "month" | "year") => {
    setReportPreset(preset);
    const now = new Date();
    if (preset === "all") {
      setReportStartDate("");
      setReportEndDate("");
    } else if (preset === "today") {
      const todayStr = formatLocalYMD(now);
      setReportStartDate(todayStr);
      setReportEndDate(todayStr);
      setChartTimeMode("daily");
    } else if (preset === "week") {
      const endStr = formatLocalYMD(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      setReportStartDate(formatLocalYMD(start));
      setReportEndDate(endStr);
      setChartTimeMode("daily");
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setReportStartDate(formatLocalYMD(firstDay));
      setReportEndDate(formatLocalYMD(lastDay));
      setChartTimeMode("daily");
    } else if (preset === "year") {
      setReportStartDate(`${now.getFullYear()}-01-01`);
      setReportEndDate(`${now.getFullYear()}-12-31`);
      setChartYear(now.getFullYear());
      setChartTimeMode("monthly");
    }
  };

  const resetReportFilters = () => {
    setReportPreset("all");
    setReportStartDate("");
    setReportEndDate("");
    setReportSegment("all");
    setReportServiceId("all");
    setReportStatusFilter("all");
    setSearchQuery("");
  };

  const isPaidReservation = (r: Reservation) =>
    r.status === "confirmed" || r.status === "completed";

  // ── Data Laporan Terfilter ──────────────────────────────────────────────────
  const reportFilteredReservations = reservations.filter((r) => {
    // 1. Filter Status
    if (reportStatusFilter === "valid") {
      if (r.status !== "confirmed" && r.status !== "completed") return false;
    } else if (reportStatusFilter !== "all") {
      if (r.status !== reportStatusFilter) return false;
    }

    // 2. Filter Rentang Tanggal (Start Date & End Date)
    const rDate = getReservationDateStr(r);
    if (reportStartDate && rDate < reportStartDate) return false;
    if (reportEndDate && rDate > reportEndDate) return false;

    // 3. Filter Klasifikasi Segmen (Bayi / Anak / Ibu)
    const cls = getReservationClassification(r);
    if (reportSegment !== "all" && cls !== reportSegment) return false;

    // 4. Filter Jenis Layanan Spesifik (dari 36 Layanan)
    if (reportServiceId !== "all" && String(r.service?.id ?? "") !== reportServiceId) return false;

    // 5. Filter Pencarian Kata Kunci
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matches =
        r.booking_code.toLowerCase().includes(q) ||
        (r.user?.name ?? "").toLowerCase().includes(q) ||
        (r.baby_name ?? "").toLowerCase().includes(q) ||
        (r.service?.name ?? "").toLowerCase().includes(q) ||
        (r.therapist?.name ?? "").toLowerCase().includes(q) ||
        cls.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  // ── Statistik Kuantitatif Dashboard (Bulan Ini vs Bulan Lalu, Tahun Ini, Segmen) ──
  const validReservations = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "completed"
  );

  const nowDate = new Date();
  const currentYearNum = nowDate.getFullYear();
  const currentMonthNum = nowDate.getMonth(); // 0-11
  const currentYearMonthPrefix = `${currentYearNum}-${String(currentMonthNum + 1).padStart(2, "0")}`;

  const prevMonthDate = new Date(currentYearNum, currentMonthNum - 1, 1);
  const prevYearMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthReservations = validReservations.filter((r) =>
    getReservationDateStr(r).startsWith(currentYearMonthPrefix)
  );
  const lastMonthReservations = validReservations.filter((r) =>
    getReservationDateStr(r).startsWith(prevYearMonthPrefix)
  );
  const thisYearReservations = validReservations.filter((r) =>
    getReservationDateStr(r).startsWith(`${currentYearNum}-`)
  );

  const thisMonthRevenue = thisMonthReservations.reduce((sum, r) => sum + Number(r.total_price), 0);
  const lastMonthRevenue = lastMonthReservations.reduce((sum, r) => sum + Number(r.total_price), 0);
  const thisYearRevenue = thisYearReservations.reduce((sum, r) => sum + Number(r.total_price), 0);

  const monthGrowthPct =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0
        ? 100
        : 0;

  const overallSegmentStats = {
    Bayi: validReservations.filter((r) => getReservationClassification(r) === "Bayi").length,
    Anak: validReservations.filter((r) => getReservationClassification(r) === "Anak").length,
    Ibu: validReservations.filter((r) => getReservationClassification(r) === "Ibu").length,
  };

  // ── Ringkasan Kuantitatif pada Periode Laporan Terfilter ────────────────────
  const filteredPaidReservations = reportFilteredReservations.filter(isPaidReservation);
  const filteredTotalRevenue = filteredPaidReservations.reduce(
    (sum, r) => sum + Number(r.total_price),
    0
  );
  const filteredSegmentStats = {
    Bayi: {
      count: filteredPaidReservations.filter((r) => getReservationClassification(r) === "Bayi").length,
      revenue: filteredPaidReservations
        .filter((r) => getReservationClassification(r) === "Bayi")
        .reduce((sum, r) => sum + Number(r.total_price), 0),
    },
    Anak: {
      count: filteredPaidReservations.filter((r) => getReservationClassification(r) === "Anak").length,
      revenue: filteredPaidReservations
        .filter((r) => getReservationClassification(r) === "Anak")
        .reduce((sum, r) => sum + Number(r.total_price), 0),
    },
    Ibu: {
      count: filteredPaidReservations.filter((r) => getReservationClassification(r) === "Ibu").length,
      revenue: filteredPaidReservations
        .filter((r) => getReservationClassification(r) === "Ibu")
        .reduce((sum, r) => sum + Number(r.total_price), 0),
    },
  };

  // ── Data Grafik Fluktuasi Bulanan (Januari – Desember) & Harian ─────────────
  const availableYears = Array.from(
    new Set([
      currentYearNum,
      currentYearNum - 1,
      ...reservations
        .map((r) => Number(getReservationDateStr(r).slice(0, 4)))
        .filter((y) => y > 2020),
    ])
  ).sort((a, b) => b - a);

  const getFluctuationChartData = () => {
    const baseList = reservations.filter((r) => {
      if (reportStatusFilter === "all" || reportStatusFilter === "valid") {
        if (!isPaidReservation(r)) return false;
      } else if (r.status !== reportStatusFilter) {
        return false;
      }
      if (reportSegment !== "all" && getReservationClassification(r) !== reportSegment) return false;
      if (reportServiceId !== "all" && String(r.service?.id ?? "") !== reportServiceId) return false;
      return true;
    });

    if (chartTimeMode === "monthly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return monthNames.map((mName, idx) => {
        const prefix = `${chartYear}-${String(idx + 1).padStart(2, "0")}`;
        const monthItems = baseList.filter((r) => getReservationDateStr(r).startsWith(prefix));
        const bayiItems = monthItems.filter((r) => getReservationClassification(r) === "Bayi");
        const anakItems = monthItems.filter((r) => getReservationClassification(r) === "Anak");
        const ibuItems = monthItems.filter((r) => getReservationClassification(r) === "Ibu");

        return {
          label: mName,
          Pendapatan: monthItems.reduce((sum, r) => sum + Number(r.total_price), 0),
          "Total Transaksi": monthItems.length,
          Bayi: bayiItems.length,
          Anak: anakItems.length,
          Ibu: ibuItems.length,
          "Omset Bayi": bayiItems.reduce((s, r) => s + Number(r.total_price), 0),
          "Omset Anak": anakItems.reduce((s, r) => s + Number(r.total_price), 0),
          "Omset Ibu": ibuItems.reduce((s, r) => s + Number(r.total_price), 0),
        };
      });
    }

    // Mode Harian: Gunakan rentang reportStartDate s/d reportEndDate (atau 14 hari terakhir jika kosong)
    let startD = reportStartDate ? new Date(reportStartDate + "T00:00:00") : new Date();
    const endD = reportEndDate ? new Date(reportEndDate + "T00:00:00") : new Date();
    if (!reportStartDate) {
      startD = new Date(endD);
      startD.setDate(startD.getDate() - 13);
    }

    const dailyData = [];
    const cur = new Date(startD);
    let safety = 0;
    while (cur <= endD && safety < 62) {
      const dStr = formatLocalYMD(cur);
      const dayItems = baseList.filter((r) => getReservationDateStr(r) === dStr);
      dailyData.push({
        label: cur.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        Pendapatan: dayItems.reduce((sum, r) => sum + Number(r.total_price), 0),
        "Total Transaksi": dayItems.length,
        Bayi: dayItems.filter((r) => getReservationClassification(r) === "Bayi").length,
        Anak: dayItems.filter((r) => getReservationClassification(r) === "Anak").length,
        Ibu: dayItems.filter((r) => getReservationClassification(r) === "Ibu").length,
      });
      cur.setDate(cur.getDate() + 1);
      safety++;
    }
    return dailyData;
  };

  // ── Data Rekap Peringkat Layanan Paling Laris (Top Services dari 36 Layanan) ──
  const getRankedServicesData = () => {
    const map: Record<
      string,
      {
        id: number;
        name: string;
        shortName: string;
        classification: "Bayi" | "Anak" | "Ibu";
        unitPrice: number;
        count: number;
        revenue: number;
      }
    > = {};

    // Inisialisasi dari master 36 layanan agar layanan dengan 0 transaksi juga bisa dianalisis
    services.forEach((s) => {
      const cls = getServiceClassification(s);
      if (reportSegment !== "all" && cls !== reportSegment) return;
      if (reportServiceId !== "all" && String(s.id) !== reportServiceId) return;
      map[s.name] = {
        id: s.id,
        name: s.name,
        shortName: s.name.length > 18 ? s.name.substring(0, 15) + "..." : s.name,
        classification: cls,
        unitPrice: Number(s.price),
        count: 0,
        revenue: 0,
      };
    });

    // Hitung dari transaksi terfilter yang sah (dikonfirmasi / selesai)
    filteredPaidReservations.forEach((r) => {
      const sName = r.service?.name || "Layanan Lain";
      const cls = getReservationClassification(r);
      if (!map[sName]) {
        map[sName] = {
          id: r.service?.id ?? 0,
          name: sName,
          shortName: sName.length > 18 ? sName.substring(0, 15) + "..." : sName,
          classification: cls,
          unitPrice: Number(r.service?.price ?? r.total_price),
          count: 0,
          revenue: 0,
        };
      }
      map[sName].count += 1;
      map[sName].revenue += Number(r.total_price);
    });

    const list = Object.values(map);
    list.sort((a, b) => {
      if (topServicesSort === "most") {
        return b.count - a.count || b.revenue - a.revenue;
      }
      return a.count - b.count || a.revenue - b.revenue;
    });

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      "Jumlah Sesi": item.count,
    }));
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
    const sourceData = activeMenu === "reports" ? reportFilteredReservations : filteredReservations;
    const headers = [
      "NO",
      "Kode Booking",
      "Tanggal Transaksi",
      "Jam Sesi",
      "ID & Nama Customer",
      "Nama Bayi/Anak",
      "Umur",
      "Klasifikasi (Bayi/Anak/Ibu)",
      "Nama Layanan",
      "Terapis",
      "No WA",
      "Link WA",
      "Alamat / Catatan",
      "Status",
      "Nominal Dibayar (Rp)",
    ];
    const rows = sourceData.map((r, idx) => {
      const dateFormatted = new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeSlot = `"${(r.start_time ?? "").slice(0, 5)} - ${(r.end_time ?? "").slice(0, 5)} WIB"`;
      const customerInfo = `"#${r.user?.id ?? "-"} - ${(r.user?.name ?? "Pelanggan").replace(/"/g, '""')}"`;
      const babyName = `"${(r.baby_name ?? "-").replace(/"/g, '""')}"`;
      const babyAge = `"${r.baby_age} Bulan"`;
      const classification = `"${getReservationClassification(r)}"`;
      const serviceName = r.service?.name ? `"${r.service.name.replace(/"/g, '""')}"` : '"-"';
      const therapistName = `"${r.therapist?.name ?? "Otomatis"}"`;
      const phone = `"${r.user?.phone_number ?? "-"}"`;
      const waLink = !r.user?.phone_number ? '"-"' : `"${getWaLinkFromPhone(r.user.phone_number)}"`;
      const notes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '"-"';
      const statusLabel = `"${r.status}"`;
      const price = `"${Number(r.total_price).toLocaleString("id-ID")}"`;

      return [
        idx + 1,
        `"${r.booking_code}"`,
        dateFormatted,
        timeSlot,
        customerInfo,
        babyName,
        babyAge,
        classification,
        serviceName,
        therapistName,
        phone,
        waLink,
        notes,
        statusLabel,
        price,
      ].join(",");
    });

    const totalSum = sourceData
      .filter(isPaidReservation)
      .reduce((sum, r) => sum + Number(r.total_price), 0);
    const footerRow = [
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"TOTAL PENDAPATAN"',
      `"Rp ${totalSum.toLocaleString("id-ID")}"`,
    ].join(",");

    const csvContent = "\uFEFF" + [headers.join(","), ...rows, footerRow].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Transaksi_Mayesha_Spa_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan Transaksi & Keuangan (CSV/Excel) berhasil di-download!");
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
    const cls = getServiceClassification(s);
    if (serviceSegmentFilter !== "all" && cls !== serviceSegmentFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      cls.toLowerCase().includes(q)
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

        {/* Stats Summary Grid (Data Kuantitatif Dashboard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Pendapatan & Transaksi Bulan Ini vs Bulan Lalu */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-5 border border-white/50 shadow-md shadow-slate-100/50 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendapatan Bulan Ini</p>
              <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-extrabold text-slate-800">
                Rp {thisMonthRevenue.toLocaleString("id-ID")}
              </h3>
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="font-semibold text-slate-600">{thisMonthReservations.length} Transaksi</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full ${monthGrowthPct >= 0
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                    }`}
                  title={`Bulan lalu: Rp ${lastMonthRevenue.toLocaleString("id-ID")} (${lastMonthReservations.length} transaksi)`}
                >
                  {monthGrowthPct >= 0 ? `▲ +${monthGrowthPct}%` : `▼ ${monthGrowthPct}%`} vs Bln Lalu
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Bulan lalu: Rp {lastMonthRevenue.toLocaleString("id-ID")} ({lastMonthReservations.length} sesi)
              </p>
            </div>
          </motion.div>

          {/* Card 2: Pendapatan & Transaksi Tahun Ini */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel p-5 border border-white/50 shadow-md shadow-slate-100/50 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pendapatan Tahun {currentYearNum}
              </p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <BarChart2 size={18} />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-extrabold text-slate-800">
                Rp {thisYearRevenue.toLocaleString("id-ID")}
              </h3>
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="font-semibold text-emerald-600">{thisYearReservations.length} Transaksi Tahun Ini</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Total Akumulasi: Rp {stats.total_revenue.toLocaleString("id-ID")}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Rincian Kuantitatif Segmen (Bayi / Anak / Ibu) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-5 border border-white/50 shadow-md shadow-slate-100/50 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaksi per Segmen</p>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-200/80 bg-slate-50/80 border border-slate-200/70 rounded-xl py-2 mt-2">
              <div className="text-center px-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Bayi</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{overallSegmentStats.Bayi}</p>
              </div>
              <div className="text-center px-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Anak</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{overallSegmentStats.Anak}</p>
              </div>
              <div className="text-center px-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ibu</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{overallSegmentStats.Ibu}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Total {validReservations.length} transaksi terkonfirmasi & selesai
            </p>
          </motion.div>

          {/* Card 4: Operasional Hari Ini & Pelanggan */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-panel p-5 border border-white/50 shadow-md shadow-slate-100/50 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operasional & Pelanggan</p>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-extrabold text-slate-800">
                {stats.completed_sessions} <span className="text-xs font-semibold text-slate-500">Sesi Selesai</span>
              </h3>
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="font-semibold text-blue-600">Hari Ini: {stats.today_bookings} Booking</span>
                <span className="font-semibold text-purple-600">{stats.total_customers} Pelanggan</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Katalog Aktif: {services.filter((s) => s.is_active).length} dari {services.length} Layanan
              </p>
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-5 sm:gap-6 overflow-x-auto whitespace-nowrap border-b border-slate-200/60 pb-px mb-6 sm:mb-8 print:hidden">
          <button
            onClick={() => setActiveMenu("reservations")}
            className={`pb-3 text-sm sm:text-lg font-semibold transition-all relative cursor-pointer shrink-0 ${activeMenu === "reservations" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Kelola Reservasi
            {activeMenu === "reservations" && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveMenu("services")}
            className={`pb-3 text-sm sm:text-lg font-semibold transition-all relative cursor-pointer shrink-0 ${activeMenu === "services" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Kelola Layanan
            {activeMenu === "services" && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveMenu("therapists")}
            className={`pb-3 text-sm sm:text-lg font-semibold transition-all relative cursor-pointer shrink-0 ${activeMenu === "therapists" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Kelola Terapis
            {activeMenu === "therapists" && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveMenu("reports")}
            className={`pb-3 text-sm sm:text-lg font-semibold transition-all relative cursor-pointer shrink-0 ${activeMenu === "reports" ? "text-pink-600" : "text-slate-400 hover:text-slate-600"
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
              {/* Filter Segmented Control Bar */}
              <div className="flex lg:inline-flex flex-nowrap items-center gap-1 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 w-full lg:w-fit overflow-x-auto">
                {[
                  { id: "all", label: "Semua", count: reservations.length },
                  {
                    id: "waiting_verification",
                    label: "Menunggu Verifikasi",
                    count: reservations.filter((r) => r.status === "waiting_verification").length,
                    highlight: true,
                  },
                  {
                    id: "pending",
                    label: "Belum Bayar",
                    count: reservations.filter((r) => r.status === "pending").length,
                  },
                  {
                    id: "confirmed",
                    label: "Dikonfirmasi",
                    count: reservations.filter((r) => r.status === "confirmed").length,
                  },
                  {
                    id: "rescheduled",
                    label: "Reschedule",
                    count: reservations.filter((r) => r.is_rescheduled).length,
                  },
                  {
                    id: "cancelled",
                    label: "Dibatalkan",
                    count: reservations.filter((r) => r.status === "cancelled").length,
                  },
                  {
                    id: "completed",
                    label: "Selesai",
                    count: reservations.filter((r) => r.status === "completed").length,
                  },
                ].map((f) => {
                  const isActive = resFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setResFilter(f.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 whitespace-nowrap ${isActive
                        ? "bg-white text-pink-600 shadow-sm ring-1 ring-slate-200/60"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                        }`}
                    >
                      <span>{f.label}</span>
                      {f.count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none ${f.highlight && !isActive
                            ? "bg-pink-500 text-white"
                            : isActive
                              ? "bg-pink-50 text-pink-600"
                              : "bg-slate-200/80 text-slate-600"
                            }`}
                        >
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
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
                                  onClick={() => {
                                    setSelectedProof(r);
                                    setProofImgError(false);
                                  }}
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
              {/* Filter Klasifikasi Layanan (Bayi / Anak / Ibu) & Tombol Tambah */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex lg:inline-flex flex-nowrap items-center gap-1 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 w-full lg:w-fit overflow-x-auto">
                  {[
                    { id: "all", label: "Semua Layanan", count: services.length },
                    {
                      id: "Bayi",
                      label: "Bayi",
                      count: services.filter((s) => getServiceClassification(s) === "Bayi").length,
                    },
                    {
                      id: "Anak",
                      label: "Anak",
                      count: services.filter((s) => getServiceClassification(s) === "Anak").length,
                    },
                    {
                      id: "Ibu",
                      label: "Ibu",
                      count: services.filter((s) => getServiceClassification(s) === "Ibu").length,
                    },
                  ].map((f) => {
                    const isActive = serviceSegmentFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setServiceSegmentFilter(f.id as "all" | "Bayi" | "Anak" | "Ibu")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 whitespace-nowrap ${isActive
                          ? "bg-white text-pink-600 shadow-sm ring-1 ring-slate-200/60"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                      >
                        <span>{f.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none ${isActive
                            ? "bg-pink-50 text-pink-600"
                            : "bg-slate-200/80 text-slate-600"
                            }`}
                        >
                          {f.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setServiceModal({ isOpen: true, mode: "create", data: {} })}
                  className="btn-primary py-2.5 px-5 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
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
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-20">
                    <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-600 font-semibold text-lg">Tidak ada layanan ditemukan</p>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                      Coba pilih filter klasifikasi lain atau tambahkan layanan baru.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Layanan</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Klasifikasi</th>
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
                            <td className="py-4 px-6">{getClassificationBadge(getServiceClassification(s))}</td>
                            <td className="py-4 px-6 text-slate-500 text-xs max-w-xs truncate">{s.description}</td>
                            <td className="py-4 px-6 text-slate-700 text-sm font-medium">{s.duration_minutes} Menit</td>
                            <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                              Rp {s.price.toLocaleString("id-ID")}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${s.is_active
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
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${t.is_active
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
              {/* ── PANEL 3 FILTER WAJIB LAPORAN TRANSAKSI & KEUANGAN ─────────────── */}
              <div className="glass-panel p-6 border border-white/50 shadow-lg flex flex-col gap-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <FileText className="text-pink-500" size={18} />
                      Filter Laporan Transaksi, Keuangan & Analitik
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Saring laporan berdasarkan rentang tanggal (Start–End Date), preset periode, klasifikasi (Bayi, Anak, Ibu), maupun jenis layanan.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={resetReportFilters}
                      className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Reset Filter
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-4 py-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-100 transition-all cursor-pointer"
                    >
                      <Download size={14} /> Export CSV/Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-slate-200 transition-all cursor-pointer"
                    >
                      <Printer size={14} /> Cetak Laporan (PDF)
                    </button>
                  </div>
                </div>

                {/* Filter 1: Preset Waktu Cepat */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    1. Preset Periode Waktu & Rentang Tanggal (Start Date – End Date)
                  </label>
                  <div className="flex lg:inline-flex flex-nowrap items-center gap-1 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 w-full lg:w-fit overflow-x-auto">
                    {[
                      { id: "all", label: "Semua Waktu" },
                      { id: "today", label: "Harian" },
                      { id: "week", label: "Mingguan" },
                      { id: "month", label: "Bulanan" },
                      { id: "year", label: "Tahunan" },
                    ].map((p) => {
                      const isActive = reportPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyReportPreset(p.id as "all" | "today" | "week" | "month" | "year")}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                            isActive
                              ? "bg-white text-pink-600 shadow-sm ring-1 ring-slate-200/60"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Input Start Date & End Date + Filter Klasifikasi & Layanan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Dari Tanggal (Start Date)
                      </label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => {
                          setReportStartDate(e.target.value);
                          setReportPreset("custom");
                        }}
                        className="input-glass w-full py-2 px-3 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Sampai Tanggal (End Date)
                      </label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => {
                          setReportEndDate(e.target.value);
                          setReportPreset("custom");
                        }}
                        className="input-glass w-full py-2 px-3 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        2. Jenis Layanan (36 Layanan)
                      </label>
                      <select
                        value={reportServiceId}
                        onChange={(e) => setReportServiceId(e.target.value)}
                        className="input-glass w-full py-2 px-3 text-xs font-medium bg-white"
                      >
                        <option value="all">Semua Layanan ({services.length} Layanan)</option>
                        {services.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            [{getServiceClassification(s)}] {s.name} — Rp {Number(s.price).toLocaleString("id-ID")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Status Transaksi
                      </label>
                      <select
                        value={reportStatusFilter}
                        onChange={(e) => setReportStatusFilter(e.target.value as any)}
                        className="input-glass w-full py-2 px-3 text-xs font-medium bg-white"
                      >
                        <option value="all">Semua Status Reservasi (Sinkron Kelola Reservasi)</option>
                        <option value="valid">Transaksi Sah Saja (Dikonfirmasi & Selesai)</option>
                        <option value="completed">Selesai Saja</option>
                        <option value="confirmed">Dikonfirmasi Saja</option>
                        <option value="cancelled">Dibatalkan Saja</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filter 2: Klasifikasi Segmen (Bayi / Anak / Ibu) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                      Klasifikasi Segmen:
                    </span>
                    <div className="flex lg:inline-flex flex-nowrap items-center gap-1 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 w-full sm:w-fit overflow-x-auto">
                      {[
                        { id: "all", label: "Semua Segmen" },
                        { id: "Bayi", label: "Bayi (0–1 Thn)" },
                        { id: "Anak", label: "Anak (1–5 Thn)" },
                        { id: "Ibu", label: "Ibu (Mom)" },
                      ].map((seg) => {
                        const isActive = reportSegment === seg.id;
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => setReportSegment(seg.id as "all" | "Bayi" | "Anak" | "Ibu")}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                              isActive
                                ? "bg-white text-pink-600 shadow-sm ring-1 ring-slate-200/60"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                            }`}
                          >
                            {seg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Menampilkan <span className="font-bold text-pink-600">{reportFilteredReservations.length}</span> data (
                    <span className="font-bold text-emerald-600">{filteredPaidReservations.length}</span> transaksi sah/lunas)
                    {reportStartDate || reportEndDate
                      ? ` • ${reportStartDate || "Awal"} s/d ${reportEndDate || "Sekarang"}`
                      : " • Semua Periode"}
                  </p>
                </div>
              </div>

              {/* ── KARTU KUANTITATIF PERIODE TERFILTER (KEUANGAN & SEGMEN) ────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 border border-slate-200/70 bg-white shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Omset (Transaksi Sah)
                  </p>
                  <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                    Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Dari <span className="font-bold text-slate-700">{filteredPaidReservations.length}</span> transaksi sah (total {reportFilteredReservations.length} baris)
                  </p>
                </div>

                <div className="glass-panel p-5 border border-slate-200/70 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Segmen Bayi
                    </p>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {filteredPaidReservations.length > 0
                        ? Math.round((filteredSegmentStats.Bayi.count / filteredPaidReservations.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                    {filteredSegmentStats.Bayi.count} <span className="text-xs font-semibold text-slate-500">Transaksi Sah</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Omset: Rp {filteredSegmentStats.Bayi.revenue.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="glass-panel p-5 border border-slate-200/70 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Segmen Anak
                    </p>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {filteredPaidReservations.length > 0
                        ? Math.round((filteredSegmentStats.Anak.count / filteredPaidReservations.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                    {filteredSegmentStats.Anak.count} <span className="text-xs font-semibold text-slate-500">Transaksi Sah</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Omset: Rp {filteredSegmentStats.Anak.revenue.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="glass-panel p-5 border border-slate-200/70 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Segmen Ibu
                    </p>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {filteredPaidReservations.length > 0
                        ? Math.round((filteredSegmentStats.Ibu.count / filteredPaidReservations.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                    {filteredSegmentStats.Ibu.count} <span className="text-xs font-semibold text-slate-500">Transaksi Sah</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Omset: Rp {filteredSegmentStats.Ibu.revenue.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* ── KONTROL MODE GRAFIK FLUKTUASI (BULANAN JAN–DES / HARIAN) ──────── */}
              <div className="glass-panel px-6 py-4 border border-white/50 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                    Infografis Fluktuasi Keuangan & Komparasi Segmen (Bayi vs Anak vs Ibu)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih tampilan grafik fluktuasi bulanan (Januari–Desember) atau harian.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setChartTimeMode("monthly")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartTimeMode === "monthly" ? "bg-white text-pink-600 shadow-xs" : "text-slate-600"
                        }`}
                    >
                      Bulanan (Jan–Des)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartTimeMode("daily")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartTimeMode === "daily" ? "bg-white text-pink-600 shadow-xs" : "text-slate-600"
                        }`}
                    >
                      Harian
                    </button>
                  </div>

                  {chartTimeMode === "monthly" && (
                    <select
                      value={chartYear}
                      onChange={(e) => setChartYear(Number(e.target.value))}
                      className="input-glass py-1.5 px-3 text-xs font-bold bg-white"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Tahun {yr}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* ── GRID INFOGRAFIS 1 & 2 ─────────────────────────────────────────── */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Infografis 1: Grafik Fluktuasi Pendapatan */}
                <div className="glass-panel p-6 border border-white/50 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                          {chartTimeMode === "monthly"
                            ? `Fluktuasi Pendapatan Bulanan (${chartYear})`
                            : "Fluktuasi Pendapatan Harian"}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Tren naik-turunnya omset keuangan berdasarkan periode
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-80 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getFluctuationChartData()}>
                        <defs>
                          <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `Rp ${val / 1000}k`}
                        />
                        <ChartTooltip
                          formatter={(val: any, name: any) =>
                            name === "Pendapatan"
                              ? [`Rp ${Number(val).toLocaleString("id-ID")}`, "Pendapatan"]
                              : [`${val} Sesi`, name]
                          }
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Area
                          type="monotone"
                          dataKey="Pendapatan"
                          stroke="#EC4899"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#incomeColor)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Infografis 2: Grafik Fluktuasi & Komparasi Segmen (Bayi vs Anak vs Ibu) */}
                <div className="glass-panel p-6 border border-white/50 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center">
                        <BarChart2 size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                          {chartTimeMode === "monthly"
                            ? `Komparasi & Fluktuasi Bayi, Anak, Ibu (${chartYear})`
                            : "Komparasi Harian: Bayi vs Anak vs Ibu"}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Perbandingan jumlah sesi transaksi per klasifikasi konsumen
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-80 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFluctuationChartData()}>
                        <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis allowDecimals={false} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                        <ChartTooltip formatter={(val: any, name: any) => [`${val} Transaksi`, `Segmen ${name}`]} />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="Bayi" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Anak" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Ibu" fill="#EC4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── INFOGRAFIS 3 & REKAP LAYANAN PALING LARIS (TOP SERVICES DARI 36 LAYANAN) ── */}
              <div className="glass-panel p-6 border border-white/50 shadow-lg flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                        3. Peringkat & Rekapitulasi Layanan Paling Laris (Top Services)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Urutan layanan berdasarkan jumlah pemesanan dan kontribusi pendapatan dari total {services.length} layanan.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setTopServicesSort("most")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${topServicesSort === "most" ? "bg-white text-pink-600 shadow-xs" : "text-slate-600"
                          }`}
                      >
                        Paling Laris
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopServicesSort("least")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${topServicesSort === "least" ? "bg-white text-pink-600 shadow-xs" : "text-slate-600"
                          }`}
                      >
                        Paling Jarang
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllTopServices(!showAllTopServices)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {showAllTopServices ? "Tampilkan Top 10 Saja" : `Tampilkan Semua (${getRankedServicesData().length})`}
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-6 items-start">
                  {/* Grafik Top 8 Layanan */}
                  <div className="lg:col-span-5 bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      Visualisasi 8 Layanan ({topServicesSort === "most" ? "Terlaris" : "Terjarang"})
                    </p>
                    <div className="w-full h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getRankedServicesData().slice(0, 8)} layout="vertical">
                          <XAxis type="number" allowDecimals={false} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis dataKey="shortName" type="category" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} width={110} />
                          <ChartTooltip
                            formatter={(val: any, _name: any, props: any) => [
                              `${val} Sesi (Rp ${Number(props?.payload?.revenue ?? 0).toLocaleString("id-ID")})`,
                              props?.payload?.name ?? "Jumlah Sesi",
                            ]}
                          />
                          <Bar dataKey="Jumlah Sesi" radius={[0, 4, 4, 0]} barSize={16}>
                            {getRankedServicesData()
                              .slice(0, 8)
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.classification === "Bayi"
                                      ? "#0EA5E9"
                                      : entry.classification === "Anak"
                                        ? "#F59E0B"
                                        : "#EC4899"
                                  }
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabel Rekap Peringkat Layanan */}
                  <div className="lg:col-span-7 overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase">Rank</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase">Nama Layanan</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase">Klasifikasi</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-right">Harga Satuan</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-center">Terjual</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-right">Total Omset</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(showAllTopServices ? getRankedServicesData() : getRankedServicesData().slice(0, 10)).map((item) => (
                          <tr key={item.name} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 font-extrabold text-slate-700">#{item.rank}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{item.name}</td>
                            <td className="py-2.5 px-4">{getClassificationBadge(item.classification)}</td>
                            <td className="py-2.5 px-4 text-right text-slate-600">
                              Rp {item.unitPrice.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full font-extrabold bg-pink-50 text-pink-600 border border-pink-100">
                                {item.count} Sesi
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                              Rp {item.revenue.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── TABEL DETAIL LAPORAN TRANSAKSI & KEUANGAN (DI LAYAR) ──────────── */}
              <div className="glass-panel overflow-hidden border border-white/50 shadow-xl">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <FileText className="text-pink-500" size={18} />
                      Tabel Detail Laporan Transaksi & Keuangan
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Menampilkan rincian ID & Nama Customer, Tanggal & Jam Transaksi, Nama Layanan, Klasifikasi (Bayi/Anak/Ibu), serta Nominal Pembayaran.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Total Pendapatan Terfilter</p>
                    <p className="text-lg font-extrabold text-pink-600">
                      Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {reportFilteredReservations.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="mx-auto text-slate-300 mb-3" size={42} />
                    <p className="text-slate-600 font-semibold text-base">
                      Tidak ada data transaksi pada filter ini
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Silakan ubah rentang tanggal (Start–End Date) atau pilih klasifikasi layanan lainnya.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                            No
                          </th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            ID & Nama Customer
                          </th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Tanggal & Jam Transaksi
                          </th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Nama Layanan
                          </th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Klasifikasi
                          </th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Terapis & Status
                          </th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            Nominal Dibayar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {reportFilteredReservations.map((r, idx) => {
                          const cls = getReservationClassification(r);
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 text-center font-bold text-slate-500 text-xs">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                    #{r.user?.id ?? "-"}
                                  </span>
                                  <span className="font-bold text-slate-800">{r.user?.name ?? "Pelanggan"}</span>
                                </div>
                                <p className="text-xs text-pink-600 font-medium mt-0.5">
                                  Kode: <span className="font-mono font-bold">{r.booking_code}</span> • Anak:{" "}
                                  <span className="font-semibold">{r.baby_name}</span> ({r.baby_age} Bln)
                                </p>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-slate-800 text-xs">
                                  {new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock size={11} className="text-pink-400" />
                                  {(r.start_time ?? "").slice(0, 5)} – {(r.end_time ?? "").slice(0, 5)} WIB
                                </p>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs">
                                {r.service?.name ?? "-"}
                              </td>
                              <td className="py-3.5 px-4">{getClassificationBadge(cls)}</td>
                              <td className="py-3.5 px-4">
                                <p className="text-xs font-medium text-slate-700 mb-1">
                                  {r.therapist?.name ?? "Otomatis"}
                                </p>
                                {getStatusBadge(r.status)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {isPaidReservation(r) ? (
                                  <span className="font-extrabold text-slate-900">
                                    Rp {Number(r.total_price).toLocaleString("id-ID")}
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className="font-semibold text-slate-400 line-through text-xs">
                                      Rp {Number(r.total_price).toLocaleString("id-ID")}
                                    </span>
                                    <span className="text-[10px] font-bold text-rose-500">
                                      (Tidak masuk omset)
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-pink-50/70 border-t-2 border-pink-200">
                          <td colSpan={6} className="py-4 px-4 text-right font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                            Total Pendapatan Sah ({filteredPaidReservations.length} dari {reportFilteredReservations.length} Transaksi):
                          </td>
                          <td className="py-4 px-4 text-right font-extrabold text-pink-600 text-base">
                            Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
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
                    if (selectedProof.payment_proof_url && !proofImgError) {
                      setZoomedProofImage(getStorageUrl(selectedProof.payment_proof_url));
                      setZoomScale(1);
                    }
                  }}
                  className={`w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200/60 relative flex items-center justify-center ${selectedProof.payment_proof_url && !proofImgError ? "cursor-zoom-in group" : ""
                    }`}
                  title={selectedProof.payment_proof_url && !proofImgError ? "Klik untuk melihat gambar ukuran penuh" : undefined}
                >
                  {selectedProof.payment_proof_url && !proofImgError ? (
                    <>
                      <img
                        src={getStorageUrl(selectedProof.payment_proof_url)}
                        alt="Bukti Transfer QRIS"
                        className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                        onError={() => setProofImgError(true)}
                      />
                      <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs backdrop-blur-[1px]">
                        <ZoomIn size={18} />
                        <span>Klik untuk perbesar layar penuh</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-2 p-4 text-center">
                      <FileImage size={40} className="text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Gambar bukti transfer tidak dapat dimuat</p>
                      <p className="text-[11px] text-slate-400">File pada server sementara mungkin telah terhapus saat redeploy.</p>
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
                      {["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00"].map((t) => {
                        let isPast = false;
                        if (rescheduleModal.date) {
                          const [year, month, day] = rescheduleModal.date.split("-").map(Number);
                          const [hours, minutes] = t.split(":").map(Number);
                          isPast = new Date(year, month - 1, day, hours, minutes).getTime() <= Date.now();
                        }
                        return (
                          <option key={t} value={t} disabled={isPast}>
                            {t} WIB {isPast ? "(Lewat)" : ""}
                          </option>
                        );
                      })}
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
          <p className="text-sm text-slate-500">Laporan Transaksi, Keuangan & Analitik Layanan Spa</p>
          <p className="text-xs text-slate-400 mt-1">
            Periode Filter:{" "}
            {reportStartDate || reportEndDate
              ? `${reportStartDate || "Awal"} s/d ${reportEndDate || "Sekarang"}`
              : "Semua Periode"}{" "}
            | Klasifikasi: {reportSegment === "all" ? "Semua (Bayi, Anak, Ibu)" : reportSegment} | Dicetak pada:{" "}
            {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <h2 className="text-base font-bold mb-4 uppercase text-center">Ringkasan Kuantitatif Laporan</h2>

        <div className="grid grid-cols-4 gap-4 mb-8 border border-slate-300 p-4 rounded-xl text-center">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Transaksi</p>
            <p className="text-base font-extrabold mt-0.5">{reportFilteredReservations.length} Sesi</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Segmen Bayi / Anak</p>
            <p className="text-base font-extrabold mt-0.5">
              {filteredSegmentStats.Bayi.count} Bayi / {filteredSegmentStats.Anak.count} Anak
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Segmen Ibu</p>
            <p className="text-base font-extrabold mt-0.5">{filteredSegmentStats.Ibu.count} Sesi</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pendapatan</p>
            <p className="text-base font-extrabold mt-0.5 text-pink-600">
              Rp {filteredTotalRevenue.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <h2 className="text-xs font-bold mb-3 uppercase tracking-wider">
          Tabel Rekapitulasi Data Transaksi & Keuangan
        </h2>
        <table className="w-full text-left border-collapse border border-slate-300 text-[9px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-1.5 border border-slate-300 font-bold text-center">1. NO</th>
              <th className="p-1.5 border border-slate-300 font-bold">2. Tanggal & Jam</th>
              <th className="p-1.5 border border-slate-300 font-bold">3. ID & Customer</th>
              <th className="p-1.5 border border-slate-300 font-bold">4. Nama Anak & Umur</th>
              <th className="p-1.5 border border-slate-300 font-bold">5. Klasifikasi</th>
              <th className="p-1.5 border border-slate-300 font-bold">6. Tindakan/Layanan</th>
              <th className="p-1.5 border border-slate-300 font-bold">7. Terapis</th>
              <th className="p-1.5 border border-slate-300 font-bold">8. No WA</th>
              <th className="p-1.5 border border-slate-300 font-bold">9. Catatan</th>
              <th className="p-1.5 border border-slate-300 font-bold text-right">10. Tarif</th>
            </tr>
          </thead>
          <tbody>
            {reportFilteredReservations.map((r, idx) => {
              const phone = r.user?.phone_number ?? "-";
              const cls = getReservationClassification(r);
              return (
                <tr key={r.id} className="border-b border-slate-200">
                  <td className="p-1.5 border border-slate-300 text-center font-bold">{idx + 1}</td>
                  <td className="p-1.5 border border-slate-300">
                    {new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    ({(r.start_time ?? "").slice(0, 5)})
                  </td>
                  <td className="p-1.5 border border-slate-300 font-semibold">
                    #{r.user?.id ?? "-"} {r.user?.name ?? "-"} ({r.booking_code})
                  </td>
                  <td className="p-1.5 border border-slate-300">
                    {r.baby_name} ({r.baby_age} Bln)
                  </td>
                  <td className="p-1.5 border border-slate-300 font-bold">{cls}</td>
                  <td className="p-1.5 border border-slate-300 font-semibold">{r.service?.name}</td>
                  <td className="p-1.5 border border-slate-300">{r.therapist?.name ?? "Otomatis"}</td>
                  <td className="p-1.5 border border-slate-300 font-mono">{phone}</td>
                  <td className="p-1.5 border border-slate-300 max-w-[110px] truncate">{r.notes ?? "-"}</td>
                  <td className="p-1.5 border border-slate-300 font-bold text-right">
                    Rp {Number(r.total_price).toLocaleString("id-ID")}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={9} className="p-2 border border-slate-300 text-right uppercase">
                Total Pendapatan ({reportFilteredReservations.length} Transaksi):
              </td>
              <td className="p-2 border border-slate-300 text-right font-extrabold">
                Rp {filteredTotalRevenue.toLocaleString("id-ID")}
              </td>
            </tr>
          </tfoot>
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