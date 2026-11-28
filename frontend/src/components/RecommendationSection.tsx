import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Heart,
  TrendUp as TrendingUp,
  Clock,
  CaretRight as ChevronRight,
  CircleNotch as Loader2,
  Star,
  Lightning as Zap,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendations } from "@/services/service.service";
import type { Service } from "@/types/api.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  baby_and_kids: "Baby & Kids",
  baby_kids_treatment: "Treatment Bayi",
  mom_treatment: "Mom Treatment",
};

const CATEGORY_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  baby_and_kids: {
    bg: "bg-[#F9EBEF] border-[#E8DFD8]",
    text: "text-[#BE346E]",
    dot: "bg-[#BE346E]",
  },
  baby_kids_treatment: {
    bg: "bg-[#F4EFE8] border-[#D7C9BE]",
    text: "text-[#3A2622]",
    dot: "bg-[#6E5D58]",
  },
  mom_treatment: {
    bg: "bg-[#F9EBEF] border-[#E8DFD8]",
    text: "text-[#9F285B]",
    dot: "bg-[#BE346E]",
  },
};

function formatAge(minMonths: number | null, maxMonths: number | null): string {
  if (minMonths === null) return "Semua usia";
  if (maxMonths === null) return "Dewasa";

  const toYearsLabel = (months: number) => {
    if (months < 12) return `${months} Bulan`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem === 0 ? `${years} Tahun` : `${years} Tahun ${rem} Bulan`;
  };

  return `${toYearsLabel(minMonths)} – ${toYearsLabel(maxMonths)}`;
}

// ─── Sub-component: single recommendation card ────────────────────────────────

function RecommendationCard({
  service,
  index,
  isColdStart,
}: {
  service: Service;
  index: number;
  isColdStart: boolean;
}) {
  const catStyle =
    CATEGORY_COLOR[service.category ?? "baby_and_kids"] ?? CATEGORY_COLOR.baby_and_kids;

  const similarityPct =
    service.similarity_score !== null
      ? Math.round(service.similarity_score * 100)
      : null;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      className="glass-card p-5 flex flex-col justify-between"
    >
      <div>
        {/* Header: kategori + match score */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5D58] truncate">
            {CATEGORY_LABEL[service.category ?? "baby_and_kids"] ?? service.category}
          </span>

          {!isColdStart && similarityPct !== null ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F6B45] bg-[#EDF5F0] px-2.5 py-0.5 rounded-full whitespace-nowrap tabular-nums">
              {similarityPct}% cocok
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#BE346E] bg-[#F9EBEF] px-2.5 py-0.5 rounded-full whitespace-nowrap">
              Populer
            </span>
          )}
        </div>

        {/* Nama & Deskripsi */}
        <h4
          title={service.name}
          className="font-editorial font-semibold text-[#3A2622] text-lg leading-snug line-clamp-1"
        >
          {service.name}
        </h4>
        <p className="text-xs text-[#6E5D58] mt-1.5 line-clamp-2 leading-relaxed min-h-[2.25rem]">
          {service.description}
        </p>

        {/* Match progress bar */}
        {!isColdStart && similarityPct !== null && (
          <div className="mt-3 mb-1">
            <div className="flex items-center justify-between text-[11px] text-[#6E5D58] font-medium mb-1">
              <span>Tingkat kecocokan</span>
              <span className="font-semibold text-[#BE346E] tabular-nums">{similarityPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#F4EFE8] rounded-full overflow-hidden">
              <div
                style={{ width: `${similarityPct}%` }}
                className="h-full rounded-full bg-[#BE346E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer info: durasi, usia & harga */}
      <div className="mt-4 pt-3 border-t border-[#E8DFD8] flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-[#6E5D58] tabular-nums">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {service.duration_minutes} menit
          </span>
          <span>{formatAge(service.age_min_months, service.age_max_months)}</span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#6E5D58]">Tarif</span>
          <span className="text-base font-bold text-[#3A2622] tabular-nums">
            Rp {Number(service.price ?? 0).toLocaleString("id-ID")}
          </span>
        </div>

        <Link
          to={`/reservasi?service_id=${service.id}`}
          className="btn-secondary w-full !min-h-[40px] !text-xs mt-1"
        >
          Pesan Sekarang
          <ChevronRight size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecommendationSection() {
  const [recommendations, setRecommendations] = useState<Service[]>([]);
  const [isColdStart, setIsColdStart] = useState(false);
  const [coldStartType, setColdStartType] = useState<"age_based" | "general" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getRecommendations(3)
      .then((res) => {
        if (cancelled) return;
        setRecommendations(res.data);
        setIsColdStart(res.is_cold_start);
        setColdStartType(res.cold_start_type ?? null);
      })
      .catch(() => {
        // Soft fail — section just won't render
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Jangan tampilkan section jika gagal atau tidak ada data
  if (!isLoading && recommendations.length === 0) return null;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-panel p-6 mb-6"
    >
      {/* Section header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#BE346E] flex items-center justify-center shadow-sm">
              <Heart size={16} className="text-white fill-white" />
            </div>
            <h2 className="text-lg font-bold text-[#3A2622] tracking-tight">
              {isColdStart ? "Layanan Terpopuler" : "Rekomendasi untuk Bunda"}
            </h2>
          </div>
          <p className="text-xs text-[#6E5D58] pl-10 leading-relaxed max-w-md">
            {!isColdStart
              ? "Dipilihkan khusus berdasarkan riwayat perawatan & favorit si kecil."
              : coldStartType === "age_based"
                ? "Layanan terpopuler yang sesuai untuk usia si Kecil."
                : "Temukan layanan favorit yang paling banyak dipesan oleh Bunda lainnya."}
          </p>
        </div>

        {/* Top badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#BE346E] bg-[#F9EBEF] border border-[#E8DFD8] px-3 py-1.5 rounded-full whitespace-nowrap self-start shadow-xs">
          <Star size={11} className="fill-[#BE346E] text-[#BE346E]" />
          {!isColdStart
            ? "Spesial Untuk Bunda"
            : coldStartType === "age_based"
              ? "Sesuai Usia Si Kecil"
              : "Favorit Bunda"}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-14 gap-3"
          >
            <Loader2 size={28} className="animate-spin text-[#BE346E]" />
            <p className="text-sm text-[#6E5D58] font-medium">
              Menyiapkan rekomendasi perawatan terbaik untuk Bunda...
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={false}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {recommendations.map((service, i) => (
              <RecommendationCard
                key={service.id}
                service={service}
                index={i}
                isColdStart={isColdStart}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
