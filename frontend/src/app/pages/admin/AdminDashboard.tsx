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
  SlidersHorizontal,
  ChevronDown,
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
  LabelList,
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

const formatShortRupiah = (val: number): string => {
  if (val === 0) return "Rp 0";
  if (val >= 1_000_000) {
    const jt = val / 1_000_000;
    const formatted = Number.isInteger(jt) ? String(jt) : jt.toFixed(1).replace(".", ",");
    return `Rp ${formatted} jt`;
  }
  if (val >= 1_000) {
    const rb = Math.round(val / 1_000);
    return `Rp ${rb} rb`;
  }
  return `Rp ${val}`;
};

const renderWrappedYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = String(payload?.value ?? "");
  const maxCharsPerLine = 22;

  if (text.length <= maxCharsPerLine) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-6} y={4} textAnchor="end" fill="#4A2A1A" fontSize={12}>
          {text}
        </text>
      </g>
    );
  }

  const words = text.split(" ");
  let line1 = "";
  let line2 = "";
  for (const w of words) {
    if (!line1) {
      line1 = w;
    } else if ((line1 + " " + w).length <= maxCharsPerLine && !line2) {
      line1 += " " + w;
    } else {
      line2 = line2 ? line2 + " " + w : w;
    }
  }
  if (line2.length > maxCharsPerLine + 2) {
    line2 = line2.slice(0, maxCharsPerLine) + "…";
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-6} y={-2} textAnchor="end" fill="#4A2A1A" fontSize={12}>
        {line1}
      </text>
      <text x={-6} y={12} textAnchor="end" fill="#6B5A52" fontSize={12}>
        {line2}
      </text>
    </g>
  );
};

const scrollTabIntoView = (el: HTMLButtonElement | null) => {
  if (!el) return;
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: prefersReduced ? "auto" : "smooth",
    inline: "nearest",
    block: "nearest",
  });
};

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<"reservations" | "services" | "reports" | "therapists">("reservations");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReportFilterOpen, setIsReportFilterOpen] = useState(false);

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
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "service" | "therapist";
    id: number;
    name: string;
  } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);
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
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#F2ECE6] text-[#4A2A1A] text-[12px] leading-[18px] font-medium px-2 py-0.5 rounded-[6px] whitespace-nowrap">
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: SEGMENT_COLORS[cls] }}
        />
        <span>{cls}</span>
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

  const handleConfirmDeleteTarget = async () => {
    if (!deleteTarget || isDeletingTarget) return;
    setIsDeletingTarget(true);
    try {
      if (deleteTarget.type === "service") {
        await adminDeleteService(deleteTarget.id);
        toast.success("Layanan berhasil dihapus.");
        fetchServices();
      } else {
        await adminDeleteTherapist(deleteTarget.id);
        toast.success("Terapis berhasil dihapus.");
        fetchTherapists();
      }
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ??
          (deleteTarget.type === "service"
            ? "Gagal menghapus layanan."
            : "Gagal menghapus terapis.")
      );
    } finally {
      setIsDeletingTarget(false);
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

  const handleDeleteTherapist = (therapist: Therapist) => {
    setDeleteTarget({ type: "therapist", id: therapist.id, name: therapist.name });
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
    let label = status;
    let textColor = "text-[#6B5A52]";
    let dotColor = "bg-[#6B5A52]";

    if (status === "pending") {
      label = "Belum bayar";
      textColor = "text-[#8A5A00]";
      dotColor = "bg-[#8A5A00]";
    } else if (status === "waiting_verification") {
      label = "Menunggu verifikasi";
      textColor = "text-[#8A5A00]";
      dotColor = "bg-[#8A5A00]";
    } else if (status === "confirmed") {
      label = "Dikonfirmasi";
      textColor = "text-[#2F6B45]";
      dotColor = "bg-[#2F6B45]";
    } else if (status === "completed") {
      label = "Selesai";
      textColor = "text-[#6B5A52]";
      dotColor = "bg-[#6B5A52]";
    } else if (status === "cancelled") {
      label = "Dibatalkan";
      textColor = "text-[#9B3B3B]";
      dotColor = "bg-[#9B3B3B]";
    }

    return (
      <span className={`inline-flex items-center gap-2 text-[13px] leading-[18px] font-medium whitespace-nowrap ${textColor}`}>
        <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span>{label}</span>
      </span>
    );
  };

  const chartData = getFluctuationChartData();
  const rankedServicesData = getRankedServicesData();

  // Tutup modal yang aktif dengan tombol Escape
  useEffect(() => {
    const hasModalOpen =
      Boolean(zoomedProofImage) ||
      Boolean(deleteTarget) ||
      Boolean(selectedProof) ||
      serviceModal.isOpen ||
      therapistModal.isOpen ||
      rescheduleModal.isOpen;
    if (!hasModalOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (zoomedProofImage) {
        setZoomedProofImage(null);
      } else if (deleteTarget && !isDeletingTarget) {
        setDeleteTarget(null);
      } else if (selectedProof) {
        setSelectedProof(null);
      } else if (serviceModal.isOpen) {
        setServiceModal({ isOpen: false, mode: "create", data: null });
      } else if (therapistModal.isOpen) {
        setTherapistModal({ isOpen: false, mode: "create", data: null });
      } else if (rescheduleModal.isOpen) {
        setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" });
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [
    zoomedProofImage,
    deleteTarget,
    isDeletingTarget,
    selectedProof,
    serviceModal.isOpen,
    therapistModal.isOpen,
    rescheduleModal.isOpen,
  ]);

  return (
    <div className="admin-theme bg-[#FAF6F2] text-[15px] leading-[22px] font-['DM_Sans',sans-serif] overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 print:hidden">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div className="min-w-0">
            <h1 className="font-['Playfair_Display',Georgia,serif] font-medium text-[clamp(26px,6.5vw,40px)] leading-[1.15] text-[#4A2A1A]">
              Operasional dan laporan
            </h1>
            <p className="text-[15px] leading-[23px] text-[#6B5A52] mt-1.5 break-words">
              Verifikasi pembayaran QRIS, penjadwalan terapis, katalog layanan, dan analitik keuangan.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
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
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] border border-black/15 bg-white hover:bg-[#FAF6F2] transition-colors duration-150 text-[#6B5A52] hover:text-[#4A2A1A] flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
              title="Muat ulang data"
              aria-label="Muat ulang data"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>

            {activeMenu === "reservations" && (
              <div className="relative flex-1 md:flex-none md:min-w-[280px] md:w-[280px] lg:w-[300px] min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5A52]" size={16} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Cari reservasi"
                  className="w-full h-11 rounded-[8px] bg-white border border-black/20 pl-9 pr-11 text-[16px] text-[#4A2A1A] placeholder:text-[#6B5A52]/75 focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] cursor-pointer rounded-[8px]"
                    title="Hapus pencarian"
                    aria-label="Hapus pencarian"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4 Equal White KPI Cards: 1 col <480px, 2 col >=480px, 4 col >=1024px */}
        {(activeMenu === "reservations" || activeMenu === "reports") && (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6 md:mb-8 items-stretch">
          <div className="bg-white border border-black/10 rounded-[12px] p-5 flex flex-col min-w-0">
            <span className="text-[13px] leading-[18px] font-normal text-[#6B5A52]">
              Pendapatan bulan ini
            </span>
            <p className="mt-2 text-[24px] sm:text-[28px] xl:text-[32px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums break-words">
              Rp {thisMonthRevenue.toLocaleString("id-ID")}
            </p>
            <div className="mt-2.5 flex flex-col gap-0.5 text-[13px] leading-[19px] text-[#6B5A52] tabular-nums">
              <span>{thisMonthReservations.length} transaksi</span>
              {hasLastMonthBaseline ? (
                <span>Bulan lalu Rp {lastMonthRevenue.toLocaleString("id-ID")}</span>
              ) : (
                <span>Belum ada pembanding bulan lalu</span>
              )}
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-[12px] p-5 flex flex-col min-w-0">
            <span className="text-[13px] leading-[18px] font-normal text-[#6B5A52] tabular-nums">
              Pendapatan tahun {currentYearNum}
            </span>
            <p className="mt-2 text-[24px] sm:text-[28px] xl:text-[32px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums break-words">
              Rp {thisYearRevenue.toLocaleString("id-ID")}
            </p>
            <div className="mt-2.5 flex flex-col gap-0.5 text-[13px] leading-[19px] text-[#6B5A52] tabular-nums">
              <span>{thisYearReservations.length} transaksi sah</span>
              <span>Akumulasi Rp {stats.total_revenue.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-[12px] p-5 flex flex-col min-w-0">
            <span className="text-[13px] leading-[18px] font-normal text-[#6B5A52]">
              Transaksi per segmen
            </span>
            <div className="mt-2 grid grid-cols-3 divide-x divide-black/10">
              <div className="pr-2">
                <p className="text-[24px] sm:text-[28px] xl:text-[32px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums">
                  {overallSegmentStats.Bayi}
                </p>
                <p className="text-[12px] leading-[16px] text-[#6B5A52] mt-0.5">Bayi</p>
              </div>
              <div className="px-2">
                <p className="text-[24px] sm:text-[28px] xl:text-[32px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums">
                  {overallSegmentStats.Anak}
                </p>
                <p className="text-[12px] leading-[16px] text-[#6B5A52] mt-0.5">Anak</p>
              </div>
              <div className="pl-2">
                <p className="text-[24px] sm:text-[28px] xl:text-[32px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums">
                  {overallSegmentStats.Ibu}
                </p>
                <p className="text-[12px] leading-[16px] text-[#6B5A52] mt-0.5">Ibu</p>
              </div>
            </div>
            <p className="mt-2.5 text-[13px] leading-[19px] text-[#6B5A52] tabular-nums">
              Total {validReservations.length} sesi sah
            </p>
          </div>

          <div className="bg-white border border-black/10 rounded-[12px] p-5 flex flex-col min-w-0">
            <span className="text-[13px] leading-[18px] font-normal text-[#6B5A52]">
              Operasional dan pelanggan
            </span>
            <p className="mt-2 text-[24px] sm:text-[28px] xl:text-[32px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums">
              {stats.completed_sessions}{" "}
              <span className="text-[13px] font-normal text-[#6B5A52]">sesi selesai</span>
            </p>
            <div className="mt-2.5 flex flex-col gap-0.5 text-[13px] leading-[19px] text-[#6B5A52] tabular-nums">
              <span>Hari ini: {stats.today_bookings} booking</span>
              <span>Pelanggan: {stats.total_customers} akun</span>
              <span>
                Layanan aktif: {services.filter((s) => s.is_active).length}/{services.length}
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Horizontal Underline Tabs */}
        <div
          role="tablist"
          aria-label="Menu operasional admin"
          className="flex gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden no-scrollbar whitespace-nowrap border-b border-black/10 mb-6 print:hidden"
        >
          {[
            { id: "reservations", label: "Kelola reservasi" },
            { id: "services", label: "Kelola layanan" },
            { id: "therapists", label: "Kelola terapis" },
            { id: "reports", label: "Analisis dan laporan" },
          ].map((tab) => {
            const isActive = activeMenu === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(e) => {
                  setActiveMenu(tab.id as "reservations" | "services" | "therapists" | "reports");
                  scrollTabIntoView(e.currentTarget);
                }}
                className={`min-h-[44px] inline-flex items-center text-[15px] transition-colors duration-150 border-b-2 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                  isActive
                    ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                    : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: KELOLA RESERVASI ───────────────────────────────────────── */}
        {activeMenu === "reservations" && (
          <div className="flex flex-col gap-4 min-w-0">
            <div
              role="group"
              aria-label="Filter status reservasi"
              className="flex items-center gap-1.5 overflow-x-auto md:overflow-visible md:flex-wrap overflow-y-hidden no-scrollbar py-0.5"
            >
              {[
                { id: "all", label: "Semua", count: reservations.length },
                {
                  id: "waiting_verification",
                  label: "Menunggu verifikasi",
                  count: reservations.filter((r) => r.status === "waiting_verification").length,
                },
                {
                  id: "pending",
                  label: "Belum bayar",
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
                    aria-pressed={isActive}
                    onClick={(e) => {
                      setResFilter(f.id);
                      scrollTabIntoView(e.currentTarget);
                    }}
                    className={`min-h-[44px] md:min-h-0 px-3 py-1.5 rounded-[8px] text-[14px] leading-[20px] transition-colors duration-150 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-1 ${
                      isActive
                        ? "bg-[#FBE9F1] text-[#4A2A1A] font-medium"
                        : "bg-transparent text-[#6B5A52] font-normal hover:bg-black/[0.04] hover:text-[#4A2A1A]"
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.count > 0 && (
                      <span className="text-[12px] text-[#6B5A52] font-normal tabular-nums">
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isResLoading ? (
              <div className="bg-white border border-black/10 rounded-[12px] flex flex-col items-center justify-center py-20 gap-2.5">
                <Loader2 size={24} className="animate-spin text-[#6B5A52]" />
                <p className="text-[#6B5A52] text-[14px]">Memuat data reservasi...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="bg-white border border-black/10 rounded-[12px] text-center py-16 px-6">
                <p className="text-[#4A2A1A] font-medium text-[16px]">Tidak ada reservasi ditemukan</p>
                <p className="text-[#6B5A52] text-[14px] mt-1">
                  Ubah filter status atau gunakan kata kunci pencarian lain.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Stacked Cards (< 768px) */}
                <div className="md:hidden flex flex-col gap-3">
                  {filteredReservations.map((r) => {
                    const isCancelled = r.status === "cancelled";
                    return (
                      <article
                        key={r.id}
                        className={`border border-black/10 rounded-[12px] p-4 flex flex-col gap-3 min-w-0 ${
                          isCancelled ? "bg-white/75" : "bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/10">
                          <span
                            className={`booking-code text-[14px] font-medium ${
                              isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                            }`}
                          >
                            {r.booking_code}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(r.status)}
                            {r.is_rescheduled && !isCancelled && (
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5A4A8A]">
                                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0 bg-[#5A4A8A]" />
                                <span>Reschedule</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 text-[14px]">
                          <div className="min-w-0">
                            <span className="block text-[12px] text-[#6B5A52]">Pelanggan</span>
                            <p className={`font-medium break-words ${isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"}`}>
                              {r.user?.name ?? "-"}
                            </p>
                            {r.baby_name && (
                              <p className="text-[13px] text-[#6B5A52] tabular-nums break-words">
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
                                className="inline-flex items-center gap-1.5 min-h-[44px] text-[14px] text-[#C94A83] hover:underline underline-offset-4 tabular-nums"
                              >
                                <MessageCircle size={14} aria-hidden="true" />
                                <span>{r.user.phone_number}</span>
                              </a>
                            )}
                            {r.delivery_address ? (
                              <div className="mt-1 text-[13px] text-[#6B5A52]">
                                <span className="inline-flex items-center gap-1 font-medium text-[#4A2A1A]">
                                  <MapPin size={12} className="text-[#6B5A52]" aria-hidden="true" />
                                  Home Care
                                </span>
                                <p className="break-words mt-0.5">
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
                                      className="inline-flex items-center min-h-[44px] text-[14px] font-medium text-[#C94A83] hover:underline underline-offset-4"
                                    >
                                      Buka Google Maps
                                    </a>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[13px] text-[#6B5A52]">Studio Mayesha</p>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="block text-[12px] text-[#6B5A52]">Layanan</span>
                            <p className={`font-medium break-words ${isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"}`}>
                              {r.service?.name ?? "-"}
                            </p>
                            <p className="text-[13px] text-[#6B5A52] tabular-nums">
                              {r.service?.duration_minutes ?? 0} menit - {r.therapist?.name ?? "Otomatis"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="min-w-0">
                              <span className="block text-[12px] text-[#6B5A52]">Jadwal</span>
                              <p className={`font-medium tabular-nums ${isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"}`}>
                                {new Date(r.reservation_date).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-[13px] text-[#6B5A52] tabular-nums">
                                {r.start_time.substring(0, 5)}–{r.end_time.substring(0, 5)} WIB
                              </p>
                            </div>

                            <div className="min-w-0 text-right">
                              <span className="block text-[12px] text-[#6B5A52]">Total harga</span>
                              <p
                                className={`text-[15px] tabular-nums ${
                                  isCancelled ? "text-[#6B5A52] line-through" : "font-medium text-[#4A2A1A]"
                                }`}
                              >
                                Rp {Number(r.total_price).toLocaleString("id-ID")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {r.status !== "completed" && r.status !== "cancelled" && (
                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-black/10">
                            {r.status === "waiting_verification" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProof(r);
                                  setProofImgError(false);
                                }}
                                aria-label={`Verifikasi pembayaran ${r.booking_code}`}
                                className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3.5 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[14px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap"
                              >
                                Verifikasi
                              </button>
                            ) : r.status === "confirmed" ? (
                              <button
                                type="button"
                                onClick={() => handleVerify(r.id, "completed")}
                                aria-label={`Selesaikan sesi ${r.booking_code}`}
                                className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3.5 rounded-[8px] border border-[#C94A83] text-[#C94A83] bg-transparent hover:bg-[#B73F73] hover:text-white text-[14px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap"
                              >
                                Selesaikan
                              </button>
                            ) : null}

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
                              aria-label={`Reschedule reservasi ${r.booking_code}`}
                              className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3.5 rounded-[8px] border border-[#C94A83] text-[#C94A83] bg-transparent hover:bg-[#B73F73] hover:text-white text-[14px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap"
                            >
                              Reschedule
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block bg-white border border-black/10 rounded-[12px] overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full table-auto text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-black/10 bg-[#FAF6F2]">
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                          Kode booking
                        </th>
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                          Pelanggan
                        </th>
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                          Layanan
                        </th>
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                          Jadwal
                        </th>
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                          Total harga
                        </th>
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                          Status
                        </th>
                        <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10">
                      {filteredReservations.map((r) => {
                        const isCancelled = r.status === "cancelled";
                        return (
                          <tr
                            key={r.id}
                            className={`transition-colors duration-150 ${
                              isCancelled
                                ? "bg-[#FAF6F2]/40 hover:bg-[#FAF6F2]/70"
                                : "bg-white hover:bg-[#FAF6F2]/60"
                            }`}
                          >
                            <td className="py-3 px-3 align-top whitespace-nowrap">
                              <span
                                className={`booking-code font-medium ${
                                  isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                                }`}
                              >
                                {r.booking_code}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-top max-w-[230px]">
                              <p
                                className={`font-medium break-words ${
                                  isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                                }`}
                              >
                                {r.user?.name ?? "-"}
                              </p>
                              {r.baby_name && (
                                <p className="text-[12px] text-[#6B5A52] tabular-nums mt-0.5 break-words">
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
                                  className="inline-flex items-center gap-1 text-[12px] text-[#6B5A52] hover:text-[#4A2A1A] hover:underline underline-offset-4 mt-0.5 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] rounded-sm"
                                  title="Hubungi via WhatsApp"
                                >
                                  <MessageCircle size={12} aria-hidden="true" />
                                  <span>{r.user.phone_number}</span>
                                </a>
                              )}
                              {r.delivery_address ? (
                                <div className="mt-1 text-[12px] text-[#6B5A52]">
                                  <span
                                    className={`inline-flex items-center gap-1 font-medium ${
                                      isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                                    }`}
                                  >
                                    <MapPin size={11} className="text-[#6B5A52]" aria-hidden="true" />
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
                                        className="inline-block text-[12px] font-medium text-[#C94A83] hover:underline underline-offset-4 mt-0.5"
                                      >
                                        Buka Google Maps
                                      </a>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-[12px] text-[#6B5A52] mt-0.5">Studio Mayesha</p>
                              )}
                            </td>

                            <td className="py-3 px-3 align-top max-w-[220px]">
                              <p
                                className={`font-medium break-words ${
                                  isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                                }`}
                              >
                                {r.service?.name ?? "-"}
                              </p>
                              <p className="text-[13px] text-[#6B5A52] tabular-nums mt-0.5 break-words">
                                {r.service?.duration_minutes ?? 0} menit - {r.therapist?.name ?? "Otomatis"}
                              </p>
                            </td>

                            <td className="py-3 px-3 align-top whitespace-nowrap tabular-nums">
                              <p
                                className={`font-medium ${
                                  isCancelled ? "text-[#6B5A52]" : "text-[#4A2A1A]"
                                }`}
                              >
                                {new Date(r.reservation_date).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-[12px] text-[#6B5A52] mt-0.5">
                                {r.start_time.substring(0, 5)}–{r.end_time.substring(0, 5)} WIB
                              </p>
                            </td>

                            <td className="py-3 px-3 align-top text-right whitespace-nowrap tabular-nums">
                              <span
                                className={
                                  isCancelled
                                    ? "text-[#6B5A52] line-through"
                                    : "font-medium text-[#4A2A1A]"
                                }
                              >
                                Rp {Number(r.total_price).toLocaleString("id-ID")}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-top whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1">
                                {getStatusBadge(r.status)}
                                {r.is_rescheduled && !isCancelled && (
                                  <span className="inline-flex items-center gap-2 text-[13px] leading-[18px] font-medium text-[#5A4A8A] whitespace-nowrap">
                                    <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0 bg-[#5A4A8A]" />
                                    <span>Reschedule</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top text-right">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {r.status === "waiting_verification" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedProof(r);
                                      setProofImgError(false);
                                    }}
                                    aria-label={`Verifikasi pembayaran ${r.booking_code}`}
                                    className="inline-flex items-center justify-center h-8 px-3 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[13px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                                  >
                                    Verifikasi
                                  </button>
                                ) : r.status === "confirmed" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleVerify(r.id, "completed")}
                                    aria-label={`Selesaikan sesi ${r.booking_code}`}
                                    className="inline-flex items-center justify-center h-8 px-3 rounded-[8px] border border-[#C94A83] text-[#C94A83] bg-transparent hover:bg-[#B73F73] hover:text-white text-[13px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
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
                                    aria-label={`Reschedule reservasi ${r.booking_code}`}
                                    className="inline-flex items-center justify-center h-8 px-3 rounded-[8px] border border-[#C94A83] text-[#C94A83] bg-transparent hover:bg-[#B73F73] hover:text-white text-[13px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                                  >
                                    Reschedule
                                  </button>
                                )}

                                {(r.status === "completed" || r.status === "cancelled") && (
                                  <span className="text-[13px] text-[#6B5A52]">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 2: KELOLA LAYANAN ─────────────────────────────────────────── */}
        {activeMenu === "services" && (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div
                role="group"
                aria-label="Filter segmen layanan"
                className="flex items-center gap-1.5 overflow-x-auto md:overflow-visible md:flex-wrap overflow-y-hidden no-scrollbar py-0.5"
              >
                {[
                  { id: "all", label: "Semua", count: services.length },
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
                      aria-pressed={isActive}
                      onClick={(e) => {
                        setServiceSegmentFilter(f.id as "all" | "Bayi" | "Anak" | "Ibu");
                        scrollTabIntoView(e.currentTarget);
                      }}
                      className={`min-h-[44px] md:min-h-0 px-3 py-1.5 rounded-[8px] text-[14px] leading-[20px] transition-colors duration-150 whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-1 ${
                        isActive
                          ? "bg-[#FBE9F1] text-[#4A2A1A] font-medium"
                          : "bg-transparent text-[#6B5A52] font-normal hover:bg-black/[0.04] hover:text-[#4A2A1A]"
                      }`}
                    >
                      <span>{f.label}</span>
                      {f.count > 0 && (
                        <span className="text-[12px] text-[#6B5A52] font-normal tabular-nums">
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setServiceModal({ isOpen: true, mode: "create", data: {} })}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-4 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[14px] font-medium transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
              >
                Tambah layanan
              </button>
            </div>

            {isServLoading ? (
              <div className="bg-white border border-black/10 rounded-[12px] flex flex-col items-center justify-center py-20 gap-2.5">
                <Loader2 size={24} className="animate-spin text-[#6B5A52]" />
                <p className="text-[#6B5A52] text-[14px]">Memuat data layanan...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="bg-white border border-black/10 rounded-[12px] text-center py-16 px-6">
                <p className="text-[#4A2A1A] font-medium text-[16px]">Tidak ada layanan ditemukan</p>
                <p className="text-[#6B5A52] text-[14px] mt-1">
                  Pilih filter klasifikasi lain atau tambahkan layanan baru.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Stacked Cards (< 768px) */}
                <div className="md:hidden flex flex-col gap-3">
                  {filteredServices.map((s) => (
                    <article
                      key={s.id}
                      className="bg-white border border-black/10 rounded-[12px] p-4 flex flex-col gap-3 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-black/10">
                        <div className="min-w-0">
                          <h3 className="text-[16px] leading-[22px] font-medium text-[#4A2A1A] break-words">
                            {s.name}
                          </h3>
                          <div className="mt-1.5">{getClassificationBadge(getServiceClassification(s))}</div>
                        </div>
                        <div className="shrink-0">
                          {s.is_active ? (
                            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2F6B45]">
                              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#2F6B45] shrink-0" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B5A52]">
                              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#6B5A52] shrink-0" />
                              <span>Nonaktif</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {s.description && (
                        <div>
                          <span className="block text-[12px] text-[#6B5A52]">Deskripsi</span>
                          <p className="text-[14px] leading-[21px] text-[#6B5A52] break-words mt-0.5">
                            {s.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-[14px]">
                        <div>
                          <span className="block text-[12px] text-[#6B5A52]">Durasi</span>
                          <span className="text-[#4A2A1A] tabular-nums">{s.duration_minutes} menit</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[12px] text-[#6B5A52]">Harga</span>
                          <span className="font-medium text-[#4A2A1A] tabular-nums">
                            Rp {Number(s.price).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-black/10">
                        <button
                          type="button"
                          onClick={() => setServiceModal({ isOpen: true, mode: "edit", data: s })}
                          aria-label={`Ubah ${s.name}`}
                          className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 rounded-[8px] border border-black/15 text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer"
                        >
                          <Edit2 size={15} aria-hidden="true" />
                          <span>Ubah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: "service", id: s.id, name: s.name })}
                          aria-label={`Hapus ${s.name}`}
                          className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 rounded-[8px] border border-black/15 text-[14px] font-medium text-[#6B5A52] hover:text-[#9B3B3B] hover:border-[#9B3B3B]/40 hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block bg-white border border-black/10 rounded-[12px] overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full table-auto text-left border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-black/10 bg-[#FAF6F2]">
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                            Nama layanan
                          </th>
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                            Klasifikasi
                          </th>
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                            Deskripsi
                          </th>
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                            Durasi
                          </th>
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                            Harga
                          </th>
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                            Status
                          </th>
                          <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10">
                        {filteredServices.map((s) => (
                          <tr key={s.id} className="bg-white hover:bg-[#FAF6F2]/60 transition-colors duration-150">
                            <td className="py-2.5 px-3 font-medium text-[#4A2A1A]">{s.name}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {getClassificationBadge(getServiceClassification(s))}
                            </td>
                            <td
                              className="py-2.5 px-3 text-[#6B5A52] max-w-[260px] truncate"
                              title={s.description || undefined}
                            >
                              {s.description}
                            </td>
                            <td className="py-2.5 px-3 text-[#4A2A1A] tabular-nums whitespace-nowrap">
                              {s.duration_minutes} menit
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[#4A2A1A] tabular-nums text-right whitespace-nowrap">
                              Rp {Number(s.price).toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {s.is_active ? (
                                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2F6B45]">
                                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#2F6B45] shrink-0" />
                                  <span>Aktif</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B5A52]">
                                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#6B5A52] shrink-0" />
                                  <span>Nonaktif</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setServiceModal({ isOpen: true, mode: "edit", data: s })}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                                  title={`Ubah ${s.name}`}
                                  aria-label={`Ubah ${s.name}`}
                                >
                                  <Edit2 size={16} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ type: "service", id: s.id, name: s.name })}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#9B3B3B] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                                  title={`Hapus ${s.name}`}
                                  aria-label={`Hapus ${s.name}`}
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 3: KELOLA TERAPIS ─────────────────────────────────────────── */}
        {activeMenu === "therapists" && (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTherapistModal({ isOpen: true, mode: "create", data: {} })}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-4 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[14px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
              >
                Tambah terapis
              </button>
            </div>

            {isTherapistsLoading ? (
              <div className="bg-white border border-black/10 rounded-[12px] flex flex-col items-center justify-center py-20 gap-2.5">
                <Loader2 size={24} className="animate-spin text-[#6B5A52]" />
                <p className="text-[#6B5A52] text-[14px]">Memuat data terapis...</p>
              </div>
            ) : therapists.length === 0 ? (
              <div className="bg-white border border-black/10 rounded-[12px] text-center py-16 px-6">
                <p className="text-[#4A2A1A] font-medium text-[16px]">Belum ada staf terapis</p>
                <p className="text-[#6B5A52] text-[14px] mt-1">
                  Tambahkan staf terapis untuk menangani jadwal reservasi perawatan.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Stacked Cards (< 768px) */}
                <div className="md:hidden flex flex-col gap-3">
                  {filteredTherapists.map((t) => (
                    <article
                      key={t.id}
                      className="bg-white border border-black/10 rounded-[12px] p-4 flex flex-col gap-3 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[16px] font-medium text-[#4A2A1A] break-words min-w-0">
                          {t.name}
                        </h3>
                        <div className="shrink-0">
                          {t.is_active ? (
                            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2F6B45]">
                              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#2F6B45] shrink-0" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B5A52]">
                              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#6B5A52] shrink-0" />
                              <span>Nonaktif (cuti)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-black/10">
                        <button
                          type="button"
                          onClick={() => setTherapistModal({ isOpen: true, mode: "edit", data: t })}
                          aria-label={`Ubah ${t.name}`}
                          className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 rounded-[8px] border border-black/15 text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer"
                        >
                          <Edit2 size={15} aria-hidden="true" />
                          <span>Ubah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTherapist(t)}
                          aria-label={`Hapus ${t.name}`}
                          className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 rounded-[8px] border border-black/15 text-[14px] font-medium text-[#6B5A52] hover:text-[#9B3B3B] hover:border-[#9B3B3B]/40 hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block bg-white border border-black/10 rounded-[12px] overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full table-auto text-left border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-black/10 bg-[#FAF6F2]">
                          <th className="py-3 px-4 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                            Nama terapis
                          </th>
                          <th className="py-3 px-4 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                            Status
                          </th>
                          <th className="py-3 px-4 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10">
                        {filteredTherapists.map((t) => (
                          <tr key={t.id} className="bg-white hover:bg-[#FAF6F2]/60 transition-colors duration-150">
                            <td className="py-2.5 px-4 font-medium text-[#4A2A1A]">
                              {t.name}
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              {t.is_active ? (
                                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2F6B45]">
                                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#2F6B45] shrink-0" />
                                  <span>Aktif</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B5A52]">
                                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#6B5A52] shrink-0" />
                                  <span>Nonaktif (cuti)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setTherapistModal({ isOpen: true, mode: "edit", data: t })}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                                  title={`Ubah ${t.name}`}
                                  aria-label={`Ubah ${t.name}`}
                                >
                                  <Edit2 size={16} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTherapist(t)}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#9B3B3B] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                                  title={`Hapus ${t.name}`}
                                  aria-label={`Hapus ${t.name}`}
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 4: ANALISIS & LAPORAN ─────────────────────────────────────── */}
        {activeMenu === "reports" && (() => {
          const displayedRankedServices = showAllTopServices
            ? rankedServicesData
            : topServicesSort === "most"
              ? rankedServicesData.filter((item) => item.count > 0)
              : rankedServicesData.slice(0, 10);

          const soldRankedServices = rankedServicesData.filter((item) => item.count > 0);
          const horizontalChartData =
            topServicesSort === "most"
              ? (soldRankedServices.length > 0 ? soldRankedServices : rankedServicesData).slice(0, 8)
              : rankedServicesData.slice(0, 8);

          const activeFilterCount =
            (reportPreset !== "all" ? 1 : 0) +
            (reportStartDate || reportEndDate ? 1 : 0) +
            (reportServiceId !== "all" ? 1 : 0) +
            (reportStatusFilter !== "all" ? 1 : 0) +
            (reportSegment !== "all" ? 1 : 0);

          return (
            <div className="flex flex-col gap-6 min-w-0">
              <div className="bg-white border border-black/10 rounded-[12px] p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 pb-4">
                  <div className="min-w-0">
                    <h3 className="font-medium text-[#4A2A1A] text-[16px]">
                      Filter laporan transaksi dan analitik
                    </h3>
                    <p className="text-[14px] text-[#6B5A52] mt-0.5 break-words">
                      Saring data menurut rentang tanggal, preset periode, klasifikasi segmen, dan jenis layanan.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={resetReportFilters}
                      className="inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-[8px] border border-black/15 text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                    >
                      Reset filter
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-[8px] border border-[#C94A83] text-[14px] font-medium text-[#C94A83] hover:bg-[#B73F73] hover:text-white transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                    >
                      <Download size={15} aria-hidden="true" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="col-span-2 sm:col-span-1 bg-[#B73F73] hover:bg-[#A13464] text-white text-[14px] font-medium min-h-[44px] px-3.5 rounded-[8px] inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                    >
                      <Printer size={15} aria-hidden="true" />
                      Cetak PDF
                    </button>
                  </div>
                </div>

                {/* Tombol Toggle Accordion Filter pada HP (< 768px) */}
                <button
                  type="button"
                  onClick={() => setIsReportFilterOpen((prev) => !prev)}
                  aria-expanded={isReportFilterOpen}
                  aria-controls="admin-report-filter-panel"
                  className="md:hidden w-full min-h-[44px] px-3.5 rounded-[8px] border border-black/15 bg-[#FAF6F2] text-[#4A2A1A] text-[14px] font-medium flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
                >
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#6B5A52]" aria-hidden="true" />
                    <span>
                      Filter{activeFilterCount > 0 ? ` (${activeFilterCount} aktif)` : ""}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`text-[#6B5A52] transition-transform duration-150 ${
                      isReportFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  id="admin-report-filter-panel"
                  className={`${isReportFilterOpen ? "flex" : "hidden md:flex"} flex-col gap-4`}
                >
                  <div
                    role="tablist"
                    aria-label="Preset periode laporan"
                    className="flex items-center gap-5 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-black/10"
                  >
                    {[
                      { id: "all", label: "Semua waktu" },
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
                          role="tab"
                          aria-selected={isActive}
                          onClick={(e) => {
                            applyReportPreset(p.id as "all" | "today" | "week" | "month" | "year");
                            scrollTabIntoView(e.currentTarget);
                          }}
                          className={`min-h-[44px] inline-flex items-center text-[14px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                            isActive
                              ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                              : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="min-w-0">
                      <label htmlFor="report-start-date" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                        Dari tanggal
                      </label>
                      <input
                        id="report-start-date"
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => {
                          setReportStartDate(e.target.value);
                          setReportPreset("custom");
                        }}
                        className="w-full h-11 px-3 rounded-[8px] bg-white border border-black/20 text-[16px] text-[#4A2A1A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="report-end-date" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                        Sampai tanggal
                      </label>
                      <input
                        id="report-end-date"
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => {
                          setReportEndDate(e.target.value);
                          setReportPreset("custom");
                        }}
                        className="w-full h-11 px-3 rounded-[8px] bg-white border border-black/20 text-[16px] text-[#4A2A1A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C94A83] focus:ring-offset-2 focus:border-[#C94A83]"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="report-service-id" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5 tabular-nums">
                        Jenis layanan ({services.length})
                      </label>
                      <select
                        id="report-service-id"
                        value={reportServiceId}
                        onChange={(e) => setReportServiceId(e.target.value)}
                        className="input-field text-[16px]"
                      >
                        <option value="all">Semua layanan ({services.length})</option>
                        {services.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            [{getServiceClassification(s)}] {s.name} — Rp {Number(s.price).toLocaleString("id-ID")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="report-status-filter" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                        Status transaksi
                      </label>
                      <select
                        id="report-status-filter"
                        value={reportStatusFilter}
                        onChange={(e) => setReportStatusFilter(e.target.value as any)}
                        className="input-field text-[16px]"
                      >
                        <option value="all">Semua status reservasi</option>
                        <option value="valid">Transaksi sah saja (dikonfirmasi dan selesai)</option>
                        <option value="completed">Selesai saja</option>
                        <option value="confirmed">Dikonfirmasi saja</option>
                        <option value="cancelled">Dibatalkan saja</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pt-3 border-t border-black/10">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 min-w-0">
                      <span className="text-[14px] font-medium text-[#4A2A1A] shrink-0 sm:pb-2.5">
                        Klasifikasi segmen:
                      </span>
                      <div
                        role="tablist"
                        aria-label="Filter klasifikasi segmen"
                        className="flex items-center gap-5 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-black/10"
                      >
                        {[
                          { id: "all", label: "Semua segmen" },
                          { id: "Bayi", label: "Bayi (0–12 bulan)" },
                          { id: "Anak", label: "Anak (1–5 tahun)" },
                          { id: "Ibu", label: "Ibu dan dewasa" },
                        ].map((seg) => {
                          const isActive = reportSegment === seg.id;
                          return (
                            <button
                              key={seg.id}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              onClick={(e) => {
                                setReportSegment(seg.id as "all" | "Bayi" | "Anak" | "Ibu");
                                scrollTabIntoView(e.currentTarget);
                              }}
                              className={`min-h-[44px] inline-flex items-center text-[14px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                                isActive
                                  ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                                  : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                              }`}
                            >
                              {seg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[13px] text-[#6B5A52] tabular-nums">
                  Menampilkan <span className="font-medium text-[#4A2A1A]">{reportFilteredReservations.length}</span> baris (
                  <span className="font-medium text-[#2F6B45]">{filteredPaidReservations.length}</span> transaksi sah)
                  {reportStartDate || reportEndDate
                    ? ` • ${reportStartDate || "Awal"} s/d ${reportEndDate || "Sekarang"}`
                    : " • Semua periode"}
                </p>
              </div>

              {/* 4 Kartu Ringkasan Seragam & Sejajar (1 col <480px, 2 col >=480px, 4 col >=1024px) */}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                <div className="bg-white border border-black/10 rounded-[12px] p-4 sm:p-5 flex flex-col min-w-0">
                  <span className="text-[13px] leading-[18px] text-[#6B5A52]">
                    Total omset (transaksi sah)
                  </span>
                  <p className="mt-2 text-[24px] sm:text-[26px] xl:text-[28px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums break-words">
                    Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-2.5 text-[13px] leading-[19px] text-[#6B5A52] tabular-nums">
                    Dari {filteredPaidReservations.length} transaksi sah ({reportFilteredReservations.length} baris)
                  </p>
                </div>

                {(["Bayi", "Anak", "Ibu"] as const).map((segKey) => {
                  const segData = filteredSegmentStats[segKey];
                  const pct =
                    filteredPaidReservations.length > 0
                      ? Math.round((segData.count / filteredPaidReservations.length) * 100)
                      : 0;
                  return (
                    <div key={segKey} className="bg-white border border-black/10 rounded-[12px] p-4 sm:p-5 flex flex-col min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[13px] leading-[18px] text-[#6B5A52]">
                          <span
                            aria-hidden="true"
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: SEGMENT_COLORS[segKey] }}
                          />
                          <span>Segmen {segKey}</span>
                        </span>
                        <span className="text-[12px] text-[#6B5A52] tabular-nums">{pct}%</span>
                      </div>
                      <p className="mt-2 text-[24px] sm:text-[26px] xl:text-[28px] leading-[1.15] font-medium text-[#4A2A1A] tabular-nums">
                        {segData.count}{" "}
                        <span className="text-[13px] font-normal text-[#6B5A52]">sesi sah</span>
                      </p>
                      <p className="mt-2.5 text-[13px] leading-[19px] text-[#6B5A52] tabular-nums">
                        Omset Rp {segData.revenue.toLocaleString("id-ID")}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Bar Kontrol Grafik */}
              <div className="bg-white border border-black/10 rounded-[12px] px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-medium text-[#4A2A1A] text-[16px]">
                    Grafik fluktuasi keuangan dan komparasi segmen
                  </h3>
                  <p className="text-[14px] text-[#6B5A52] mt-0.5">
                    Perbandingan pendapatan dan jumlah sesi per periode waktu.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                  <div
                    role="tablist"
                    aria-label="Mode periode grafik"
                    className="flex items-center gap-5 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-black/10"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={chartTimeMode === "monthly"}
                      onClick={(e) => {
                        setChartTimeMode("monthly");
                        scrollTabIntoView(e.currentTarget);
                      }}
                      className={`min-h-[44px] inline-flex items-center text-[14px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                        chartTimeMode === "monthly"
                          ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                          : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                      }`}
                    >
                      Bulanan (Jan–Des)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={chartTimeMode === "daily"}
                      onClick={(e) => {
                        setChartTimeMode("daily");
                        scrollTabIntoView(e.currentTarget);
                      }}
                      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[14px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                        chartTimeMode === "daily"
                          ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                          : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                      }`}
                    >
                      Harian
                    </button>
                  </div>

                  {chartTimeMode === "monthly" && (
                    <select
                      aria-label="Pilih tahun grafik"
                      value={chartYear}
                      onChange={(e) => setChartYear(Number(e.target.value))}
                      className="input-field sm:!w-auto text-[16px] tabular-nums"
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

              {/* 2 Grafik Utama */}
              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Grafik 1: Fluktuasi Pendapatan */}
                <div className="bg-white border border-black/10 rounded-[12px] p-4 sm:p-5 min-w-0">
                  <div className="mb-4 sm:mb-5">
                    <h4 className="font-medium text-[#4A2A1A] text-[15px] tabular-nums">
                      {chartTimeMode === "monthly"
                        ? `Fluktuasi pendapatan bulanan (${chartYear})`
                        : "Fluktuasi pendapatan harian"}
                    </h4>
                    <p className="text-[13px] text-[#6B5A52] mt-0.5">
                      Total omset transaksi sah per periode
                    </p>
                  </div>

                  <div className="w-full h-[250px] sm:h-80 tabular-nums">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartTimeMode === "monthly" ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                          <CartesianGrid stroke="#ECE9E3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#6B5A52"
                            fontSize={12}
                            interval="preserveStartEnd"
                            minTickGap={16}
                            tickLine={false}
                            axisLine={{ stroke: "#E6DFD8" }}
                          />
                          <YAxis
                            stroke="#6B5A52"
                            fontSize={12}
                            width={82}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatShortRupiah}
                          />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const val = Number(payload[0]?.value ?? 0);
                              return (
                                <div className="bg-white border border-black/15 rounded-[8px] px-3 py-2 text-[12px] text-[#4A2A1A] tabular-nums">
                                  <span className="font-medium">{label}:</span> Rp {val.toLocaleString("id-ID")}
                                </div>
                              );
                            }}
                          />
                          <Bar
                            dataKey="Pendapatan"
                            fill="#C94A83"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                          <CartesianGrid stroke="#ECE9E3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#6B5A52"
                            fontSize={12}
                            interval="preserveStartEnd"
                            minTickGap={16}
                            tickLine={false}
                            axisLine={{ stroke: "#E6DFD8" }}
                          />
                          <YAxis
                            stroke="#6B5A52"
                            fontSize={12}
                            width={82}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatShortRupiah}
                          />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const val = Number(payload[0]?.value ?? 0);
                              return (
                                <div className="bg-white border border-black/15 rounded-[8px] px-3 py-2 text-[12px] text-[#4A2A1A] tabular-nums">
                                  <span className="font-medium">{label}:</span> Rp {val.toLocaleString("id-ID")}
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="linear"
                            dataKey="Pendapatan"
                            stroke="#C94A83"
                            strokeWidth={2}
                            fill="#C94A83"
                            fillOpacity={0.08}
                            dot={{ r: 3.5, fill: "#C94A83", strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: "#C94A83" }}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grafik 2: Komparasi Segmen */}
                <div className="bg-white border border-black/10 rounded-[12px] p-4 sm:p-5 min-w-0">
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6B5A52] mb-2">
                    {(["Bayi", "Anak", "Ibu"] as const).map((seg) => (
                      <span key={seg} className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-[2px] inline-block"
                          style={{ backgroundColor: SEGMENT_COLORS[seg] }}
                        />
                        <span>{seg}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mb-4 sm:mb-5">
                    <h4 className="font-medium text-[#4A2A1A] text-[15px] tabular-nums">
                      {chartTimeMode === "monthly"
                        ? `Komparasi segmen Bayi, Anak, Ibu (${chartYear})`
                        : "Komparasi harian: Bayi, Anak, Ibu"}
                    </h4>
                    <p className="text-[13px] text-[#6B5A52] mt-0.5">
                      Jumlah sesi perawatan berdasarkan klasifikasi peserta
                    </p>
                  </div>

                  <div className="w-full h-[250px] sm:h-80 tabular-nums">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        barCategoryGap="18%"
                        barGap={2}
                        margin={{ top: 18, right: 8, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid stroke="#ECE9E3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke="#6B5A52"
                          fontSize={12}
                          interval="preserveStartEnd"
                          minTickGap={16}
                          tickLine={false}
                          axisLine={{ stroke: "#E6DFD8" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          stroke="#6B5A52"
                          fontSize={12}
                          width={32}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax * 1.2))]}
                        />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid rgba(0,0,0,0.15)",
                            borderRadius: "8px",
                            boxShadow: "none",
                            fontSize: "12px",
                            fontVariantNumeric: "tabular-nums",
                          }}
                          formatter={(val: any, name: any) => [`${val} sesi`, `Segmen ${name}`]}
                        />
                        <Bar dataKey="Bayi" fill={SEGMENT_COLORS.Bayi} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                          <LabelList
                            dataKey="Bayi"
                            position="top"
                            formatter={(v: any) => (Number(v) > 0 ? v : "")}
                            style={{ fill: "#4A2A1A", fontSize: 12, fontWeight: 500 }}
                          />
                        </Bar>
                        <Bar dataKey="Anak" fill={SEGMENT_COLORS.Anak} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                          <LabelList
                            dataKey="Anak"
                            position="top"
                            formatter={(v: any) => (Number(v) > 0 ? v : "")}
                            style={{ fill: "#4A2A1A", fontSize: 12, fontWeight: 500 }}
                          />
                        </Bar>
                        <Bar dataKey="Ibu" fill={SEGMENT_COLORS.Ibu} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                          <LabelList
                            dataKey="Ibu"
                            position="top"
                            formatter={(v: any) => (Number(v) > 0 ? v : "")}
                            style={{ fill: "#4A2A1A", fontSize: 12, fontWeight: 500 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Peringkat & Rekapitulasi Layanan Paling Laris */}
              <div className="bg-white border border-black/10 rounded-[12px] p-4 sm:p-5 flex flex-col gap-5 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/10 pb-4">
                  <div className="min-w-0">
                    <h3 className="font-medium text-[#4A2A1A] text-[16px]">
                      Layanan paling laris dan rekapitulasi penjualan
                    </h3>
                    <p className="text-[14px] text-[#6B5A52] tabular-nums mt-0.5">
                      Urutan layanan berdasarkan jumlah sesi terjual dan kontribusi omset dari {services.length} layanan.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                    <div
                      role="tablist"
                      aria-label="Urutan peringkat layanan"
                      className="flex items-center gap-5 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-black/10"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={topServicesSort === "most"}
                        onClick={(e) => {
                          setTopServicesSort("most");
                          scrollTabIntoView(e.currentTarget);
                        }}
                        className={`min-h-[44px] inline-flex items-center text-[14px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                          topServicesSort === "most"
                            ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                            : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                        }`}
                      >
                        Paling laris
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={topServicesSort === "least"}
                        onClick={(e) => {
                          setTopServicesSort("least");
                          scrollTabIntoView(e.currentTarget);
                        }}
                        className={`min-h-[44px] inline-flex items-center text-[14px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset rounded-t-[4px] ${
                          topServicesSort === "least"
                            ? "border-[#D4568F] text-[#4A2A1A] font-medium"
                            : "border-transparent text-[#6B5A52] hover:text-[#4A2A1A] font-normal"
                        }`}
                      >
                        Paling jarang
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAllTopServices(!showAllTopServices)}
                      className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-[8px] border border-[#C94A83] text-[14px] font-medium text-[#C94A83] hover:bg-[#B73F73] hover:text-white transition-colors duration-150 cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                    >
                      {showAllTopServices
                        ? topServicesSort === "most"
                          ? "Tampilkan yang terjual saja"
                          : "Tampilkan 10 terbawah"
                        : `Tampilkan semua (${rankedServicesData.length})`}
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-6 items-start">
                  {/* Grafik batang horizontal: disembunyikan < 1024px, diganti daftar kartu peringkat di HP */}
                  <div className="hidden lg:block lg:col-span-5 bg-[#FAF6F2] rounded-[12px] p-4 border border-black/10">
                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6B5A52] mb-2">
                      {(["Bayi", "Anak", "Ibu"] as const).map((seg) => (
                        <span key={seg} className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="w-2.5 h-2.5 rounded-[2px] inline-block"
                            style={{ backgroundColor: SEGMENT_COLORS[seg] }}
                          />
                          <span>{seg}</span>
                        </span>
                      ))}
                    </div>

                    <p className="text-[13px] font-medium text-[#4A2A1A] mb-3">
                      8 layanan {topServicesSort === "most" ? "teratas" : "terbawah"}
                    </p>

                    <div className="w-full h-[340px] tabular-nums">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={horizontalChartData}
                          layout="vertical"
                          margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid stroke="#ECE9E3" horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            stroke="#6B5A52"
                            fontSize={12}
                            tickLine={false}
                            axisLine={{ stroke: "#E6DFD8" }}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={renderWrappedYAxisTick}
                            tickLine={false}
                            axisLine={false}
                            width={165}
                            interval={0}
                          />
                          <ChartTooltip
                            contentStyle={{
                              backgroundColor: "#FFFFFF",
                              border: "1px solid rgba(0,0,0,0.15)",
                              borderRadius: "8px",
                              boxShadow: "none",
                              fontSize: "12px",
                              fontVariantNumeric: "tabular-nums",
                            }}
                            formatter={(val: any, _name: any, props: any) => [
                              `${val} sesi (Rp ${Number(props?.payload?.revenue ?? 0).toLocaleString("id-ID")})`,
                              props?.payload?.name ?? "Jumlah sesi",
                            ]}
                          />
                          <Bar dataKey="Jumlah Sesi" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
                            {horizontalChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={SEGMENT_COLORS[entry.classification]}
                              />
                            ))}
                            <LabelList
                              dataKey="Jumlah Sesi"
                              position="right"
                              style={{ fill: "#4A2A1A", fontSize: 12, fontWeight: 500 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-7 min-w-0">
                    {displayedRankedServices.length === 0 ? (
                      <div className="border border-black/10 rounded-[12px] text-center py-12 px-6">
                        <p className="text-[14px] text-[#6B5A52]">
                          Belum ada layanan dengan transaksi terjual pada periode ini.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Ranked Service Cards (< 768px) */}
                        <div className="md:hidden flex flex-col gap-2.5">
                          {displayedRankedServices.map((item) => (
                            <article
                              key={item.name}
                              className="border border-black/10 rounded-[12px] p-3.5 bg-[#FAF6F2]/40 flex flex-col gap-2.5 min-w-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex items-baseline gap-2">
                                  <span className="text-[13px] font-medium text-[#6B5A52] tabular-nums shrink-0">
                                    #{item.rank}
                                  </span>
                                  <h4 className="text-[15px] font-medium text-[#4A2A1A] break-words">
                                    {item.name}
                                  </h4>
                                </div>
                                <div className="shrink-0">{getClassificationBadge(item.classification)}</div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/10 text-[13px] tabular-nums">
                                <div className="min-w-0">
                                  <span className="block text-[12px] text-[#6B5A52]">Harga</span>
                                  <span className="text-[#4A2A1A]">
                                    Rp {item.unitPrice.toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <div className="min-w-0 text-center">
                                  <span className="block text-[12px] text-[#6B5A52]">Terjual</span>
                                  <span className="font-medium text-[#4A2A1A]">{item.count} sesi</span>
                                </div>
                                <div className="min-w-0 text-right">
                                  <span className="block text-[12px] text-[#6B5A52]">Omset</span>
                                  <span className="font-medium text-[#4A2A1A]">
                                    Rp {item.revenue.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>

                        {/* Desktop Ranked Service Table (>= 768px) */}
                        <div className="hidden md:block overflow-x-auto border border-black/10 rounded-[12px]">
                          <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                              <tr className="bg-[#FAF6F2] border-b border-black/10">
                                <th className="py-2.5 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                                  No
                                </th>
                                <th className="py-2.5 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                                  Nama layanan
                                </th>
                                <th className="py-2.5 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                                  Klasifikasi
                                </th>
                                <th className="py-2.5 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                                  Harga satuan
                                </th>
                                <th className="py-2.5 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                                  Terjual
                                </th>
                                <th className="py-2.5 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                                  Total omset
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/10">
                              {displayedRankedServices.map((item) => (
                                <tr key={item.name} className="bg-white hover:bg-[#FAF6F2]/60 transition-colors duration-150">
                                  <td className="py-2.5 px-3 text-[#6B5A52] tabular-nums">
                                    {item.rank}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-[#4A2A1A]">
                                    {item.name}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {getClassificationBadge(item.classification)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-[#6B5A52] tabular-nums whitespace-nowrap">
                                    Rp {item.unitPrice.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-[#4A2A1A] tabular-nums whitespace-nowrap">
                                    {item.count} sesi
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-[#4A2A1A] tabular-nums whitespace-nowrap">
                                    Rp {item.revenue.toLocaleString("id-ID")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabel Detail Laporan Transaksi & Keuangan */}
              <div className="bg-white border border-black/10 rounded-[12px] overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-[#4A2A1A] text-[16px]">
                      Tabel detail laporan transaksi dan keuangan
                    </h3>
                    <p className="text-[14px] text-[#6B5A52] mt-0.5 break-words">
                      Rincian transaksi sesuai filter aktif. Hanya reservasi berstatus Dikonfirmasi dan Selesai yang dihitung ke dalam pendapatan sah.
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-[13px] text-[#6B5A52]">
                      Total pendapatan sah
                    </p>
                    <p className="text-[20px] font-medium text-[#4A2A1A] tabular-nums mt-0.5">
                      Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {reportFilteredReservations.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <p className="text-[#4A2A1A] font-medium text-[16px]">
                      Tidak ada data transaksi pada filter ini
                    </p>
                    <p className="text-[#6B5A52] text-[14px] mt-1">
                      Sesuaikan rentang tanggal atau pilih klasifikasi segmen lainnya.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Transaction Cards (< 768px) */}
                    <div className="md:hidden p-4 flex flex-col gap-3">
                      {reportFilteredReservations.map((r, idx) => {
                        const cls = getReservationClassification(r);
                        const paid = isPaidReservation(r);
                        return (
                          <article
                            key={r.id}
                            className={`border border-black/10 rounded-[12px] p-4 flex flex-col gap-2.5 min-w-0 ${
                              !paid ? "bg-[#FAF6F2]/50" : "bg-white"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[12px] text-[#6B5A52] tabular-nums">#{idx + 1}</span>
                                <span className="booking-code text-[13px] font-medium text-[#4A2A1A]">
                                  {r.booking_code}
                                </span>
                              </div>
                              {getStatusBadge(r.status)}
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-[14px]">
                              <div className="min-w-0">
                                <span className="block text-[12px] text-[#6B5A52]">Pelanggan</span>
                                <p className={`font-medium break-words ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                  {r.user?.name ?? "Pelanggan"}
                                </p>
                                {r.baby_name && (
                                  <p className="text-[13px] text-[#6B5A52] tabular-nums">
                                    {r.baby_name} ({r.baby_age} bln)
                                  </p>
                                )}
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="block text-[12px] text-[#6B5A52]">Layanan</span>
                                  <p className={`font-medium break-words ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                    {r.service?.name ?? "-"}
                                  </p>
                                </div>
                                <div className="shrink-0 pt-3">{getClassificationBadge(cls)}</div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="min-w-0">
                                  <span className="block text-[12px] text-[#6B5A52]">Tanggal dan jam</span>
                                  <p className={`tabular-nums ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                    {new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-[12px] text-[#6B5A52] tabular-nums">
                                    {(r.start_time ?? "").slice(0, 5)}–{(r.end_time ?? "").slice(0, 5)} WIB
                                  </p>
                                </div>
                                <div className="min-w-0 text-right">
                                  <span className="block text-[12px] text-[#6B5A52]">Terapis</span>
                                  <p className={paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}>
                                    {r.therapist?.name ?? "Otomatis"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-black/10">
                                <span className="text-[12px] text-[#6B5A52]">Nominal</span>
                                {paid ? (
                                  <span className="font-medium text-[#4A2A1A] tabular-nums">
                                    Rp {Number(r.total_price).toLocaleString("id-ID")}
                                  </span>
                                ) : (
                                  <div className="text-right tabular-nums">
                                    <span className="text-[#6B5A52] line-through block">
                                      Rp {Number(r.total_price).toLocaleString("id-ID")}
                                    </span>
                                    <span className="text-[12px] text-[#6B5A52]">Tidak masuk omset</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}

                      <div className="pt-3 mt-1 border-t-2 border-[#4A2A1A] flex items-baseline justify-between gap-3 tabular-nums">
                        <span className="text-[13px] font-medium text-[#4A2A1A]">
                          Total sah ({filteredPaidReservations.length}/{reportFilteredReservations.length})
                        </span>
                        <span className="text-[17px] font-medium text-[#4A2A1A]">
                          Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* Desktop Transaction Table (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto max-w-full">
                      <table className="w-full table-auto text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-[#FAF6F2] border-b border-black/10">
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-center whitespace-nowrap">
                              No
                            </th>
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                              ID dan pelanggan
                            </th>
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                              Tanggal dan jam
                            </th>
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52]">
                              Layanan
                            </th>
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                              Klasifikasi
                            </th>
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] whitespace-nowrap">
                              Terapis dan status
                            </th>
                            <th className="py-3 px-3 font-medium text-[12px] sm:text-[13px] text-[#6B5A52] text-right whitespace-nowrap">
                              Nominal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/10">
                          {reportFilteredReservations.map((r, idx) => {
                            const cls = getReservationClassification(r);
                            const paid = isPaidReservation(r);
                            return (
                              <tr
                                key={r.id}
                                className={`transition-colors duration-150 ${
                                  !paid
                                    ? "bg-[#FAF6F2]/40 hover:bg-[#FAF6F2]/70"
                                    : "bg-white hover:bg-[#FAF6F2]/60"
                                }`}
                              >
                                <td className="py-3 px-3 text-center text-[#6B5A52] tabular-nums align-top">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3 align-top max-w-[230px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="booking-code text-[12px] text-[#6B5A52]">
                                      #{r.user?.id ?? "-"}
                                    </span>
                                    <span className={`font-medium break-words ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                      {r.user?.name ?? "Pelanggan"}
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-[#6B5A52] mt-0.5 tabular-nums">
                                    <span className="booking-code text-[#4A2A1A]">{r.booking_code}</span>
                                    {r.baby_name ? ` • ${r.baby_name} (${r.baby_age} bln)` : ""}
                                  </p>
                                </td>
                                <td className="py-3 px-3 align-top whitespace-nowrap tabular-nums">
                                  <p className={`font-medium ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                    {new Date(getReservationDateStr(r)).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-[12px] text-[#6B5A52] mt-0.5">
                                    {(r.start_time ?? "").slice(0, 5)}–{(r.end_time ?? "").slice(0, 5)} WIB
                                  </p>
                                </td>
                                <td className={`py-3 px-3 align-top font-medium max-w-[200px] break-words ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                  {r.service?.name ?? "-"}
                                </td>
                                <td className="py-3 px-3 align-top whitespace-nowrap">
                                  {getClassificationBadge(cls)}
                                </td>
                                <td className="py-3 px-3 align-top whitespace-nowrap">
                                  <p className={`font-medium mb-1 ${paid ? "text-[#4A2A1A]" : "text-[#6B5A52]"}`}>
                                    {r.therapist?.name ?? "Otomatis"}
                                  </p>
                                  {getStatusBadge(r.status)}
                                </td>
                                <td className="py-3 px-3 align-top text-right whitespace-nowrap tabular-nums">
                                  {paid ? (
                                    <span className="font-medium text-[#4A2A1A]">
                                      Rp {Number(r.total_price).toLocaleString("id-ID")}
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[#6B5A52] line-through">
                                        Rp {Number(r.total_price).toLocaleString("id-ID")}
                                      </span>
                                      <span className="text-[12px] text-[#6B5A52]">
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
                          <tr className="bg-white border-t-2 border-[#4A2A1A]">
                            <td
                              colSpan={6}
                              className="py-3.5 px-3 text-right font-medium text-[#4A2A1A] text-[13px] tabular-nums"
                            >
                              Total pendapatan sah ({filteredPaidReservations.length} dari {reportFilteredReservations.length} transaksi)
                            </td>
                            <td className="py-3.5 px-3 text-right font-medium text-[#4A2A1A] text-[16px] tabular-nums whitespace-nowrap">
                              Rp {filteredTotalRevenue.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
        {deleteTarget && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-admin-delete-title"
            aria-describedby="modal-admin-delete-desc"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => !isDeletingTarget && setDeleteTarget(null)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-[calc(100vw-32px)] sm:max-w-sm max-h-[90dvh] p-6 relative z-10 flex flex-col gap-4 overflow-y-auto">
              <h3 id="modal-admin-delete-title" className="text-[18px] leading-[24px] font-medium text-[#4A2A1A]">
                {deleteTarget.type === "service" ? "Hapus layanan?" : "Hapus terapis?"}
              </h3>
              <p id="modal-admin-delete-desc" className="text-[15px] leading-[22px] text-[#6B5A52]">
                {deleteTarget.type === "service" ? "Layanan" : "Staf terapis"}{" "}
                <span className="font-medium text-[#4A2A1A]">{deleteTarget.name}</span> akan dihapus dari daftar.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingTarget}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-[8px] border border-black/20 text-[15px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingTarget}
                  onClick={handleConfirmDeleteTarget}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[8px] bg-[#9B3B3B] hover:bg-[#822F2F] text-white text-[15px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B3B3B] focus-visible:ring-offset-2"
                >
                  {isDeletingTarget && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  {isDeletingTarget ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Proof Verification Modal ────────────────────────────────────────── */}
        {selectedProof && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Verifikasi pembayaran QRIS"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setSelectedProof(null)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-[calc(100vw-32px)] sm:max-w-lg max-h-[90dvh] relative z-10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/10 shrink-0">
                <h3 className="text-[18px] font-semibold text-[#4A2A1A]">Verifikasi pembayaran QRIS</h3>
                <button
                  type="button"
                  onClick={() => setSelectedProof(null)}
                  aria-label="Tutup modal verifikasi"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer -mr-2"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#FAF6F2] p-4 rounded-[8px] border border-black/10 text-[14px]">
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#6B5A52]">Kode booking</p>
                    <p className="booking-code font-semibold text-[#4A2A1A] mt-0.5">
                      {selectedProof.booking_code}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#6B5A52]">Total pembayaran</p>
                    <p className="font-semibold text-[#C94A83] tabular-nums mt-0.5">
                      Rp {Number(selectedProof.total_price).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#6B5A52]">Pelanggan</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <p className="font-semibold text-[#4A2A1A] break-words">{selectedProof.user?.name}</p>
                      {selectedProof.user?.phone_number && (
                        <a
                          href={getWaLinkFromPhone(
                            selectedProof.user.phone_number,
                            `Halo ${selectedProof.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa terkait konfirmasi bukti pembayaran reservasi (${selectedProof.booking_code}).`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[13px] text-[#C94A83] underline underline-offset-4"
                        >
                          <MessageCircle size={13} aria-hidden="true" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    {selectedProof.user?.phone_number && (
                      <p className="text-[13px] text-[#6B5A52] tabular-nums mt-0.5">
                        {selectedProof.user.phone_number}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#6B5A52]">Layanan</p>
                    <p className="font-medium text-[#4A2A1A] break-words mt-0.5">{selectedProof.service?.name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#6B5A52]">Data anak</p>
                    <p className="font-medium text-[#4A2A1A] tabular-nums mt-0.5">
                      {selectedProof.baby_name || "-"} ({selectedProof.baby_age} bln)
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#6B5A52]">Catatan</p>
                    <p className="text-[#6B5A52] text-[13px] break-words mt-0.5">
                      {selectedProof.notes ?? "Tidak ada catatan."}
                    </p>
                  </div>
                  {selectedProof.delivery_address && (
                    <div className="sm:col-span-2 min-w-0">
                      <p className="text-[12px] text-[#6B5A52]">Alamat kunjungan (Home Care)</p>
                      <div className="text-[13px] text-[#4A2A1A] bg-white p-2.5 rounded-[8px] border border-black/10 mt-1 space-y-1">
                        <p className="break-words">
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
                              className="inline-flex items-center min-h-[36px] font-semibold text-[#C94A83] underline underline-offset-4"
                            >
                              Buka rute Google Maps
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
                  className={`w-full aspect-video bg-[#FAF6F2] rounded-[8px] overflow-hidden border border-black/10 relative flex items-center justify-center ${
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
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 text-white font-medium text-[13px]">
                        <ZoomIn size={16} aria-hidden="true" />
                        <span>Perbesar gambar</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[#6B5A52] flex flex-col items-center gap-2 p-4 text-center">
                      <FileImage size={32} aria-hidden="true" />
                      <p className="text-[14px] font-medium text-[#4A2A1A]">Gambar bukti transfer tidak dapat dimuat</p>
                      <p className="text-[13px] text-[#6B5A52]">
                        Berkas bukti pembayaran pada penyimpanan tidak ditemukan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-end px-5 sm:px-6 py-4 border-t border-black/10 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => handleVerify(selectedProof.id, "cancelled")}
                  className="btn-secondary flex-1 sm:flex-none"
                >
                  Tolak pembayaran
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify(selectedProof.id, "confirmed")}
                  className="btn-primary flex-1 sm:flex-none"
                >
                  Konfirmasi pembayaran
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Image Lightbox Fullscreen Modal ────────────────────────────────────── */}
        {zoomedProofImage && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau bukti transfer"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85"
            onClick={() => setZoomedProofImage(null)}
          >
            <div
              className="relative max-w-[calc(100vw-32px)] sm:max-w-4xl max-h-[90dvh] w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-3 text-white">
                <span className="text-[13px] font-medium px-3 py-1.5 rounded-[8px] bg-black/50 border border-white/20 tabular-nums">
                  Perbesaran: {Math.round(zoomScale * 100)}%
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-white cursor-pointer"
                    title="Perkecil"
                    aria-label="Perkecil gambar"
                  >
                    <ZoomOut size={16} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="min-h-[44px] px-3 text-[13px] font-medium rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-white cursor-pointer tabular-nums"
                    title="Ukuran 100%"
                  >
                    100%
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-white cursor-pointer"
                    title="Perbesar"
                    aria-label="Perbesar gambar"
                  >
                    <ZoomIn size={16} aria-hidden="true" />
                  </button>

                  <a
                    href={zoomedProofImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] bg-black/50 hover:bg-black/70 border border-white/20 text-white cursor-pointer"
                    title="Buka di tab baru"
                    aria-label="Buka gambar di tab baru"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setZoomedProofImage(null)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] bg-black/70 hover:bg-black border border-white/30 text-white cursor-pointer"
                    title="Tutup"
                    aria-label="Tutup pratinjau"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="w-full max-h-[75dvh] overflow-auto rounded-[8px] bg-black/60 border border-white/15 p-2 flex items-center justify-center">
                <img
                  src={zoomedProofImage}
                  alt="Bukti Transfer Diperbesar"
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center" }}
                  className="max-h-[70dvh] object-contain select-none rounded-[8px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Create / Edit Service Modal ───────────────────────────────────── */}
        {serviceModal.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={serviceModal.mode === "create" ? "Tambah layanan baru" : "Ubah layanan"}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
              className="absolute inset-0 bg-black/50"
            />
            <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-[calc(100vw-32px)] sm:max-w-md max-h-[90dvh] relative z-10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/10 shrink-0">
                <h3 className="text-[18px] font-semibold text-[#4A2A1A]">
                  {serviceModal.mode === "create" ? "Tambah layanan baru" : "Ubah layanan"}
                </h3>
                <button
                  type="button"
                  onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
                  aria-label="Tutup modal layanan"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer -mr-2"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
                  <div>
                    <label htmlFor="service-name-input" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                      Nama layanan
                    </label>
                    <input
                      id="service-name-input"
                      type="text"
                      placeholder="Contoh: Baby Massage"
                      className="input-field text-[16px]"
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
                    <label htmlFor="service-desc-input" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                      Deskripsi layanan
                    </label>
                    <textarea
                      id="service-desc-input"
                      placeholder="Rincian perawatan dan kelompok usia..."
                      className="input-field h-24 resize-none py-2.5 text-[16px]"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="service-duration-input" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                        Durasi (menit)
                      </label>
                      <input
                        id="service-duration-input"
                        type="number"
                        placeholder="45"
                        className="input-field tabular-nums text-[16px]"
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
                      <label htmlFor="service-price-input" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                        Harga (Rp)
                      </label>
                      <input
                        id="service-price-input"
                        type="number"
                        placeholder="50000"
                        className="input-field tabular-nums text-[16px]"
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
                    <label
                      htmlFor="is_active"
                      className="min-h-[44px] flex items-center gap-3 text-[14px] font-medium text-[#4A2A1A] select-none cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        id="is_active"
                        className="w-5 h-5 rounded-[4px] border-black/20 accent-[#C94A83] shrink-0"
                        checked={serviceModal.data?.is_active ?? true}
                        onChange={(e) =>
                          setServiceModal((prev) => ({
                            ...prev,
                            data: { ...prev.data, is_active: e.target.checked },
                          }))
                        }
                      />
                      <span>Layanan aktif (ditampilkan pada menu pemesanan)</span>
                    </label>
                  )}
                </div>

                <div className="flex gap-3 justify-end px-5 sm:px-6 py-4 border-t border-black/10 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setServiceModal({ isOpen: false, mode: "create", data: null })}
                    className="btn-secondary flex-1 sm:flex-none"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary flex-1 sm:flex-none">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Create / Edit Therapist Modal ────────────────────────────────── */}
        {therapistModal.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={therapistModal.mode === "create" ? "Tambah staf terapis" : "Ubah staf terapis"}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
              className="absolute inset-0 bg-black/50"
            />
            <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-[calc(100vw-32px)] sm:max-w-md max-h-[90dvh] relative z-10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/10 shrink-0">
                <h3 className="text-[18px] font-semibold text-[#4A2A1A]">
                  {therapistModal.mode === "create" ? "Tambah staf terapis" : "Ubah staf terapis"}
                </h3>
                <button
                  type="button"
                  onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
                  aria-label="Tutup modal terapis"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer -mr-2"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSaveTherapist} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
                  <div>
                    <label htmlFor="therapist-name-input" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                      Nama lengkap terapis
                    </label>
                    <input
                      id="therapist-name-input"
                      type="text"
                      placeholder="Contoh: Bidan Susi"
                      className="input-field text-[16px]"
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

                  <label
                    htmlFor="therapist_is_active"
                    className="min-h-[44px] flex items-center gap-3 text-[14px] font-medium text-[#4A2A1A] select-none cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      id="therapist_is_active"
                      className="w-5 h-5 rounded-[4px] border-black/20 accent-[#C94A83] shrink-0"
                      checked={therapistModal.data?.is_active ?? true}
                      onChange={(e) =>
                        setTherapistModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, is_active: e.target.checked },
                        }))
                      }
                    />
                    <span>Staf terapis aktif (menerima penjadwalan sesi)</span>
                  </label>
                </div>

                <div className="flex gap-3 justify-end px-5 sm:px-6 py-4 border-t border-black/10 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setTherapistModal({ isOpen: false, mode: "create", data: null })}
                    className="btn-secondary flex-1 sm:flex-none"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary flex-1 sm:flex-none">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Reschedule Reservation Modal ────────────────────────────────────── */}
        {rescheduleModal.isOpen && rescheduleModal.reservation && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reschedule jadwal sesi"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
              className="absolute inset-0 bg-black/50"
            />
            <div className="bg-white border border-black/10 rounded-[12px] w-full max-w-[calc(100vw-32px)] sm:max-w-md max-h-[90dvh] relative z-10 flex flex-col overflow-hidden">
              <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-black/10 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold text-[#4A2A1A]">Reschedule jadwal sesi</h3>
                  <p className="text-[13px] text-[#6B5A52] mt-0.5">
                    Perbarui tanggal dan jam reservasi sesuai konfirmasi pelanggan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
                  aria-label="Tutup modal reschedule"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#6B5A52] hover:text-[#4A2A1A] rounded-[8px] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer shrink-0 -mr-2 -mt-1"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleReschedule} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
                  <div className="bg-[#FAF6F2] p-3.5 rounded-[8px] border border-black/10 text-[13px] flex flex-col gap-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#6B5A52]">Kode booking</span>
                      <span className="booking-code font-semibold text-[#4A2A1A]">
                        {rescheduleModal.reservation.booking_code}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[#6B5A52]">Pelanggan</span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="text-[#4A2A1A] font-semibold">{rescheduleModal.reservation.user?.name}</span>
                        {rescheduleModal.reservation.user?.phone_number && (
                          <a
                            href={getWaLinkFromPhone(
                              rescheduleModal.reservation.user.phone_number,
                              `Halo ${rescheduleModal.reservation.user.name || "Bunda"}, kami dari Admin Mayesha Baby Spa ingin mengonfirmasi jadwal reservasi (${rescheduleModal.reservation.booking_code}).`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#C94A83] underline underline-offset-4"
                          >
                            <MessageCircle size={12} aria-hidden="true" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#6B5A52] shrink-0">Layanan</span>
                      <span className="text-[#4A2A1A] font-medium text-right break-words">
                        {rescheduleModal.reservation.service?.name}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 tabular-nums">
                      <span className="text-[#6B5A52] shrink-0">Jadwal sebelumnya</span>
                      <span className="text-[#4A2A1A] text-right">
                        {rescheduleModal.reservation.reservation_date} • {rescheduleModal.reservation.start_time.substring(0, 5)} WIB
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-reschedule-date" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                      Tanggal baru
                    </label>
                    <input
                      id="admin-reschedule-date"
                      type="date"
                      className="input-field tabular-nums text-[16px]"
                      value={rescheduleModal.date}
                      onChange={(e) => setRescheduleModal({ ...rescheduleModal, date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-reschedule-time" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                      Jam mulai baru
                    </label>
                    <select
                      id="admin-reschedule-time"
                      className="input-field tabular-nums text-[16px]"
                      value={rescheduleModal.time}
                      onChange={(e) => setRescheduleModal({ ...rescheduleModal, time: e.target.value })}
                      required
                    >
                      <option value="">-- Pilih jam baru --</option>
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
                    <label htmlFor="admin-reschedule-notes" className="block text-[14px] font-medium text-[#4A2A1A] mb-1.5">
                      Catatan reschedule (opsional)
                    </label>
                    <textarea
                      id="admin-reschedule-notes"
                      rows={2}
                      placeholder="Contoh: Penyesuaian jadwal atas permintaan pelanggan melalui WhatsApp"
                      className="input-field resize-none py-2.5 text-[16px]"
                      value={rescheduleModal.notes}
                      onChange={(e) => setRescheduleModal({ ...rescheduleModal, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end px-5 sm:px-6 py-4 border-t border-black/10 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setRescheduleModal({ isOpen: false, reservation: null, date: "", time: "", notes: "" })}
                    className="btn-secondary flex-1 sm:flex-none"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isRescheduling}
                    className="btn-primary flex-1 sm:flex-none"
                  >
                    {isRescheduling && <Loader2 size={15} className="animate-spin" />}
                    {isRescheduling ? "Menyimpan..." : "Simpan jadwal baru"}
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
