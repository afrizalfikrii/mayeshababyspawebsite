import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { getRecommendations } from "@/services/service.service";
import { formatAgeRange } from "@/lib/formatAgeRange";
import type { Service } from "@/types/api.types";

function getServiceSegment(service: Service): "Bayi" | "Anak" | "Ibu" {
  if (service.category === "mom_treatment" || (service.age_min_months !== null && service.age_min_months >= 216)) {
    return "Ibu";
  }
  if (
    (service.age_min_months !== null && service.age_min_months >= 13) ||
    /kids|anak|1-3th|3-4th/i.test(service.name)
  ) {
    return "Anak";
  }
  return "Bayi";
}

function RecommendationCard({
  service,
  isColdStart,
}: {
  service: Service;
  isColdStart: boolean;
}) {
  const segment = getServiceSegment(service);
  const ageLabel = formatAgeRange(service);
  const similarityPct =
    service.similarity_score !== null && service.similarity_score !== undefined
      ? Math.round(service.similarity_score * 100)
      : null;

  return (
    <article className="relative bg-white border border-black/10 rounded-[12px] p-5 md:p-6 flex flex-col justify-between h-full min-w-0 hover:border-[#D4568F] focus-within:ring-2 focus-within:ring-[#C94A83] focus-within:ring-offset-2 transition-colors duration-150">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 text-[13px] leading-[18px] text-[#6B5A52] tabular-nums mb-2.5">
          <span className="font-medium text-[#6B5A52]">{segment}</span>
          {!isColdStart && similarityPct !== null ? (
            <span className="font-medium text-[#2F6B45] whitespace-nowrap">
              {similarityPct}% sesuai riwayat
            </span>
          ) : (
            <span className="shrink-0">{ageLabel}</span>
          )}
        </div>

        <h3
          title={service.name}
          className="text-[18px] leading-[25px] font-semibold text-[#4A2A1A] break-words"
        >
          {service.name}
        </h3>

        <p className="text-[15px] leading-[23px] text-[#6B5A52] mt-2 line-clamp-2 break-words">
          {service.description}
        </p>

        {!isColdStart && similarityPct !== null && (
          <p className="text-[13px] leading-[18px] text-[#6B5A52] mt-2 tabular-nums">
            {ageLabel}
          </p>
        )}
      </div>

      <div className="pt-4 mt-5 border-t border-black/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[14px] leading-[20px] text-[#6B5A52] tabular-nums shrink-0">
            {service.duration_minutes} menit
          </span>
          <span className="lg:hidden text-[18px] leading-[24px] font-medium text-[#4A2A1A] tabular-nums">
            Rp {Number(service.price ?? 0).toLocaleString("id-ID")}
          </span>
        </div>

        <div className="flex items-center lg:gap-3.5 w-full lg:w-auto">
          <span className="hidden lg:inline text-[17px] leading-[24px] font-medium text-[#4A2A1A] tabular-nums whitespace-nowrap">
            Rp {Number(service.price ?? 0).toLocaleString("id-ID")}
          </span>
          <Link
            to={`/reservasi?service_id=${service.id}`}
            className="relative z-10 w-full sm:w-auto min-h-[44px] lg:min-h-[36px] inline-flex items-center justify-center border border-[#C94A83] text-[#C94A83] text-[15px] lg:text-[14px] font-medium rounded-[8px] px-4 lg:px-3.5 hover:bg-[#B73F73] hover:text-white transition-colors duration-150 after:absolute after:inset-0 after:rounded-[12px] focus:outline-none whitespace-nowrap"
          >
            Reservasi
          </Link>
        </div>
      </div>
    </article>
  );
}

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
        // Soft fail
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && recommendations.length === 0) return null;

  const sectionTitle = !isColdStart
    ? "Rekomendasi sesuai riwayat"
    : coldStartType === "age_based"
      ? "Rekomendasi sesuai usia"
      : "Layanan terpopuler";

  const sectionDesc = !isColdStart
    ? "Dihitung berdasarkan kemiripan kategori, rentang usia, dan riwayat perawatan sebelumnya."
    : coldStartType === "age_based"
      ? "Disaring berdasarkan rentang usia profil anak yang terdaftar."
      : "Daftar layanan yang sering dipilih oleh pelanggan Mayesha Baby Spa.";

  return (
    <section aria-labelledby="rekomendasi-heading">
      <div className="mb-6">
        <h2
          id="rekomendasi-heading"
          className="font-['DM_Sans',sans-serif] text-[22px] leading-[30px] font-medium text-[#4A2A1A]"
        >
          {sectionTitle}
        </h2>
        <p className="text-[15px] leading-[24px] text-[#6B5A52] mt-1">
          {sectionDesc}
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white border border-black/10 rounded-[12px] flex flex-col items-center justify-center py-12 gap-2.5">
          <Loader2 size={22} className="animate-spin text-[#6B5A52]" aria-hidden="true" />
          <p className="text-[14px] text-[#6B5A52]">Memuat rekomendasi layanan...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {recommendations.map((service) => (
            <RecommendationCard
              key={service.id}
              service={service}
              isColdStart={isColdStart}
            />
          ))}
        </div>
      )}
    </section>
  );
}
