import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { Loader2, X as CloseIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getServices } from "@/services/service.service";
import { getPublicReviews } from "@/services/reservation.service";
import type { Service, Review } from "@/types/api.types";

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string; desc: string } | null>(null);

  // Gallery Carousel State
  const [galleryCategory, setGalleryCategory] = useState<"all" | "Aktivitas" | "Fasilitas">("all");
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollGalleryLeft, setCanScrollGalleryLeft] = useState(false);
  const [canScrollGalleryRight, setCanScrollGalleryRight] = useState(true);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Reviews Carousel State
  const reviewsTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollReviewsLeft, setCanScrollReviewsLeft] = useState(false);
  const [canScrollReviewsRight, setCanScrollReviewsRight] = useState(false);

  const getServiceClassification = (s: Service): "Bayi" | "Anak" | "Ibu" => {
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

  const segmentPriority: Record<"Bayi" | "Anak" | "Ibu", number> = {
    Bayi: 1,
    Anak: 2,
    Ibu: 3,
  };

  // Urutkan per segmen: Bayi, Anak, Ibu (mempertahankan urutan asli di dalam segmen)
  const sortedServices = [...services].sort((a, b) => {
    const segA = segmentPriority[getServiceClassification(a)];
    const segB = segmentPriority[getServiceClassification(b)];
    return segA - segB;
  });

  const filteredServices = sortedServices.filter((s) =>
    segmentFilter === "all" ? true : getServiceClassification(s) === segmentFilter
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesData, reviewsData] = await Promise.all([
          getServices(),
          getPublicReviews(),
        ]);
        setServices(servicesData);
        setReviews(reviewsData);
      } catch {
        // Silent fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatAgeRange = (service: Service): string => {
    if (service.category === "mom_treatment" || (service.age_min_months !== null && service.age_min_months >= 216)) {
      return "Ibu / Dewasa";
    }
    if (service.age_min_months === null && service.age_max_months === null) {
      return "0–5 tahun";
    }
    const min = service.age_min_months ?? 0;
    const max = service.age_max_months;
    if (max === null) return `${min}+ bln`;

    const fmt = (m: number) => {
      if (m < 12) return `${m} bln`;
      if (m % 12 === 0) return `${m / 12} thn`;
      return `${m} bln`;
    };

    if (min === 0 && max <= 12) return `0–${max} bln`;
    return `${fmt(min)}–${fmt(max)}`;
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
      : null;

  const lowestPrice =
    services.length > 0
      ? Math.min(
          ...services
            .map((s) => Number(s.price || 0))
            .filter((p) => !isNaN(p) && p > 0)
        )
      : null;

  const galleryItems = [
    {
      id: "act-1",
      category: "Aktivitas" as const,
      title: "Baby Swim",
      desc: "Sesi renang air hangat dengan pelampung leher aman dan pendampingan terapis.",
      img: "/images/activity-swim-purple.png",
    },
    {
      id: "act-2",
      category: "Aktivitas" as const,
      title: "Bidan Tersertifikasi",
      desc: "Setiap sesi ditangani langsung oleh tenaga bidan terlatih dan ramah anak.",
      img: "/images/activity-team.jpg",
    },
    {
      id: "act-3",
      category: "Aktivitas" as const,
      title: "Baby Massage",
      desc: "Stimulasi pijat lembut melancarkan peredaran darah dan kenyamanan tidur bayi.",
      img: "/images/activity-massage.jpg",
    },
    {
      id: "act-4",
      category: "Aktivitas" as const,
      title: "Terapi Pernapasan",
      desc: "Layanan uap nebulizer dan sinar infrared untuk meredakan batuk pilek.",
      img: "/images/activity-therapy.png",
    },
    {
      id: "fac-1",
      category: "Fasilitas" as const,
      title: "Kolam Hidroterapi",
      desc: "Air hangat bersuhu steril dan selalu diganti sebelum sesi baru dimulai.",
      img: "/images/facility-pool.png",
    },
    {
      id: "fac-2",
      category: "Fasilitas" as const,
      title: "Area Baby Gym",
      desc: "Ruang stimulasi motorik dan sensorik dengan matras empuk berstandar medis.",
      img: "/images/facility-gym.jpg",
    },
    {
      id: "fac-3",
      category: "Fasilitas" as const,
      title: "Ruang Perawatan Privat",
      desc: "Kamar perawatan privat yang tenang, higienis, dan nyaman untuk bunda dan buah hati.",
      img: "/images/facility-treatment.png",
    },
    {
      id: "fac-4",
      category: "Fasilitas" as const,
      title: "Matras Perawatan",
      desc: "Alas pijat lembut higienis berbahan aman khusus kulit sensitif bayi baru lahir.",
      img: "/images/facility-massage.png",
    },
  ];

  const filteredGallery = galleryItems.filter((item) =>
    galleryCategory === "all" ? true : item.category === galleryCategory
  );

  const checkGalleryScroll = () => {
    const el = galleryTrackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollGalleryLeft(scrollLeft > 12);
    setCanScrollGalleryRight(scrollLeft < scrollWidth - clientWidth - 12);

    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 20 : 360;
    const idx = Math.min(
      filteredGallery.length - 1,
      Math.max(0, Math.round(scrollLeft / cardStep))
    );
    setActiveGalleryIndex(idx);
  };

  const scrollGallery = (direction: "left" | "right") => {
    const el = galleryTrackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 20 : 360;
    const delta = direction === "left" ? -cardStep : cardStep;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: delta, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  const checkReviewsScroll = () => {
    const el = reviewsTrackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollReviewsLeft(scrollLeft > 12);
    setCanScrollReviewsRight(scrollLeft < scrollWidth - clientWidth - 12);
  };

  const scrollReviews = (direction: "left" | "right") => {
    const el = reviewsTrackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 24 : 360;
    const delta = direction === "left" ? -cardStep : cardStep;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    if (reviews.length > 0) {
      const timer = setTimeout(checkReviewsScroll, 150);
      return () => clearTimeout(timer);
    }
  }, [reviews]);

  useEffect(() => {
    if (galleryTrackRef.current) {
      galleryTrackRef.current.scrollTo({ left: 0, behavior: "smooth" });
      const timer = setTimeout(checkGalleryScroll, 150);
      return () => clearTimeout(timer);
    }
  }, [galleryCategory]);

  useEffect(() => {
    if (!selectedImage) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedImage]);

  return (
    <div className="flex flex-col gap-10 md:gap-16 lg:gap-20 pb-12 md:pb-20">
      {/* Hero Section */}
      <section className="bg-[#FAF6F2] w-full py-10 md:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Left Column (teks lebih dulu di HP) */}
            <div className="flex flex-col items-start min-w-0 font-['DM_Sans',sans-serif]">
              <h1 className="font-['Playfair_Display',Georgia,serif] font-medium text-[#4A2A1A] text-[clamp(32px,8vw,68px)] leading-[1.12] tracking-[-0.01em] [text-wrap:balance] break-words max-w-full">
                Pijat dan spa bayi <br className="hidden sm:inline" />di Karanganyar
              </h1>

              <p className="mt-4 md:mt-5 text-[16px] md:text-[18px] leading-[1.65] text-[#6B5A52] max-w-[30rem] break-words">
                Untuk bayi dan anak 0–5 tahun, juga perawatan untuk ibu. Dikerjakan bidan tersertifikasi di studio Tegalgede atau di rumah Bunda.
              </p>

              {/* Aksi: tombol penuh di HP, tautan di bawahnya */}
              <div className="mt-6 md:mt-8 w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <Link
                  to="/reservasi"
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-[8px] px-5 py-2.5 text-[15px] font-medium text-white bg-[#C94A83] hover:bg-[#B73F73] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  Buat reservasi
                </Link>
                <a
                  href="#layanan"
                  className="min-h-[44px] inline-flex items-center justify-center sm:justify-start text-[15px] font-medium text-[#4A2A1A] underline decoration-[#D4568F] decoration-[1.5px] underline-offset-4 hover:text-[#C94A83] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm"
                >
                  Lihat layanan
                </a>
              </div>

              {/* Info jam & info harga termurah */}
              <div className="mt-5 md:mt-6 flex flex-col gap-2 font-normal">
                <div className="flex items-center gap-2 text-[14px] leading-[20px] text-[#6B5A52]">
                  <Clock size={16} className="text-[#D4568F] shrink-0" aria-hidden="true" />
                  <span>Setiap hari, 08.30–16.30 WIB</span>
                </div>
                {lowestPrice !== null && isFinite(lowestPrice) && (
                  <p className="text-[14px] leading-[20px] text-[#6B5A52] tabular-nums">
                    Layanan mulai Rp {lowestPrice.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column (Foto lebar penuh di HP, maks ~70dvh) */}
            <div className="w-full md:max-w-[400px] lg:max-w-[410px] mx-auto md:mx-0 md:justify-self-end min-w-0">
              <div className="w-full aspect-[4/5] max-h-[70dvh] rounded-[12px] overflow-hidden bg-[#FAF6F2]">
                <img
                  src="/images/activity-massage.jpg"
                  alt="Terapis memijat bayi di studio Mayesha"
                  width={768}
                  height={1020}
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover object-[50%_55%]"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery & Facilities Section (Interactive Carousel) */}
      <section id="galeri" className="px-4 md:px-6 max-w-7xl mx-auto w-full scroll-mt-20 overflow-hidden">
        <div className="border-t border-black/10 pt-10 md:pt-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-6 mb-6 md:mb-8">
            <div className="max-w-xl min-w-0">
              <h2 className="font-['Playfair_Display',Georgia,serif] font-medium text-[#4A2A1A] text-[clamp(26px,6vw,44px)] leading-[1.15] mb-2">
                Aktivitas dan fasilitas studio
              </h2>
              <p className="text-[16px] leading-[1.65] text-[#6B5A52] max-w-[34rem]">
                Dokumentasi ruang perawatan, kolam hidroterapi, dan standar kebersihan peralatan Mayesha.
              </p>
            </div>

            {/* Controls: Segment Text Tabs & Navigation Buttons (panah disembunyikan di HP) */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 min-w-0">
              <div className="flex items-center gap-5 border-b border-black/10 overflow-x-auto overflow-y-hidden no-scrollbar max-w-full">
                {[
                  { id: "all", label: "Semua" },
                  { id: "Aktivitas", label: "Aktivitas" },
                  { id: "Fasilitas", label: "Fasilitas" },
                ].map((tab) => {
                  const isActive = galleryCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGalleryCategory(tab.id as "all" | "Aktivitas" | "Fasilitas")}
                      className={`min-h-[44px] inline-flex items-center text-[15px] transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 ${
                        isActive
                          ? "text-[#4A2A1A] font-medium border-[#D4568F]"
                          : "text-[#6B5A52] font-normal border-transparent hover:text-[#4A2A1A]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollGallery("left")}
                  disabled={!canScrollGalleryLeft}
                  aria-label="Geser ke kiri"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] border border-black/15 bg-white flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollGallery("right")}
                  disabled={!canScrollGalleryRight}
                  aria-label="Geser ke kanan"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] border border-black/15 bg-white flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Slider Track */}
          <div
            ref={galleryTrackRef}
            tabIndex={0}
            aria-label="Galeri foto aktivitas dan fasilitas studio"
            onScroll={checkGalleryScroll}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                scrollGallery("left");
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                scrollGallery("right");
              }
            }}
            className="flex gap-4 md:gap-5 overflow-x-auto overflow-y-hidden scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory no-scrollbar pb-3 pt-1 -mr-4 pr-4 md:-mr-6 md:pr-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] rounded-[12px]"
          >
            {filteredGallery.map((item) => (
              <figure
                key={item.id}
                onClick={() => setSelectedImage({ src: item.img, title: item.title, desc: item.desc })}
                className="w-[80vw] sm:w-[320px] md:w-[350px] lg:w-[360px] shrink-0 snap-start m-0 cursor-pointer group"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-black/10 bg-white">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className="mt-3">
                  <h3 className="text-[17px] leading-[24px] font-medium text-[#4A2A1A]">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-[1.55] text-[#6B5A52] mt-1">
                    {item.desc}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="h-[2px] w-full bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C94A83] transition-all duration-200"
                style={{
                  width: `${Math.min(100, Math.max(12, ((activeGalleryIndex + 1) / Math.max(1, filteredGallery.length)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="layanan" className="px-4 md:px-6 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="border-t border-black/10 pt-10 md:pt-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 md:gap-6 mb-8 md:mb-10">
            <div className="max-w-xl min-w-0">
              <h2 className="font-['Playfair_Display',Georgia,serif] font-medium text-[#4A2A1A] text-[clamp(26px,6vw,38px)] leading-[1.18] mb-2">
                Pilihan perawatan
              </h2>
              <p className="text-[16px] leading-[26px] text-[#6B5A52]">
                Daftar layanan pijat, hidroterapi, dan terapi kesehatan untuk bayi, anak usia 0–5 tahun, serta ibu.
              </p>
            </div>

            {!isLoading && services.length > 0 && (
              <div className="overflow-x-auto overflow-y-hidden no-scrollbar max-w-full">
                <div className="flex items-center gap-6 border-b border-black/10">
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
                        className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[15px] font-medium transition-colors duration-150 border-b-2 whitespace-nowrap cursor-pointer shrink-0 ${
                          isActive
                            ? "text-[#4A2A1A] border-[#D4568F]"
                            : "text-[#6B5A52] border-transparent hover:text-[#4A2A1A]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-black/10 rounded-[12px]">
              <Loader2 size={24} className="animate-spin text-[#6B5A52]" />
              <p className="text-[#6B5A52] text-[14px]">Memuat daftar layanan...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-16 bg-white border border-black/10 rounded-[12px] px-6">
              <p className="text-[#4A2A1A] font-semibold text-[18px]">Layanan belum tersedia</p>
              <p className="text-[#6B5A52] text-[14px] max-w-sm mx-auto mt-1">
                Daftar layanan pada kategori ini sedang diperbarui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredServices.map((service) => {
                const cls = getServiceClassification(service);
                const ageRange = formatAgeRange(service);

                return (
                  <article
                    key={service.id}
                    className="relative bg-white border border-black/10 rounded-[12px] p-5 md:p-6 flex flex-col justify-between h-full min-w-0 hover:border-[#D4568F] focus-within:ring-2 focus-within:ring-[#C94A83] focus-within:ring-offset-2 transition-colors duration-150 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[13px] leading-[18px] text-[#6B5A52] tabular-nums mb-2">
                        <span className="font-medium text-[#6B5A52]">{cls}</span>
                        <span className="shrink-0">Usia {ageRange}</span>
                      </div>

                      <h3 className="text-[18px] leading-[25px] font-semibold text-[#4A2A1A] break-words">
                        {service.name}
                      </h3>

                      <p className="text-[15px] leading-[23px] text-[#6B5A52] mt-2 line-clamp-2 break-words">
                        {service.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-5 border-t border-black/10 flex flex-col gap-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[14px] leading-[20px] text-[#6B5A52] tabular-nums">
                          {service.duration_minutes} menit
                        </span>
                        <span className="text-[18px] leading-[24px] font-medium text-[#4A2A1A] tabular-nums">
                          Rp {Number(service.price).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <Link
                        to={`/reservasi?service_id=${service.id}`}
                        className="relative z-10 w-full min-h-[44px] inline-flex items-center justify-center border border-[#C94A83] text-[#C94A83] text-[15px] font-medium rounded-[8px] px-4 hover:bg-[#C94A83] hover:text-white transition-colors duration-150 after:absolute after:inset-0 after:rounded-[12px] focus:outline-none"
                      >
                        Reservasi
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section (Carousel) */}
      {reviews.length > 0 && (
        <section className="px-4 md:px-6 max-w-7xl mx-auto w-full scroll-mt-20 overflow-hidden">
          <div className="border-t border-black/10 pt-10 md:pt-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-6 md:mb-8">
              <div className="max-w-xl min-w-0">
                <h2 className="font-['Playfair_Display',Georgia,serif] font-medium text-[#4A2A1A] text-[clamp(26px,6vw,38px)] leading-[1.18] mb-2">
                  Ulasan sesi perawatan
                </h2>
                <p className="text-[16px] leading-[26px] text-[#6B5A52]">
                  Penilaian langsung dari pelanggan setelah menyelesaikan sesi di Mayesha Baby Spa.
                </p>
              </div>

              {reviews.length > 1 && (
                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollReviews("left")}
                    disabled={!canScrollReviewsLeft}
                    aria-label="Ulasan sebelumnya"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] border border-black/15 bg-white flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] disabled:opacity-35 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollReviews("right")}
                    disabled={!canScrollReviewsRight}
                    aria-label="Ulasan selanjutnya"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] border border-black/15 bg-white flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] disabled:opacity-35 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <div
              ref={reviewsTrackRef}
              onScroll={checkReviewsScroll}
              className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory no-scrollbar pb-3 pt-1 -mr-4 pr-4 md:-mr-6 md:pr-6"
            >
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="w-[80vw] sm:w-[360px] md:w-[380px] shrink-0 snap-start bg-white border border-black/10 rounded-[12px] p-5 md:p-6 flex flex-col justify-between"
                >
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-medium text-[#C94A83] tabular-nums">
                      Penilaian {r.rating}/5
                    </span>
                    <p className="text-[15px] leading-[24px] text-[#4A2A1A] break-words">
                      &ldquo;{r.comment || "Pelayanan nyaman dan sesuai jadwal."}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-black/10 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#4A2A1A] text-[14px] leading-[20px] truncate">
                        {r.user_name}
                      </p>
                      <p className="text-[13px] leading-[18px] text-[#6B5A52] truncate">
                        {r.service_name}
                      </p>
                    </div>
                    <span className="text-[13px] text-[#6B5A52] tabular-nums shrink-0">
                      {new Date(r.created_at || "").toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Studio Standards Section */}
      <section className="px-4 md:px-6 max-w-7xl mx-auto w-full">
        <div className="bg-white border border-black/10 rounded-[12px] p-5 sm:p-8 md:p-12 grid md:grid-cols-12 gap-6 md:gap-12 items-center">
          <div className="md:col-span-5 min-w-0">
            <div className="aspect-[4/3] w-full rounded-[12px] border border-black/10 overflow-hidden bg-[#FAF6F2]">
              <img
                src="/images/activity-team.jpg"
                alt="Tim bidan terapis Mayesha Baby Spa Karanganyar"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="md:col-span-7 flex flex-col gap-5 md:gap-6 min-w-0">
            <div>
              <h2 className="font-['Playfair_Display',Georgia,serif] font-medium text-[#4A2A1A] text-[clamp(24px,6vw,36px)] leading-[1.2]">
                Pelayanan klinik Mayesha
              </h2>
            </div>

            <div className="divide-y divide-black/10 border-t border-b border-black/10">
              {[
                {
                  title: "Ruang dan peralatan bersih",
                  desc: "Kolam renang, matras, dan perlengkapan perawatan dibersihkan sebelum setiap sesi dimulai.",
                },
                {
                  title: "Ditangani bidan tersertifikasi",
                  desc: "Seluruh prosedur pijat bayi, anak, dan perawatan ibu dilakukan oleh tenaga kebidanan terlatih.",
                },
                {
                  title: "Layanan studio dan kunjungan rumah",
                  desc: "Tersedia pilihan kedatangan ke studio Tegalgede, Karanganyar atau kunjungan terapis ke alamat rumah.",
                },
                {
                  title: "Minyak pijat ramah kulit bayi",
                  desc: "Menggunakan bahan perawatan lembut yang aman untuk kulit bayi baru lahir hingga usia 5 tahun.",
                },
              ].map((item, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                  <h4 className="text-[15px] leading-[22px] font-semibold text-[#4A2A1A] sm:w-56 shrink-0">
                    {item.title}
                  </h4>
                  <p className="text-[15px] leading-[23px] text-[#6B5A52] break-words">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedImage.title}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[90dvh] w-full bg-white rounded-[12px] overflow-hidden border border-black/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-black/10 shrink-0">
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-[#4A2A1A] break-words">{selectedImage.title}</h3>
                <p className="text-[13px] text-[#6B5A52] break-words mt-0.5">{selectedImage.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] text-[#6B5A52] hover:text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer shrink-0 -mr-1.5 -mt-1"
                aria-label="Tutup pratinjau"
              >
                <CloseIcon size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="bg-[#FAF6F2] p-4 flex items-center justify-center overflow-y-auto">
              <img
                src={selectedImage.src}
                alt={selectedImage.title}
                className="w-full max-h-[65dvh] object-contain rounded-[8px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
