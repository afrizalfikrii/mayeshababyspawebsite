import { useEffect, useState } from "react";
import {
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  FileImage,
  Printer,
  Download,
  MapPin,
  MessageCircle,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
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

const GPS_PREFIX_REGEX = /\n?(?:\u{1F4CD}\s*)?Titik GPS:\s*https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/gu;

const SEGMENT_COLORS: Record<"Bayi" | "Anak" | "Ibu", string> = {
  Bayi: "#64748B",
  Anak: "#A8998A",
  Ibu: "#B84373",
};

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<"reservations" | "services" | "reports" | "therapists">("reservations");
  const [searchQuery, setSearchQuery] = useState("");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resFilter, setResFilter] = useState<string>("all");
  const [isResLoading, setIsResLoading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Reservation | null>(null);
  const [proofImgError, setProofImgError] = useState(false);
  const [zoomedProofImage, setZoomedProofImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceSegmentFilter, setServiceSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [isServLoading, setIsServLoading] = useState(false);
  const [serviceModal, setServiceModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data: Partial<Service> | null;
  }>({ isOpen: false, mode: "create", data: null });

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

  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    reservation: Reservation | null;
    date: string;
    time: string;
    notes: string;
  }>({ isOpen: false, reservation: null, date: "", time: "", notes: "" });
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isTherapistsLoading, setIsTherapistsLoading] = useState(false);
  const [therapistModal, setTherapistModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data: Partial<Therapist> | null;
  }>({ isOpen: false, mode: "create", data: null });

  const [stats, setStats] = useState({
    today_bookings: 0,
    total_customers: 0,
    completed_sessions: 0,
    total_revenue: 0,
  });

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
    if (
      s?.category === "mom_treatment" ||
      (s?.age_min_months !== null && s?.age_min_months !== undefined && s.age_min_months >= 216)
    ) {
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
    return <span className="tag-neutral">{cls}</span>;
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

  const reportFilteredReservations = reservations.filter((r) => {
    if (reportStatusFilter === "valid") {
      if (r.status !== "confirmed" && r.status !== "completed") return false;
    } else if (reportStatusFilter !== "all") {
      if (r.status !== reportStatusFilter) return false;
    }

    const rDate = getReservationDateStr(r);
    if (reportStartDate && rDate < reportStartDate) return false;
    if (reportEndDate && rDate > reportEndDate) return false;

    const cls = getReservationClassification(r);
    if (reportSegment !== "all" && cls !== reportSegment) return false;

    if (reportServiceId !== "all" && String(r.service?.id ?? "") !== reportServiceId) return false;

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

  const validReservations = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "completed"
  );

  const nowDate = new Date();
  const currentYearNum = nowDate.getFullYear();
  const currentMonthNum = nowDate.getMonth();
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

  const hasLastMonthBaseline = lastMonthRevenue > 0;
  const monthGrowthPct = hasLastMonthBaseline
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null;

  const overallSegmentStats = {
    Bayi: validReservations.filter((r) => getReservationClassification(r) === "Bayi").length,
    Anak: validReservations.filter((r) => getReservationClassification(r) === "Anak").length,
    Ibu: validReservations.filter((r) => getReservationClassification(r) === "Ibu").length,
  };

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
    toast.success("Laporan transaksi (CSV) berhasil diunduh.");
  };

  useEffect(() => {
    fetchReservations();
    fetchServices();
    fetchStats();
    fetchTherapists();
  }, []);

  const handleVerify = async (id: number, action: "confirmed" | "cancelled" | "completed") => {
    try {
      await adminVerifyReservation(id, action);
      toast.success(
        action === "confirmed"
          ? "Reservasi berhasil dikonfirmasi."
          : action === "completed"
            ? "Sesi perawatan berhasil ditandai selesai."
            : "Reservasi berhasil dibatalkan."
      );
      setSelectedProof(null);
      fetchReservations();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal memverifikasi reservasi.");
    }
  };

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
      toast.success("Jadwal reservasi berhasil diperbarui.");
      setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" });
      fetchReservations();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal mengubah jadwal reservasi.");
    } finally {
      setIsRescheduling(false);
    }
  };

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
        toast.success("Layanan baru berhasil ditambahkan.");
      } else {
        await adminUpdateService(serviceModal.data.id!, {
          name: serviceModal.data.name,
          description: serviceModal.data.description,
          duration_minutes: Number(serviceModal.data.duration_minutes),
          price: Number(serviceModal.data.price),
          is_active: serviceModal.data.is_active,
        });
        toast.success("Layanan berhasil diperbarui.");
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
        toast.success("Staf terapis berhasil ditambahkan.");
      } else {
        await adminUpdateTherapist(therapistModal.data.id!, {
          name: therapistModal.data.name,
          is_active: therapistModal.data.is_active,
        });
        toast.success("Data terapis berhasil diperbarui.");
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
    if (status === "pending") return <span className="status-pending">Menunggu Pembayaran</span>;
    if (status === "waiting_verification") return <span className="status-waiting">Menunggu Verifikasi</span>;
    if (status === "confirmed") return <span className="status-confirmed">Dikonfirmasi</span>;
    if (status === "completed") return <span className="status-completed">Selesai</span>;
    if (status === "cancelled") return <span className="status-cancelled">Dibatalkan</span>;
    return <span className="status-waiting">{status}</span>;
  };

  const chartData = getFluctuationChartData();
  const rankedServicesData = getRankedServicesData();

  return (
    <div className="admin-theme text-[14px] leading-[20px]">
      <div className="max-w-7xl mx-auto px-6 py-8 print:hidden">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <span className="overline-label block mb-1">ADMIN</span>
            <h1 className="text-[28px] leading-[36px] font-editorial text-[var(--text)]">
              Operasional &amp; Laporan Mayesha
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
              Verifikasi pembayaran QRIS, penjadwalan terapis, katalog layanan, dan analitik keuangan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
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
              className="h-10 w-10 rounded-[8px] border border-[var(--border)] bg-[#FFFFFF] hover:bg-[var(--fill-subtle)] transition-colors duration-150 text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center cursor-pointer shrink-0"
              title="Muat ulang data"
              aria-label="Muat ulang data"
            >
              <RefreshCw size={16} />
            </button>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
              <input
                type="text"
                placeholder="Cari kode, nama orang tua, anak..."
                className="input-field !min-h-[40px] !py-2 pl-9 pr-8 text-[13px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Equal White KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#FFFFFF] border border-[var(--border)] rounded-[8px] p-5 flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              Pendapatan Bulan Ini
            </span>
            <div className="mt-2">
              <p className="text-[26px] leading-[32px] font-semibold text-[var(--text)] tabular-nums">
                Rp {thisMonthRevenue.toLocaleString("id-ID")}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
                <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                  {thisMonthReservations.length} transaksi
                </span>
                {!hasLastMonthBaseline || monthGrowthPct === null ? (
                  <span className="text-[12px] text-[var(--text-muted)]">
                    Belum ada pembanding
                  </span>
                ) : (
                  <span
                    className={
                      monthGrowthPct >= 0
                        ? "inline-flex items-center px-2 py-0.5 rounded-[8px] border border-[var(--sage)] text-[var(--sage)] text-[11px] font-medium tabular-nums"
                        : "inline-flex items-center px-2 py-0.5 rounded-[8px] border border-[var(--border)] text-[var(--text-muted)] text-[11px] font-medium tabular-nums"
                    }
                    title={`Bulan lalu: Rp ${lastMonthRevenue.toLocaleString("id-ID")} (${lastMonthReservations.length} sesi)`}
                  >
                    {monthGrowthPct >= 0 ? `+${monthGrowthPct}%` : `${monthGrowthPct}%`} vs bln lalu
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[var(--border)] rounded-[8px] p-5 flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[var(--text-muted)] tabular-nums">
              Pendapatan Tahun {currentYearNum}
            </span>
            <div className="mt-2">
              <p className="text-[26px] leading-[32px] font-semibold text-[var(--text)] tabular-nums">
                Rp {thisYearRevenue.toLocaleString("id-ID")}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-2.5">
                {thisYearReservations.length} transaksi sah • Akumulasi Rp {stats.total_revenue.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[var(--border)] rounded-[8px] p-5 flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              Transaksi per Segmen
            </span>
            <div className="grid grid-cols-3 divide-x divide-[var(--border)] mt-2 pt-1">
              <div className="pr-3">
                <p className="text-[11px] text-[var(--text-muted)]">Bayi</p>
                <p className="text-[24px] leading-[30px] font-semibold text-[var(--text)] tabular-nums mt-0.5">
                  {overallSegmentStats.Bayi}
                </p>
              </div>
              <div className="px-3">
                <p className="text-[11px] text-[var(--text-muted)]">Anak</p>
                <p className="text-[24px] leading-[30px] font-semibold text-[var(--text)] tabular-nums mt-0.5">
                  {overallSegmentStats.Anak}
                </p>
              </div>
              <div className="pl-3">
                <p className="text-[11px] text-[var(--text-muted)]">Ibu</p>
                <p className="text-[24px] leading-[30px] font-semibold text-[var(--text)] tabular-nums mt-0.5">
                  {overallSegmentStats.Ibu}
                </p>
              </div>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-2">
              Total {validReservations.length} sesi terkonfirmasi &amp; selesai
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[var(--border)] rounded-[8px] p-5 flex flex-col justify-between">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              Operasional &amp; Pelanggan
            </span>
            <div className="mt-2">
              <p className="text-[26px] leading-[32px] font-semibold text-[var(--text)] tabular-nums">
                {stats.completed_sessions}{" "}
                <span className="text-[13px] font-normal text-[var(--text-muted)]">sesi selesai</span>
              </p>
              <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-2.5">
                Hari ini {stats.today_bookings} booking • {stats.total_customers} pelanggan •{" "}
                {services.filter((s) => s.is_active).length}/{services.length} layanan aktif
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Underline Tabs */}
        <div className="flex gap-6 overflow-x-auto whitespace-nowrap border-b border-[var(--border)] mb-6 print:hidden">
          {[
            { id: "reservations", label: "Kelola Reservasi" },
            { id: "services", label: "Kelola Layanan" },
            { id: "therapists", label: "Kelola Terapis" },
            { id: "reports", label: "Analisis & Laporan" },
          ].map((tab) => {
            const isActive = activeMenu === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMenu(tab.id as "reservations" | "services" | "therapists" | "reports")}
                className={`pb-3 text-[14px] transition-colors duration-150 border-b-2 -mb-px cursor-pointer shrink-0 ${
                  isActive
                    ? "border-[var(--accent)] text-[var(--text)] font-semibold"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] font-medium"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: KELOLA RESERVASI ───────────────────────────────────────── */}
        {activeMenu === "reservations" && (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto">
              <div className="segmented-group">
                {[
                  { id: "all", label: "Semua", count: reservations.length },
                  {
                    id: "waiting_verification",
                    label: "Menunggu Verifikasi",
                    count: reservations.filter((r) => r.status === "waiting_verification").length,
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
                      className={`segmented-item inline-flex items-center gap-1.5 ${
                        isActive ? "segmented-item-active" : ""
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card-surface overflow-hidden">
              {isResLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2.5">
                  <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
                  <p className="text-[var(--text-muted)] text-[13px]">Memuat data reservasi...</p>
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-[var(--text)] font-semibold text-[15px]">Tidak ada reservasi ditemukan</p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-1">
                    Ubah filter status atau gunakan kata kunci pencarian lain.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[#FAF7F4]">
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Kode Booking
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] min-w-[200px]">
                          Pelanggan
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] min-w-[180px]">
                          Layanan
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Terapis
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Jadwal
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Total Harga
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Status
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredReservations.map((r) => {
                        const isCancelled = r.status === "cancelled";
                        return (
                          <tr key={r.id} className="min-h-[48px] hover:bg-[#FAF7F4]/70 transition-colors duration-150">
                            <td className="py-3 px-4 align-top whitespace-nowrap">
                              <span className="booking-code font-medium text-[var(--text)]">
                                {r.booking_code}
                              </span>
                            </td>

                            <td className="py-3 px-4 align-top">
                              <p className="font-semibold text-[var(--text)]">{r.user?.name ?? "-"}</p>
                              {r.baby_name && (
                                <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-0.5">
                                  Anak: {r.baby_name} ({r.baby_age} bln)
                                </p>
                              )}
                              {r.user?.phone_number && (
                                <a
                                  href={getWaLinkFromPhone(
                                    r.user.phone_number,
                                    `Halo ${r.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa terkait reservasi (${r.booking_code}) untuk ${
                                      r.baby_name ? `anak ${r.baby_name}` : `layanan ${r.service?.name || "Baby Spa"}`
                                    }.`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 mt-0.5 tabular-nums"
                                  title="Hubungi via WhatsApp"
                                >
                                  <MessageCircle size={12} />
                                  <span>{r.user.phone_number}</span>
                                </a>
                              )}
                              {r.delivery_address ? (
                                <div className="mt-1.5 text-[12px] text-[var(--text-muted)] max-w-xs">
                                  <span className="inline-flex items-center gap-1 font-medium text-[var(--text)]">
                                    <MapPin size={11} className="text-[var(--text-muted)]" />
                                    Home Care
                                  </span>
                                  <p className="line-clamp-2 break-words mt-0.5">
                                    {r.delivery_address.replace(GPS_PREFIX_REGEX, "").trim() || "Titik GPS terlampir"}
                                  </p>
                                  {r.delivery_address
                                    .match(/https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g)
                                    ?.map((link, idx) => (
                                      <a
                                        key={idx}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block text-[12px] font-medium text-[var(--text)] underline underline-offset-4 mt-0.5"
                                      >
                                        Buka Google Maps
                                      </a>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Studio Mayesha</p>
                              )}
                            </td>

                            <td className="py-3 px-4 align-top">
                              <p className="font-medium text-[var(--text)]">{r.service?.name ?? "-"}</p>
                              <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-0.5">
                                {r.service?.duration_minutes ?? 0} menit
                              </p>
                            </td>

                            <td className="py-3 px-4 align-top whitespace-nowrap">
                              <p className="font-medium text-[var(--text)]">{r.therapist?.name ?? "Otomatis"}</p>
                            </td>

                            <td className="py-3 px-4 align-top whitespace-nowrap tabular-nums">
                              <p className="font-medium text-[var(--text)]">
                                {new Date(r.reservation_date).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                                {r.start_time.substring(0, 5)}–{r.end_time.substring(0, 5)} WIB
                              </p>
                              {r.is_rescheduled && (
                                <span className="status-rescheduled mt-1">Reschedule</span>
                              )}
                            </td>

                            <td className="py-3 px-4 align-top text-right whitespace-nowrap tabular-nums">
                              <span
                                className={
                                  isCancelled
                                    ? "text-[var(--text-muted)] line-through"
                                    : "font-semibold text-[var(--accent)]"
                                }
                              >
                                Rp {Number(r.total_price).toLocaleString("id-ID")}
                              </span>
                            </td>

                            <td className="py-3 px-4 align-top whitespace-nowrap">
                              {getStatusBadge(r.status)}
                            </td>

                            <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {r.status === "waiting_verification" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedProof(r);
                                      setProofImgError(false);
                                    }}
                                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#FFFFFF] text-[14px] font-semibold h-9 px-3.5 rounded-[8px] transition-colors duration-150 cursor-pointer"
                                  >
                                    Verifikasi
                                  </button>
                                ) : r.status === "confirmed" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleVerify(r.id, "completed")}
                                    className="btn-secondary-sm"
                                  >
                                    Selesaikan
                                  </button>
                                ) : null}

                                {r.status !== "completed" && r.status !== "cancelled" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRescheduleModal({
                                        isOpen: true,
                                        reservation: r,
                                        date: r.reservation_date,
                                        time: r.start_time.substring(0, 5),
                                        notes: "",
                                      })
                                    }
                                    className="btn-secondary-sm"
                                    title="Ubah jadwal reservasi"
                                  >
                                    Reschedule
                                  </button>
                                )}

                                {(r.status === "completed" || r.status === "cancelled") && (
                                  <span className="text-[12px] text-[var(--text-muted)]">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: KELOLA LAYANAN ─────────────────────────────────────────── */}
        {activeMenu === "services" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="overflow-x-auto">
                <div className="segmented-group">
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
                        className={`segmented-item inline-flex items-center gap-1.5 ${
                          isActive ? "segmented-item-active" : ""
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                          {f.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setServiceModal({ isOpen: true, mode: "create", data: {} })}
                className="btn-primary self-start sm:self-auto"
              >
                Tambah Layanan Baru
              </button>
            </div>

            <div className="card-surface overflow-hidden">
              {isServLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2.5">
                  <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
                  <p className="text-[var(--text-muted)] text-[13px]">Memuat data layanan...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-[var(--text)] font-semibold text-[15px]">Tidak ada layanan ditemukan</p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-1">
                    Pilih filter klasifikasi lain atau tambahkan layanan baru.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[#FAF7F4]">
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)]">
                          Nama Layanan
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Klasifikasi
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)]">
                          Deskripsi
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Durasi
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Harga
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Status
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredServices.map((s) => (
                        <tr key={s.id} className="h-12 hover:bg-[#FAF7F4]/70 transition-colors duration-150">
                          <td className="py-3 px-4 font-semibold text-[var(--text)]">{s.name}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getClassificationBadge(getServiceClassification(s))}
                          </td>
                          <td className="py-3 px-4 text-[var(--text-muted)] max-w-xs truncate">
                            {s.description}
                          </td>
                          <td className="py-3 px-4 text-[var(--text)] tabular-nums whitespace-nowrap">
                            {s.duration_minutes} menit
                          </td>
                          <td className="py-3 px-4 font-semibold text-[var(--accent)] tabular-nums text-right whitespace-nowrap">
                            Rp {Number(s.price).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {s.is_active ? (
                              <span className="status-confirmed">Aktif</span>
                            ) : (
                              <span className="status-waiting">Nonaktif</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setServiceModal({ isOpen: true, mode: "edit", data: s })}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-subtle)] rounded-[8px] transition-colors duration-150 cursor-pointer"
                                title="Edit layanan"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteService(s.id)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-subtle)] rounded-[8px] transition-colors duration-150 cursor-pointer"
                                title="Hapus layanan"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: KELOLA TERAPIS ─────────────────────────────────────────── */}
        {activeMenu === "therapists" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTherapistModal({ isOpen: true, mode: "create", data: {} })}
                className="btn-primary"
              >
                Tambah Staf Terapis
              </button>
            </div>

            <div className="card-surface overflow-hidden">
              {isTherapistsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2.5">
                  <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
                  <p className="text-[var(--text-muted)] text-[13px]">Memuat data terapis...</p>
                </div>
              ) : therapists.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-[var(--text)] font-semibold text-[15px]">Belum ada staf terapis</p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-1">
                    Tambahkan staf terapis untuk menangani jadwal reservasi perawatan.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[#FAF7F4]">
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)]">
                          Nama Staf
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)]">
                          Peran
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)]">
                          Status
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredTherapists.map((t) => (
                        <tr key={t.id} className="h-12 hover:bg-[#FAF7F4]/70 transition-colors duration-150">
                          <td className="py-3 px-4 font-semibold text-[var(--text)]">
                            {t.name}
                          </td>
                          <td className="py-3 px-4 text-[var(--text-muted)]">
                            Terapis Baby Spa
                          </td>
                          <td className="py-3 px-4">
                            {t.is_active ? (
                              <span className="status-confirmed">Aktif</span>
                            ) : (
                              <span className="status-waiting">Nonaktif (Cuti)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setTherapistModal({ isOpen: true, mode: "edit", data: t })}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-subtle)] rounded-[8px] transition-colors duration-150 cursor-pointer"
                                title="Edit terapis"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTherapist(t.id)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-subtle)] rounded-[8px] transition-colors duration-150 cursor-pointer"
                                title="Hapus terapis"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: ANALISIS & LAPORAN ─────────────────────────────────────── */}
        {activeMenu === "reports" && (
          <div className="flex flex-col gap-6">
            <div className="card-surface p-5 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text)] text-[15px]">
                    Filter Laporan Transaksi &amp; Analitik
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    Saring data menurut rentang tanggal, preset periode, klasifikasi segmen, dan jenis layanan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={resetReportFilters}
                    className="btn-secondary-sm"
                  >
                    Reset Filter
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="btn-secondary-sm"
                  >
                    <Download size={14} className="text-[var(--text-muted)]" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#FFFFFF] text-[14px] font-semibold h-9 px-3.5 rounded-[8px] inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                  >
                    <Printer size={15} />
                    Cetak PDF
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="overflow-x-auto">
                  <div className="segmented-group">
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
                          className={`segmented-item ${isActive ? "segmented-item-active" : ""}`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                      Dari Tanggal
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => {
                        setReportStartDate(e.target.value);
                        setReportPreset("custom");
                      }}
                      className="input-field !min-h-[38px] !py-1.5 text-[13px] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                      Sampai Tanggal
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => {
                        setReportEndDate(e.target.value);
                        setReportPreset("custom");
                      }}
                      className="input-field !min-h-[38px] !py-1.5 text-[13px] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1 tabular-nums">
                      Jenis Layanan ({services.length})
                    </label>
                    <select
                      value={reportServiceId}
                      onChange={(e) => setReportServiceId(e.target.value)}
                      className="input-field !min-h-[38px] !py-1.5 text-[13px]"
                    >
                      <option value="all">Semua Layanan ({services.length})</option>
                      {services.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          [{getServiceClassification(s)}] {s.name} — Rp {Number(s.price).toLocaleString("id-ID")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                      Status Transaksi
                    </label>
                    <select
                      value={reportStatusFilter}
                      onChange={(e) => setReportStatusFilter(e.target.value as any)}
                      className="input-field !min-h-[38px] !py-1.5 text-[13px]"
                    >
                      <option value="all">Semua Status Reservasi</option>
                      <option value="valid">Transaksi Sah Saja (Dikonfirmasi &amp; Selesai)</option>
                      <option value="completed">Selesai Saja</option>
                      <option value="confirmed">Dikonfirmasi Saja</option>
                      <option value="cancelled">Dibatalkan Saja</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <span className="text-[12px] font-medium text-[var(--text-muted)] shrink-0">
                    Klasifikasi Segmen:
                  </span>
                  <div className="overflow-x-auto">
                    <div className="segmented-group">
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
                            className={`segmented-item ${isActive ? "segmented-item-active" : ""}`}
                          >
                            {seg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-[12px] text-[var(--text-muted)] tabular-nums">
                  Menampilkan <span className="font-semibold text-[var(--text)]">{reportFilteredReservations.length}</span> baris (
                  <span className="font-semibold text-[var(--sage)]">{filteredPaidReservations.length}</span> transaksi sah)
                  {reportStartDate || reportEndDate
                    ? ` • ${reportStartDate || "Awal"} s/d ${reportEndDate || "Sekarang"}`
                    : " • Semua Periode"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] border border-[var(--border)] rounded-[8px] p-5">
                <p className="text-[12px] font-medium text-[var(--text-muted)]">
                  Total Omset (Transaksi Sah)
                </p>
                <p className="text-[24px] leading-[30px] font-semibold text-[var(--accent)] tabular-nums mt-1.5">
                  Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-1.5">
                  Dari {filteredPaidReservations.length} transaksi sah ({reportFilteredReservations.length} total baris)
                </p>
              </div>

              {(["Bayi", "Anak", "Ibu"] as const).map((segKey) => {
                const segData = filteredSegmentStats[segKey];
                const pct =
                  filteredPaidReservations.length > 0
                    ? Math.round((segData.count / filteredPaidReservations.length) * 100)
                    : 0;
                return (
                  <div key={segKey} className="bg-[#FFFFFF] border border-[var(--border)] rounded-[8px] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-medium text-[var(--text-muted)]">
                        Segmen {segKey}
                      </p>
                      <span className="tag-neutral tabular-nums">{pct}%</span>
                    </div>
                    <p className="text-[24px] leading-[30px] font-semibold text-[var(--text)] tabular-nums mt-1.5">
                      {segData.count}{" "}
                      <span className="text-[13px] font-normal text-[var(--text-muted)]">sesi sah</span>
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-1.5">
                      Omset Rp {segData.revenue.toLocaleString("id-ID")}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="card-surface px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--text)] text-[14px]">
                  Grafik Fluktuasi Keuangan &amp; Komparasi Segmen
                </h3>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Perbandingan pendapatan dan jumlah sesi per periode waktu.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented-group">
                  <button
                    type="button"
                    onClick={() => setChartTimeMode("monthly")}
                    className={`segmented-item ${chartTimeMode === "monthly" ? "segmented-item-active" : ""}`}
                  >
                    Bulanan (Jan–Des)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartTimeMode("daily")}
                    className={`segmented-item ${chartTimeMode === "daily" ? "segmented-item-active" : ""}`}
                  >
                    Harian
                  </button>
                </div>

                {chartTimeMode === "monthly" && (
                  <select
                    value={chartYear}
                    onChange={(e) => setChartYear(Number(e.target.value))}
                    className="input-field !w-auto !min-h-[36px] !py-1 text-[13px] tabular-nums"
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

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card-surface p-5">
                <div className="mb-4">
                  <h4 className="font-semibold text-[var(--text)] text-[14px] tabular-nums">
                    {chartTimeMode === "monthly"
                      ? `Fluktuasi Pendapatan Bulanan (${chartYear})`
                      : "Fluktuasi Pendapatan Harian"}
                  </h4>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Total omset transaksi sah per periode
                  </p>
                </div>

                <div className="w-full h-80 tabular-nums">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="#ECE9E3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#6E635D"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#E6DFD8" }}
                      />
                      <YAxis
                        stroke="#6E635D"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `Rp ${val / 1000}k`}
                      />
                      <ChartTooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E6DFD8",
                          borderRadius: "8px",
                          boxShadow: "none",
                          fontSize: "12px",
                          fontVariantNumeric: "tabular-nums",
                        }}
                        formatter={(val: any, name: any) =>
                          name === "Pendapatan"
                            ? [`Rp ${Number(val).toLocaleString("id-ID")}`, "Pendapatan"]
                            : [`${val} sesi`, name]
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        align="left"
                        wrapperStyle={{ fontSize: "12px", paddingBottom: "12px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Pendapatan"
                        stroke="#B84373"
                        strokeWidth={2}
                        fill="#B84373"
                        fillOpacity={0.08}
                        dot={{ r: 3, fill: "#B84373", strokeWidth: 0 }}
                        activeDot={{ r: 4, fill: "#B84373" }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card-surface p-5">
                <div className="mb-4">
                  <h4 className="font-semibold text-[var(--text)] text-[14px] tabular-nums">
                    {chartTimeMode === "monthly"
                      ? `Komparasi Segmen Bayi, Anak, Ibu (${chartYear})`
                      : "Komparasi Harian: Bayi, Anak, Ibu"}
                  </h4>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Jumlah sesi perawatan berdasarkan klasifikasi peserta
                  </p>
                </div>

                <div className="w-full h-80 tabular-nums">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="#ECE9E3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#6E635D"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#E6DFD8" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="#6E635D"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E6DFD8",
                          borderRadius: "8px",
                          boxShadow: "none",
                          fontSize: "12px",
                          fontVariantNumeric: "tabular-nums",
                        }}
                        formatter={(val: any, name: any) => [`${val} sesi`, `Segmen ${name}`]}
                      />
                      <Legend
                        verticalAlign="top"
                        align="left"
                        wrapperStyle={{ fontSize: "12px", paddingBottom: "12px" }}
                      />
                      <Bar dataKey="Bayi" fill={SEGMENT_COLORS.Bayi} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="Anak" fill={SEGMENT_COLORS.Anak} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="Ibu" fill={SEGMENT_COLORS.Ibu} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card-surface p-5 flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text)] text-[15px]">
                    Peringkat &amp; Rekapitulasi Layanan Paling Laris
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-0.5">
                    Urutan layanan berdasarkan jumlah sesi terjual dan kontribusi omset dari {services.length} layanan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="segmented-group">
                    <button
                      type="button"
                      onClick={() => setTopServicesSort("most")}
                      className={`segmented-item ${topServicesSort === "most" ? "segmented-item-active" : ""}`}
                    >
                      Paling Laris
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopServicesSort("least")}
                      className={`segmented-item ${topServicesSort === "least" ? "segmented-item-active" : ""}`}
                    >
                      Paling Jarang
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllTopServices(!showAllTopServices)}
                    className="btn-secondary-sm tabular-nums"
                  >
                    {showAllTopServices ? "Tampilkan 10 Teratas" : `Tampilkan Semua (${rankedServicesData.length})`}
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-[#FAF7F4] rounded-[8px] p-4 border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-semibold text-[var(--text)]">
                      8 Layanan {topServicesSort === "most" ? "Teratas" : "Terbawah"}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-[2px] inline-block" style={{ backgroundColor: SEGMENT_COLORS.Bayi }} />
                        Bayi
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-[2px] inline-block" style={{ backgroundColor: SEGMENT_COLORS.Anak }} />
                        Anak
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-[2px] inline-block" style={{ backgroundColor: SEGMENT_COLORS.Ibu }} />
                        Ibu
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-72 tabular-nums">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankedServicesData.slice(0, 8)} layout="vertical">
                        <CartesianGrid stroke="#ECE9E3" horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke="#6E635D"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#E6DFD8" }}
                        />
                        <YAxis
                          dataKey="shortName"
                          type="category"
                          stroke="#6E635D"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={112}
                        />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E6DFD8",
                            borderRadius: "8px",
                            boxShadow: "none",
                            fontSize: "12px",
                            fontVariantNumeric: "tabular-nums",
                          }}
                          formatter={(val: any, _name: any, props: any) => [
                            `${val} sesi (Rp ${Number(props?.payload?.revenue ?? 0).toLocaleString("id-ID")})`,
                            props?.payload?.name ?? "Jumlah Sesi",
                          ]}
                        />
                        <Bar dataKey="Jumlah Sesi" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false}>
                          {rankedServicesData.slice(0, 8).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={SEGMENT_COLORS[entry.classification]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-7 overflow-x-auto border border-[var(--border)] rounded-[8px]">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#FAF7F4] border-b border-[var(--border)]">
                        <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          No
                        </th>
                        <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)]">
                          Nama Layanan
                        </th>
                        <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Klasifikasi
                        </th>
                        <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Harga Satuan
                        </th>
                        <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Terjual
                        </th>
                        <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Total Omset
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {(showAllTopServices ? rankedServicesData : rankedServicesData.slice(0, 10)).map((item) => (
                        <tr key={item.name} className="hover:bg-[#FAF7F4]/70 transition-colors duration-150">
                          <td className="py-2.5 px-4 text-[var(--text-muted)] tabular-nums">
                            {item.rank}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[var(--text)]">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {getClassificationBadge(item.classification)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                            Rp {item.unitPrice.toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-[var(--text)] tabular-nums whitespace-nowrap">
                            {item.count} sesi
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[var(--accent)] tabular-nums whitespace-nowrap">
                            Rp {item.revenue.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card-surface overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--text)] text-[15px]">
                    Tabel Detail Laporan Transaksi &amp; Keuangan
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    Rincian transaksi sesuai filter aktif. Hanya reservasi berstatus Dikonfirmasi dan Selesai yang dihitung ke dalam pendapatan sah.
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Total Pendapatan Sah
                  </p>
                  <p className="text-[18px] font-semibold text-[var(--accent)] tabular-nums">
                    Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {reportFilteredReservations.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-[var(--text)] font-semibold text-[15px]">
                    Tidak ada data transaksi pada filter ini
                  </p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-1">
                    Sesuaikan rentang tanggal atau pilih klasifikasi segmen lainnya.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#FAF7F4] border-b border-[var(--border)]">
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-center whitespace-nowrap">
                          No
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] min-w-[200px]">
                          ID &amp; Customer
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Tanggal &amp; Jam
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] min-w-[160px]">
                          Layanan
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Klasifikasi
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          Terapis &amp; Status
                        </th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-[0.06em] text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                          Nominal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {reportFilteredReservations.map((r, idx) => {
                        const cls = getReservationClassification(r);
                        const paid = isPaidReservation(r);
                        return (
                          <tr key={r.id} className="min-h-[48px] hover:bg-[#FAF7F4]/70 transition-colors duration-150">
                            <td className="py-3 px-4 text-center text-[var(--text-muted)] tabular-nums align-top">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex items-center gap-1.5">
                                <span className="booking-code text-[12px] text-[var(--text-muted)]">
                                  #{r.user?.id ?? "-"}
                                </span>
                                <span className="font-semibold text-[var(--text)]">
                                  {r.user?.name ?? "Pelanggan"}
                                </span>
                              </div>
                              <p className="text-[12px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                                <span className="booking-code text-[var(--text)]">{r.booking_code}</span>
                                {r.baby_name ? ` • ${r.baby_name} (${r.baby_age} bln)` : ""}
                              </p>
                            </td>
                            <td className="py-3 px-4 align-top whitespace-nowrap tabular-nums">
                              <p className="font-medium text-[var(--text)]">
                                {new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                                {(r.start_time ?? "").slice(0, 5)}–{(r.end_time ?? "").slice(0, 5)} WIB
                              </p>
                            </td>
                            <td className="py-3 px-4 align-top font-medium text-[var(--text)]">
                              {r.service?.name ?? "-"}
                            </td>
                            <td className="py-3 px-4 align-top whitespace-nowrap">
                              {getClassificationBadge(cls)}
                            </td>
                            <td className="py-3 px-4 align-top whitespace-nowrap">
                              <p className="text-[var(--text)] font-medium mb-1">
                                {r.therapist?.name ?? "Otomatis"}
                              </p>
                              {getStatusBadge(r.status)}
                            </td>
                            <td className="py-3 px-4 align-top text-right whitespace-nowrap tabular-nums">
                              {paid ? (
                                <span className="font-semibold text-[var(--accent)]">
                                  Rp {Number(r.total_price).toLocaleString("id-ID")}
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="text-[var(--text-muted)] line-through">
                                    Rp {Number(r.total_price).toLocaleString("id-ID")}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    Tidak masuk omset
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FFFFFF] border-t-2 border-[#29211D]">
                        <td
                          colSpan={6}
                          className="py-3.5 px-4 text-right font-bold text-[var(--text)] text-[13px] tabular-nums"
                        >
                          Total Pendapatan Sah ({filteredPaidReservations.length} dari {reportFilteredReservations.length} transaksi)
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[var(--accent)] text-[15px] tabular-nums whitespace-nowrap">
                          Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Proof Verification Modal ────────────────────────────────────────── */}
        {selectedProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setSelectedProof(null)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="card-surface w-full max-w-lg p-6 relative z-10 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <h3 className="text-[18px] font-semibold text-[var(--text)]">Verifikasi Pembayaran QRIS</h3>
                <button
                  type="button"
                  onClick={() => setSelectedProof(null)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[8px] hover:bg-[var(--fill-subtle)] transition-colors duration-150 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#FAF7F4] p-4 rounded-[8px] border border-[var(--border)] text-[13px]">
                <div>
                  <p className="overline-label">Kode Booking</p>
                  <p className="booking-code font-semibold text-[var(--text)] mt-0.5">
                    {selectedProof.booking_code}
                  </p>
                </div>
                <div>
                  <p className="overline-label">Total Pembayaran</p>
                  <p className="font-semibold text-[var(--accent)] tabular-nums mt-0.5">
                    Rp {Number(selectedProof.total_price).toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="overline-label">Pelanggan</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <p className="font-semibold text-[var(--text)]">{selectedProof.user?.name}</p>
                    {selectedProof.user?.phone_number && (
                      <a
                        href={getWaLinkFromPhone(
                          selectedProof.user.phone_number,
                          `Halo ${selectedProof.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa terkait konfirmasi bukti pembayaran reservasi (${selectedProof.booking_code}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-[var(--text)] underline underline-offset-4"
                      >
                        <MessageCircle size={12} className="text-[var(--text-muted)]" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                  {selectedProof.user?.phone_number && (
                    <p className="text-[12px] text-[var(--text-muted)] tabular-nums mt-0.5">
                      {selectedProof.user.phone_number}
                    </p>
                  )}
                </div>
                <div>
                  <p className="overline-label">Layanan</p>
                  <p className="font-medium text-[var(--text)] mt-0.5">{selectedProof.service?.name}</p>
                </div>
                <div>
                  <p className="overline-label">Data Anak</p>
                  <p className="font-medium text-[var(--text)] tabular-nums mt-0.5">
                    {selectedProof.baby_name || "-"} ({selectedProof.baby_age} bln)
                  </p>
                </div>
                <div>
                  <p className="overline-label">Catatan</p>
                  <p className="text-[var(--text-muted)] text-[12px] mt-0.5">
                    {selectedProof.notes ?? "Tidak ada catatan."}
                  </p>
                </div>
                {selectedProof.delivery_address && (
                  <div className="col-span-2">
                    <p className="overline-label">Alamat Kunjungan (Home Care)</p>
                    <div className="text-[12px] text-[var(--text)] bg-[#FFFFFF] p-2.5 rounded-[8px] border border-[var(--border)] mt-1 space-y-1">
                      <p>
                        {selectedProof.delivery_address.replace(GPS_PREFIX_REGEX, "").trim() ||
                          "Titik GPS terlampir."}
                      </p>
                      {selectedProof.delivery_address
                        .match(/https:\/\/maps\.google\.com\/\?q=[-0-9.,]+/g)
                        ?.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block font-semibold text-[var(--text)] underline underline-offset-4"
                          >
                            Buka Rute Google Maps
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                onClick={() => {
                  if (selectedProof.payment_proof_url && !proofImgError) {
                    setZoomedProofImage(getStorageUrl(selectedProof.payment_proof_url));
                    setZoomScale(1);
                  }
                }}
                className={`w-full aspect-video bg-[#FAF7F4] rounded-[8px] overflow-hidden border border-[var(--border)] relative flex items-center justify-center ${
                  selectedProof.payment_proof_url && !proofImgError ? "cursor-zoom-in group" : ""
                }`}
                title={selectedProof.payment_proof_url && !proofImgError ? "Klik untuk memperbesar" : undefined}
              >
                {selectedProof.payment_proof_url && !proofImgError ? (
                  <>
                    <img
                      src={getStorageUrl(selectedProof.payment_proof_url)}
                      alt="Bukti Transfer QRIS"
                      className="w-full h-full object-contain"
                      onError={() => setProofImgError(true)}
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 text-[#FFFFFF] font-medium text-[12px]">
                      <ZoomIn size={16} />
                      <span>Perbesar gambar</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[var(--text-muted)] flex flex-col items-center gap-2 p-4 text-center">
                    <FileImage size={32} />
                    <p className="text-[13px] font-medium text-[var(--text)]">Gambar bukti transfer tidak dapat dimuat</p>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Berkas bukti pembayaran pada penyimpanan tidak ditemukan.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleVerify(selectedProof.id, "cancelled")}
                  className="btn-secondary"
                >
                  Tolak Pembayaran
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify(selectedProof.id, "confirmed")}
                  className="btn-primary"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Image Lightbox Fullscreen Modal ────────────────────────────────────── */}
        {zoomedProofImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85">
            <div className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 text-[#FFFFFF]">
                <span className="text-[12px] font-medium px-3 py-1 rounded-[8px] bg-black/50 border border-white/20 tabular-nums">
                  Perbesaran: {Math.round(zoomScale * 100)}%
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                    className="p-2 rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-[#FFFFFF] cursor-pointer"
                    title="Perkecil"
                  >
                    <ZoomOut size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-[#FFFFFF] cursor-pointer tabular-nums"
                    title="Ukuran 100%"
                  >
                    100%
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                    className="p-2 rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-[#FFFFFF] cursor-pointer"
                    title="Perbesar"
                  >
                    <ZoomIn size={16} />
                  </button>

                  <a
                    href={zoomedProofImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-[#FFFFFF] cursor-pointer inline-flex items-center"
                    title="Buka di tab baru"
                  >
                    <ExternalLink size={16} />
                  </a>

                  <button
                    type="button"
                    onClick={() => setZoomedProofImage(null)}
                    className="p-2 rounded-[8px] bg-black/70 hover:bg-black border border-white/30 text-[#FFFFFF] cursor-pointer ml-2"
                    title="Tutup"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="w-full max-h-[82vh] overflow-auto rounded-[8px] bg-black/60 border border-white/15 p-2 flex items-center justify-center">
                <img
                  src={zoomedProofImage}
                  alt="Bukti Transfer Diperbesar"
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center" }}
                  className="max-h-[78vh] object-contain select-none rounded-[8px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Create / Edit Service Modal ───────────────────────────────────── */}
        {serviceModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
              className="absolute inset-0 bg-black/50"
            />
            <div className="card-surface w-full max-w-md p-6 relative z-10 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <h3 className="text-[18px] font-semibold text-[var(--text)]">
                  {serviceModal.mode === "create" ? "Tambah Layanan Baru" : "Edit Layanan"}
                </h3>
                <button
                  type="button"
                  onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[8px] hover:bg-[var(--fill-subtle)] transition-colors duration-150 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="flex flex-col gap-4">
                <div>
                  <label className="overline-label block mb-1.5">Nama Layanan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Baby Massage"
                    className="input-field"
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
                  <label className="overline-label block mb-1.5">Deskripsi Layanan</label>
                  <textarea
                    placeholder="Rincian perawatan dan kelompok usia..."
                    className="input-field h-24 resize-none py-2.5"
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
                    <label className="overline-label block mb-1.5">Durasi (Menit)</label>
                    <input
                      type="number"
                      placeholder="45"
                      className="input-field tabular-nums"
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
                    <label className="overline-label block mb-1.5">Harga (Rp)</label>
                    <input
                      type="number"
                      placeholder="50000"
                      className="input-field tabular-nums"
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
                      className="w-4 h-4 rounded-[4px] border-[var(--border)] accent-[var(--accent)]"
                      checked={serviceModal.data?.is_active ?? true}
                      onChange={(e) =>
                        setServiceModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, is_active: e.target.checked },
                        }))
                      }
                    />
                    <label htmlFor="is_active" className="text-[13px] font-medium text-[var(--text)] select-none cursor-pointer">
                      Layanan aktif (ditampilkan pada menu pemesanan)
                    </label>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
                    className="btn-secondary"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Create / Edit Therapist Modal ────────────────────────────────── */}
        {therapistModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
              className="absolute inset-0 bg-black/50"
            />
            <div className="card-surface w-full max-w-md p-6 relative z-10 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <h3 className="text-[18px] font-semibold text-[var(--text)]">
                  {therapistModal.mode === "create" ? "Tambah Staf Terapis" : "Edit Staf Terapis"}
                </h3>
                <button
                  type="button"
                  onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[8px] hover:bg-[var(--fill-subtle)] transition-colors duration-150 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTherapist} className="flex flex-col gap-4">
                <div>
                  <label className="overline-label block mb-1.5">Nama Lengkap Terapis</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bidan Susi"
                    className="input-field"
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
                    className="w-4 h-4 rounded-[4px] border-[var(--border)] accent-[var(--accent)]"
                    checked={therapistModal.data?.is_active ?? true}
                    onChange={(e) =>
                      setTherapistModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, is_active: e.target.checked },
                      }))
                    }
                  />
                  <label htmlFor="therapist_is_active" className="text-[13px] font-medium text-[var(--text)] select-none cursor-pointer">
                    Staf terapis aktif (menerima penjadwalan sesi)
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
                    className="btn-secondary"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Reschedule Reservation Modal ────────────────────────────────────── */}
        {rescheduleModal.isOpen && rescheduleModal.reservation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
              className="absolute inset-0 bg-black/50"
            />
            <div className="card-surface w-full max-w-md p-6 relative z-10 flex flex-col gap-5">
              <div className="flex items-start justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-[18px] font-semibold text-[var(--text)]">Reschedule Jadwal Sesi</h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    Perbarui tanggal dan jam reservasi sesuai konfirmasi pelanggan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[8px] hover:bg-[var(--fill-subtle)] transition-colors duration-150 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#FAF7F4] p-3.5 rounded-[8px] border border-[var(--border)] text-[12px] flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Kode Booking</span>
                  <span className="booking-code font-semibold text-[var(--text)]">
                    {rescheduleModal.reservation.booking_code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Pelanggan</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text)] font-semibold">{rescheduleModal.reservation.user?.name}</span>
                    {rescheduleModal.reservation.user?.phone_number && (
                      <a
                        href={getWaLinkFromPhone(
                          rescheduleModal.reservation.user.phone_number,
                          `Halo ${rescheduleModal.reservation.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa ingin mengonfirmasi jadwal reservasi (${rescheduleModal.reservation.booking_code}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text)] underline underline-offset-4"
                      >
                        <MessageCircle size={11} className="text-[var(--text-muted)]" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Layanan</span>
                  <span className="text-[var(--text)] font-medium">{rescheduleModal.reservation.service?.name}</span>
                </div>
                <div className="flex justify-between tabular-nums">
                  <span className="text-[var(--text-muted)]">Jadwal Sebelumnya</span>
                  <span className="text-[var(--text)]">
                    {rescheduleModal.reservation.reservation_date} • {rescheduleModal.reservation.start_time.substring(0, 5)} WIB
                  </span>
                </div>
              </div>

              <form onSubmit={handleReschedule} className="flex flex-col gap-4">
                <div>
                  <label className="overline-label block mb-1.5">Tanggal Baru</label>
                  <input
                    type="date"
                    className="input-field tabular-nums"
                    value={rescheduleModal.date}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="overline-label block mb-1.5">Jam Mulai Baru</label>
                  <select
                    className="input-field tabular-nums"
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
                  <label className="overline-label block mb-1.5">Catatan Reschedule (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Penyesuaian jadwal atas permintaan pelanggan melalui WhatsApp"
                    className="input-field resize-none py-2"
                    value={rescheduleModal.notes}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
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
                    {isRescheduling ? "Menyimpan..." : "Simpan Jadwal Baru"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* LAPORAN PRINT TEMPLATE */}
      <div className="hidden print:block text-[#29211D] p-8 tabular-nums">
        <div className="text-center border-b-2 border-[#29211D] pb-4 mb-6">
          <h1 className="text-2xl font-editorial">Mayesha Mom, Kids &amp; Baby Spa</h1>
          <p className="text-sm text-[#6E635D]">Laporan Transaksi, Keuangan &amp; Analitik Layanan Spa</p>
          <p className="text-xs text-[#6E635D] mt-1">
            Periode Filter:{" "}
            {reportStartDate || reportEndDate
              ? `${reportStartDate || "Awal"} s/d ${reportEndDate || "Sekarang"}`
              : "Semua Periode"}{" "}
            | Klasifikasi: {reportSegment === "all" ? "Semua (Bayi, Anak, Ibu)" : reportSegment} | Dicetak pada:{" "}
            {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider text-center">
          Ringkasan Kuantitatif Laporan
        </h2>

        <div className="grid grid-cols-4 gap-4 mb-8 border border-[#E6DFD8] p-4 rounded-[8px] text-center">
          <div>
            <p className="text-[10px] text-[#6E635D] font-semibold uppercase tracking-wider">Total Baris</p>
            <p className="text-base font-semibold mt-0.5">{reportFilteredReservations.length} sesi</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6E635D] font-semibold uppercase tracking-wider">Segmen Bayi / Anak</p>
            <p className="text-base font-semibold mt-0.5">
              {filteredSegmentStats.Bayi.count} Bayi / {filteredSegmentStats.Anak.count} Anak
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#6E635D] font-semibold uppercase tracking-wider">Segmen Ibu</p>
            <p className="text-base font-semibold mt-0.5">{filteredSegmentStats.Ibu.count} sesi</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6E635D] font-semibold uppercase tracking-wider">Total Pendapatan Sah</p>
            <p className="text-base font-semibold mt-0.5">
              Rp {filteredTotalRevenue.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wider">
          Tabel Rekapitulasi Data Transaksi &amp; Keuangan
        </h2>
        <table className="w-full text-left border-collapse border border-[#E6DFD8] text-[9px]">
          <thead>
            <tr className="bg-[#FAF7F4] border-b border-[#E6DFD8]">
              <th className="p-1.5 border border-[#E6DFD8] font-semibold text-center">No</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">Tanggal &amp; Jam</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">ID &amp; Customer</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">Nama Anak &amp; Umur</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">Klasifikasi</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">Layanan</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">Terapis</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">No WA</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold">Catatan</th>
              <th className="p-1.5 border border-[#E6DFD8] font-semibold text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {reportFilteredReservations.map((r, idx) => {
              const phone = r.user?.phone_number ?? "-";
              const cls = getReservationClassification(r);
              return (
                <tr key={r.id} className="border-b border-[#E6DFD8]">
                  <td className="p-1.5 border border-[#E6DFD8] text-center">{idx + 1}</td>
                  <td className="p-1.5 border border-[#E6DFD8]">
                    {new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    ({(r.start_time ?? "").slice(0, 5)})
                  </td>
                  <td className="p-1.5 border border-[#E6DFD8]">
                    #{r.user?.id ?? "-"} {r.user?.name ?? "-"} ({r.booking_code})
                  </td>
                  <td className="p-1.5 border border-[#E6DFD8]">
                    {r.baby_name} ({r.baby_age} bln)
                  </td>
                  <td className="p-1.5 border border-[#E6DFD8]">{cls}</td>
                  <td className="p-1.5 border border-[#E6DFD8]">{r.service?.name}</td>
                  <td className="p-1.5 border border-[#E6DFD8]">{r.therapist?.name ?? "Otomatis"}</td>
                  <td className="p-1.5 border border-[#E6DFD8] booking-code">{phone}</td>
                  <td className="p-1.5 border border-[#E6DFD8] max-w-[110px] truncate">{r.notes ?? "-"}</td>
                  <td className="p-1.5 border border-[#E6DFD8] text-right">
                    {isPaidReservation(r)
                      ? `Rp ${Number(r.total_price).toLocaleString("id-ID")}`
                      : `(Batal/Pending) Rp ${Number(r.total_price).toLocaleString("id-ID")}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#29211D] font-bold">
              <td colSpan={9} className="p-2 border border-[#E6DFD8] text-right uppercase">
                Total Pendapatan Sah ({filteredPaidReservations.length} dari {reportFilteredReservations.length} transaksi)
              </td>
              <td className="p-2 border border-[#E6DFD8] text-right">
                Rp {filteredTotalRevenue.toLocaleString("id-ID")}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-48">
            <p className="text-[10px]">Mengetahui,</p>
            <p className="text-[10px] font-semibold mt-1">Pemilik Mayesha Baby Spa</p>
            <div className="h-16"></div>
            <p className="text-[10px] border-t border-[#29211D] pt-1 font-semibold">( ____________________ )</p>
          </div>
        </div>
      </div>
    </div>
  );
}
