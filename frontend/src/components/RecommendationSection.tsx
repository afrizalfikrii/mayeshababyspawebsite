import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Heart, TrendingUp, Clock, ChevronRight, Loader2, Star, Zap } from "lucide-react";
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
    bg: "bg-pink-50 border-pink-100",
    text: "text-pink-600",
    dot: "bg-pink-400",
  },
  baby_kids_treatment: {
    bg: "bg-purple-50 border-purple-100",
    text: "text-purple-600",
    dot: "bg-purple-400",
  },
  mom_treatment: {
    bg: "bg-rose-50 border-rose-100",
    text: "text-rose-600",
    dot: "bg-rose-400",
  },
};

function formatAge(minMonths: number | null, maxMonths: number | null): string {
  if (minMonths === null) return "Semua usia";
  if (maxMonths === null) return "Dewasa";

  const toYearsLabel = (months: number) => {
    if (months < 12) return `${months} bln`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem === 0 ? `${years} thn` : `${years} thn ${rem} bln`;
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      className="glass-card p-4 flex flex-col justify-between group hover:shadow-lg hover:border-pink-200 transition-all duration-300"
    >
      <div>
        {/* Header: kategori badge + match score */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%] ${catStyle.bg} ${catStyle.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${catStyle.dot}`} />
            <span className="truncate">
              {CATEGORY_LABEL[service.category ?? "baby_and_kids"] ?? service.category}
            </span>
          </span>

          {/* Match score badge */}
          {!isColdStart && similarityPct !== null ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-pink-600 bg-pink-100/70 border border-pink-200/80 px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs">
              <Zap size={10} className="fill-pink-500 text-pink-500" />
              {similarityPct}% cocok
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full whitespace-nowrap">
              <TrendingUp size={10} />
              Populer
            </span>
          )}
        </div>

        {/* Nama & Deskripsi */}
        <h4
          title={service.name}
          className="font-bold text-slate-800 text-sm leading-tight group-hover:text-pink-600 transition-colors line-clamp-1"
        >
          {service.name}
        </h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[2.25rem]">
          {service.description}
        </p>

        {/* Match progress bar */}
        {!isColdStart && similarityPct !== null && (
          <div className="mt-2.5 mb-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
              <span>Tingkat kecocokan</span>
              <span className="font-semibold text-pink-600">{similarityPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-pink-50 rounded-full overflow-hidden border border-pink-100/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${similarityPct}%` }}
                transition={{ delay: index * 0.06 + 0.2, duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer info: durasi, usia & harga */}
      <div className="mt-3 pt-3 border-t border-slate-100/80 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock size={11} className="text-pink-400" />
            {service.duration_minutes} menit
          </span>
          <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-[10px] text-slate-600">
            {formatAge(service.age_min_months, service.age_max_months)}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-0.5">
          <span className="text-[11px] font-medium text-slate-400">Harga</span>
          <span className="text-sm font-extrabold text-slate-900 group-hover:text-pink-600 transition-colors">
            Rp {service.price.toLocaleString("id-ID")}
          </span>
        </div>

        {/* CTA Button */}
        <Link
          to={`/reservasi?service_id=${service.id}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-500 border border-pink-100 hover:border-pink-500 text-pink-600 hover:text-white text-xs font-bold transition-all duration-200 group/btn shadow-xs mt-1"
        >
          Pesan Sekarang
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecommendationSection() {
  const [recommendations, setRecommendations] = useState<Service[]>([]);
  const [isColdStart, setIsColdStart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getRecommendations(5)
      .then((res) => {
        if (cancelled) return;
        setRecommendations(res.data);
        setIsColdStart(res.is_cold_start);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-panel p-6 mb-6"
    >
      {/* Section header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-md shadow-pink-200">
              <Heart size={16} className="text-white fill-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {isColdStart ? "Layanan Terpopuler" : "Rekomendasi untuk Bunda"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 pl-10 leading-relaxed max-w-md">
            {isColdStart
              ? "Temukan layanan favorit yang paling banyak dipesan oleh Bunda lainnya."
              : "Dipilihkan khusus berdasarkan riwayat perawatan & favorit si kecil."}
          </p>
        </div>

        {/* Top badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-pink-600 bg-pink-50/80 border border-pink-100 px-3 py-1.5 rounded-full whitespace-nowrap self-start shadow-xs">
          <Star size={11} className="fill-pink-400 text-pink-400" />
          {isColdStart ? "Favorit Bunda" : "Spesial Untuk Bunda"}
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
            <Loader2 size={28} className="animate-spin text-pink-400" />
            <p className="text-sm text-slate-400 font-medium">
              Menyiapkan rekomendasi perawatan terbaik untuk Bunda...
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
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
