import type { Service } from "@/types/api.types";

const formatSingleAge = (months: number): string => {
  if (months === 0) return "0 bulan";
  if (months < 12) return `${months} bulan`;
  if (months % 12 === 0) return `${months / 12} tahun`;
  return `${months} bulan`;
};

/**
 * Memformat rentang usia layanan secara seragam di seluruh situs.
 * Contoh keluaran:
 * - "Usia 0–12 bulan"
 * - "Usia 0 bulan–5 tahun"
 * - "Usia 1–3 tahun"
 * - "Ibu dan dewasa"
 */
export function formatAgeRange(
  service: Pick<Service, "category" | "age_min_months" | "age_max_months">,
  options: { withPrefix?: boolean } = {}
): string {
  const { withPrefix = true } = options;

  if (
    service.category === "mom_treatment" ||
    (service.age_min_months !== null && service.age_min_months >= 216) ||
    (service.age_min_months !== null && service.age_max_months === null)
  ) {
    return "Ibu dan dewasa";
  }

  const min = service.age_min_months;
  const max = service.age_max_months;

  let range: string;
  if (min === null && max === null) {
    range = "0 bulan–5 tahun";
  } else {
    const minVal = min ?? 0;
    if (max === null) {
      range = `${formatSingleAge(minVal)}+`;
    } else if (max <= 12) {
      range = `${minVal}–${max} bulan`;
    } else if (minVal === 0 && max % 12 === 0) {
      range = `0 bulan–${max / 12} tahun`;
    } else if (minVal >= 12 && max % 12 === 0) {
      if (minVal % 12 === 0) {
        range = `${minVal / 12}–${max / 12} tahun`;
      } else if (minVal % 12 === 1) {
        // Rentang DB seperti 13–36 atau 37–60 merepresentasikan 1–3 tahun / 3–5 tahun
        range = `${Math.floor(minVal / 12)}–${max / 12} tahun`;
      } else {
        range = `${formatSingleAge(minVal)}–${max / 12} tahun`;
      }
    } else {
      range = `${formatSingleAge(minVal)}–${formatSingleAge(max)}`;
    }
  }

  return withPrefix ? `Usia ${range}` : range;
}
