import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Sparkles, Heart, MapPin, CheckCircle2, Loader2, Calendar, Star, Building2, Search, X as CloseIcon } from "lucide-react";
import { motion } from "motion/react";
import { getServices } from "@/services/service.service";
import { getPublicReviews } from "@/services/reservation.service";
import type { Service, Review } from "@/types/api.types";

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllServices, setShowAllServices] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string; desc: string } | null>(null);

  const getServiceClassification = (s: Service): "Bayi" | "Anak" | "Ibu" => {
    if (s.category === "mom_treatment" || (s.age_min_months !== null && s.age_min_months >= 216)) {
      return "Ibu";
    }
    if (
      (s.age_min_months !== null && s.age_min_months >= 13) ||
      /kids|anak|1[-–]3\s*(th|tahun)|3[-–]4\s*(th|tahun)/i.test(s.name)
    ) {
      return "Anak";
    }
    return "Bayi";
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredServices = services.filter((s) => {
    const matchesSegment = segmentFilter === "all" ? true : getServiceClassification(s) === segmentFilter;
    const matchesQuery = !normalizedQuery
      ? true
      : s.name.toLowerCase().includes(normalizedQuery) ||
        (s.description || "").toLowerCase().includes(normalizedQuery);
    return matchesSegment && matchesQuery;
  });
  const isExpanded = showAllServices || normalizedQuery.length > 0;
  const displayedServices = isExpanded ? filteredServices : filteredServices.slice(0, 8);

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
        // Fallback or silent catch
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatServiceAge = (service: Service): string => {
    const min = service.age_min_months;
    const max = service.age_max_months;

    if (service.category === "mom_treatment" || (min !== null && min >= 216)) {
      return "Bunda";
    }
    if (min === null) return "Semua Usia";
    if (max === null) return "Dewasa";
    if (max <= 12) return `${min}–${max} Bulan`;

    const isCleanYearMin = min === 0 || min % 12 === 0 || min % 12 === 1;
    const isCleanYearMax = max % 12 === 0;
    if (isCleanYearMin && isCleanYearMax) {
      const minYears = min === 0 ? 0 : Math.floor(min / 12);
      const maxYears = max / 12;
      return `${minYears}–${maxYears} Tahun`;
    }

    return `${min}–${max} Bulan`;
  };

  const activities = [
    {
      title: "Fun Baby Swim",
      desc: "Pengalaman renang seru",
      img: "/images/activity-swim-purple.png",
    },
    {
      title: "Bidan Profesional",
      desc: "Ditangani tenaga ahli",
      img: "/images/activity-team.jpg",
    },
    {
      title: "Baby Massage",
      desc: "Relaksasi untuk si kecil",
      img: "/images/activity-massage.jpg",
    },
    {
      title: "Layanan Kesehatan",
      desc: "Terapi infrared & uap",
      img: "/images/activity-therapy.png",
    },
  ];

  const facilities = [
    {
      title: "Kolam Renang",
      desc: "Air hangat & nyaman",
      img: "/images/facility-pool.png",
    },
    {
      title: "Baby Gym",
      desc: "Area bermain edukatif",
      img: "/images/facility-gym.jpg",
    },
    {
      title: "Ruang Private",
      desc: "Bersih & higienis",
      img: "/images/facility-treatment.png",
    },
    {
      title: "Matras Empuk",
      desc: "Nyaman untuk bayi",
      img: "/images/facility-massage.png",
    },
  ];

  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-16 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-3 md:pt-6 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col gap-5 relative z-10"
          >
            <h1 className="font-editorial text-[36px] sm:text-[46px] md:text-[54px] font-semibold leading-[1.12] text-[#3A2622]">
              Perawatan Lembut untuk{" "}
              <span className="italic text-[#BE346E]">Si Kecil &amp; Bunda</span>
            </h1>
            <p className="text-[15px] sm:text-[17px] text-[#6E5D58] leading-[1.65] max-w-md">
              Layanan baby spa, pijat anak 0–5 tahun, dan perawatan ibu oleh bidan tersertifikasi. Tersedia di studio Tegalgede maupun kunjungan ke rumah.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/reservasi" className="btn-primary">
                Buat Reservasi <ArrowRight size={17} />
              </Link>
              <a href="#layanan" className="btn-secondary">
                Lihat Menu Layanan
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-[#6E5D58]">
              <span className="inline-flex items-center gap-2 font-medium text-[#3A2622]">
                <CheckCircle2 size={16} className="text-[#2F6B45] shrink-0" />
                Ditangani Bidan Tersertifikasi
              </span>
              <span className="inline-flex items-center gap-2 font-medium text-[#3A2622]">
                <CheckCircle2 size={16} className="text-[#2F6B45] shrink-0" />
                Alat Steril Setiap Sesi
              </span>
              {reviews.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-[#3A2622]">
                  <Star size={15} className="text-amber-500 fill-amber-400 shrink-0" />
                  {(reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)}/5 ({reviews.length} ulasan)
                </span>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="relative"
          >
            <img
              src="/images/activity-massage.jpg"
              alt="Bidan Mayesha Baby Spa melakukan pijat bayi"
              className="relative z-10 w-full object-cover rounded-[24px] shadow-md h-[280px] sm:h-[380px] md:h-[460px] border border-[#E8DFD8]"
            />
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeri" className="px-6 max-w-7xl mx-auto w-full scroll-mt-24">
        <div className="text-center mb-12">
          <span className="text-[#BE346E] font-bold tracking-wider text-xs md:text-sm uppercase mb-2 block">
            Galeri Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#3A2622] mb-4">
            Galeri Mayesha Baby Spa
          </h2>
          <p className="text-[#6E5D58] max-w-2xl mx-auto text-sm md:text-base">
            Lihat aktivitas layanan dan fasilitas lengkap kami.
          </p>
        </div>

        {/* Aktivitas Kami */}
        <div className="mb-14">
          <h3 className="text-2xl font-bold mb-6 text-[#3A2622] flex items-center gap-2">
            <Star className="text-[#BE346E] fill-[#BE346E] w-5 h-5" /> Aktivitas Kami
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activities.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImage({ src: item.img, title: item.title, desc: item.desc })}
                className="group relative overflow-hidden rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-[#F4EFE8] h-64 border border-[#E8DFD8]"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1412]/90 via-[#2E1E1B]/45 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h4 className="font-bold text-lg leading-tight text-white drop-shadow-sm group-hover:text-[#F9EBEF] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-white/90 mt-1 drop-shadow-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fasilitas Kami */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-[#3A2622] flex items-center gap-2">
            <Building2 className="text-[#BE346E] w-5 h-5" /> Fasilitas Kami
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {facilities.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImage({ src: item.img, title: item.title, desc: item.desc })}
                className="group relative overflow-hidden rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-[#F4EFE8] h-64 border border-[#E8DFD8]"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1412]/90 via-[#2E1E1B]/45 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h4 className="font-bold text-lg leading-tight text-white drop-shadow-sm group-hover:text-[#F9EBEF] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-white/90 mt-1 drop-shadow-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="layanan" className="px-6 max-w-7xl mx-auto w-full scroll-mt-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-6 border-b border-[#E8DFD8]">
          <div className="max-w-xl">
            <span className="text-[#BE346E] font-bold tracking-wider text-xs uppercase mb-2 block">
              Menu Perawatan
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#3A2622] mb-2">Pilihan Layanan Kami</h2>
            <p className="text-[#6E5D58] text-sm sm:text-base leading-relaxed">
              Pilih perawatan sesuai usia si Kecil atau kebutuhan Bunda, lalu lanjutkan reservasi dalam beberapa langkah.
            </p>
          </div>

          {/* Klasifikasi Filter Segmented Control + Pencarian Cepat */}
          {!isLoading && services.length > 0 && (
            <div className="flex flex-col sm:items-end gap-3 w-full lg:w-auto">
              <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1.5 rounded-2xl bg-[#F4EFE8] border border-[#E8DFD8] w-full sm:w-fit">
                {[
                  { id: "all", label: "Semua Layanan" },
                  { id: "Bayi", label: "Layanan Bayi" },
                  { id: "Anak", label: "Layanan Anak" },
                  { id: "Ibu", label: "Layanan Ibu" },
                ].map((tab) => {
                  const isActive = segmentFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSegmentFilter(tab.id as "all" | "Bayi" | "Anak" | "Ibu");
                        setShowAllServices(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
                        isActive
                          ? "bg-white text-[#BE346E] shadow-sm ring-1 ring-[#E8DFD8]"
                          : "text-[#6E5D58] hover:text-[#3A2622] hover:bg-white/60"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E5D58] pointer-events-none" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari layanan (mis. pijat, renang, nifas)..."
                  aria-label="Cari layanan perawatan"
                  className="input-glass w-full pl-11 pr-10 py-2.5 text-sm rounded-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Hapus pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full inline-flex items-center justify-center text-[#6E5D58] hover:text-[#3A2622] hover:bg-[#F4EFE8] cursor-pointer"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-[#BE346E]" />
            <p className="text-[#6E5D58] text-sm">Menyiapkan daftar layanan...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-[#D7C9BE] mb-4" size={48} />
            <p className="text-[#3A2622] font-semibold text-lg">
              {normalizedQuery ? "Layanan Tidak Ditemukan" : "Layanan Belum Tersedia"}
            </p>
            <p className="text-[#6E5D58] text-sm max-w-sm mx-auto mt-1">
              {normalizedQuery
                ? `Tidak ada layanan yang cocok dengan "${searchQuery}".`
                : "Mohon tunggu sebentar, kami sedang memperbarui paket spa terbaik untuk si Kecil."}
            </p>
            {normalizedQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSegmentFilter("all");
                }}
                className="btn-secondary mt-5 text-xs"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white border border-[#E8DFD8] rounded-3xl shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-2">
                {displayedServices.map((service, idx) => {
                  const ageLabel = formatServiceAge(service);
                  const cls = getServiceClassification(service);
                  const isLastSingle = idx === displayedServices.length - 1;
                  const isSecondLastEven =
                    displayedServices.length % 2 === 0 && idx === displayedServices.length - 2;
                  return (
                    <div
                      key={service.id}
                      className={`group p-5 sm:p-6 border-[#E8DFD8] md:odd:border-r hover:bg-[#FAF7F2]/80 transition-colors flex flex-col justify-between gap-3 ${
                        isLastSingle ? "" : isSecondLastEven ? "border-b md:border-b-0" : "border-b"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6E5D58] mb-1">
                            <span className="text-[#BE346E]">{cls}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{ageLabel}</span>
                          </div>
                          <h3 className="font-editorial text-lg sm:text-[19px] font-semibold text-[#3A2622] leading-snug">
                            {service.name}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-bold text-[#3A2622] tabular-nums block">
                            Rp {service.price.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[11px] text-[#6E5D58] font-medium tabular-nums">
                            {service.duration_minutes} Menit
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4 pt-1">
                        <p className="text-xs sm:text-sm text-[#6E5D58] leading-relaxed line-clamp-2 flex-1">
                          {service.description}
                        </p>
                        <Link
                          to={`/reservasi?service_id=${service.id}`}
                          className="text-xs sm:text-sm font-semibold text-[#BE346E] hover:text-[#9F285B] transition-colors inline-flex items-center gap-1 shrink-0 min-h-[36px] pl-2"
                        >
                          Booking
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {filteredServices.length > 8 && !normalizedQuery && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllServices((prev) => !prev)}
                  className="btn-secondary"
                >
                  {showAllServices
                    ? "Tampilkan Lebih Ringkas"
                    : `Lihat Semua (${filteredServices.length} Layanan)`}
                </button>
                {!showAllServices && (
                  <p className="text-xs text-[#6E5D58]">
                    Menampilkan 8 dari {filteredServices.length} layanan tersedia
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <section className="px-6 max-w-7xl mx-auto w-full scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-5 border-b border-[#E8DFD8]">
            <div>
              <span className="text-[#BE346E] font-bold tracking-wider text-xs uppercase mb-2 block">
                Ulasan Pelanggan
              </span>
              <h2 className="text-3xl font-bold text-[#3A2622] mb-1">Kata Bunda Tentang Mayesha</h2>
              <p className="text-[#6E5D58] text-sm">
                Pengalaman para Bunda setelah mempercayakan perawatan si Kecil di Mayesha Baby Spa.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#3A2622] bg-white border border-[#E8DFD8] rounded-full px-4 py-2 self-start sm:self-auto tabular-nums">
              <Star size={14} className="text-amber-500 fill-amber-400" />
              {(reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)}/5 dari {reviews.length} ulasan
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-[#E8DFD8] rounded-2xl p-6 flex flex-col justify-between transition-colors hover:border-[#D7C9BE]"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={14}
                        className={idx < r.rating ? "text-amber-400 fill-amber-400" : "text-[#D7C9BE]"}
                      />
                    ))}
                  </div>
                  <p className="text-[#3A2622] text-sm leading-relaxed border-l-2 border-[#BE346E]/50 pl-3.5">
                    &ldquo;{r.comment || "Sangat puas dengan pelayanan Mayesha!"}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E8DFD8] flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#3A2622] text-xs">{r.user_name}</p>
                    <p className="text-[11px] text-[#6E5D58]">{r.service_name}</p>
                  </div>
                  <span className="text-[11px] text-[#6E5D58] tabular-nums">
                    {new Date(r.created_at || "").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto w-full relative">
        <div className="glass-panel p-6 sm:p-10 md:p-14 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-full md:w-1/2">
            <img
              src="/images/activity-team.jpg"
              alt="Tim Bidan Mayesha Baby Spa"
              className="w-full h-[260px] sm:h-[340px] object-cover rounded-[20px] border border-[#E8DFD8]"
              loading="lazy"
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <h2 className="font-editorial text-3xl font-semibold text-[#3A2622]">
              Kenapa Mayesha Baby Spa?
            </h2>
            <ul className="flex flex-col gap-4">
              {[
                {
                  title: "Ruang & Peralatan Bersih",
                  desc: "Kolam, matras, dan perlengkapan perawatan selalu dibersihkan sebelum tiap sesi.",
                },
                {
                  title: "Ditangani Bidan Tersertifikasi",
                  desc: "Seluruh prosedur pijat bayi, anak, dan perawatan ibu dilakukan oleh tenaga kebidanan terlatih.",
                },
                {
                  title: "Tersedia Layanan Home Care",
                  desc: "Tersedia pilihan datang ke studio Tegalgede maupun kunjungan terapis ke rumah Bunda.",
                },
                {
                  title: "Minyak Pijat Ramah Kulit Bayi",
                  desc: "Menggunakan bahan perawatan lembut yang aman untuk kulit sensitif bayi baru lahir hingga anak.",
                },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-3.5 items-start">
                  <div className="mt-0.5 bg-[#EDF5F0] w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="text-[#2F6B45] w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#3A2622] text-[15px]">{item.title}</h4>
                    <p className="text-sm text-[#6E5D58] leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Image Preview Modal / Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#3A2622] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-[#BE346E] transition-colors cursor-pointer"
              aria-label="Tutup preview"
            >
              <CloseIcon size={20} />
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
              className="w-full max-h-[70vh] object-contain bg-black/40"
            />
            <div className="p-6 text-white bg-[#3A2622]">
              <h3 className="text-xl font-bold text-[#BE346E]">{selectedImage.title}</h3>
              <p className="text-sm text-[#D7C9BE] mt-1">{selectedImage.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}