import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Sparkles, Heart, MapPin, CheckCircle2, Loader2, Calendar, Star, Building2, X as CloseIcon } from "lucide-react";
import { motion } from "motion/react";
import { getServices } from "@/services/service.service";
import { getPublicReviews } from "@/services/reservation.service";
import type { Service, Review } from "@/types/api.types";

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "Bayi" | "Anak" | "Ibu">("all");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string; desc: string } | null>(null);

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

  const filteredServices = services.filter((s) =>
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
        // Fallback or silent catch
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getServiceCardDetails = (service: Service, index: number) => {
    const name = service.name.toLowerCase();
    const category = service.category;

    // 1. Mom Treatments (Pijat Hamil, Pijat Laktasi, dsb.)
    if (category === "mom_treatment" || name.includes("mom") || name.includes("laktasi") || name.includes("hamil") || name.includes("ibu") || name.includes("nifas")) {
      return {
        image: "/images/service-mom-spa.jpg",
        badge: "Mom Care",
        badgeColor: "bg-purple-500",
        ageLabel: "Bunda",
      };
    }

    // 2. Health & Medical Therapy (Infra Red, Batuk Pilek, Nebulizer, Kolik, dsb.)
    if (name.includes("+ir") || name.includes("terapi") || name.includes("infra") || name.includes("batuk") || name.includes("pilek") || name.includes("kolik") || name.includes("nebulizer")) {
      return {
        image: "/images/service-health-therapy.jpg",
        badge: "Terapi Medis",
        badgeColor: "bg-amber-500",
        ageLabel: service.age_min_months !== null ? `${service.age_min_months} - ${service.age_max_months || 24} Bln` : "Semua Usia",
      };
    }

    // 3. Baby Spa, Swim, Bath (Baby Swim, Fun Swim, Bubble Bath)
    if (name.includes("swim") || name.includes("spa") || name.includes("renang") || name.includes("bubble")) {
      return {
        image: name.includes("kids") ? "/images/service-kids-care.jpg" : "/images/service-baby-spa.jpg",
        badge: index % 4 === 0 ? "Best Seller" : "Favorit",
        badgeColor: "bg-pink-500",
        ageLabel: name.includes("kids") ? "3 - 7 Tahun" : "0 - 24 Bulan",
      };
    }

    // 4. Newborn & Grooming (Mandi Bayi, Cukur Gundul, Tali Pusar)
    if (name.includes("newborn") || name.includes("mandi") || name.includes("cukur") || name.includes("gundul") || name.includes("lahir")) {
      return {
        image: "/images/service-newborn-care.jpg",
        badge: "Perawatan Bayi",
        badgeColor: "bg-sky-500",
        ageLabel: "0 - 12 Bulan",
      };
    }

    // 5. Kids Care (Kids, Anak, Masker)
    if (name.includes("kids") || name.includes("anak") || name.includes("masker") || (service.age_min_months && service.age_min_months >= 36)) {
      return {
        image: "/images/service-kids-care.jpg",
        badge: "Kids Care",
        badgeColor: "bg-emerald-500",
        ageLabel: "3 - 7 Tahun",
      };
    }

    // 6. Default: Baby Massage / Pijat Lembut Bayi
    return {
      image: "/images/service-baby-massage.jpg",
      badge: "Baby Massage",
      badgeColor: "bg-rose-500",
      ageLabel: service.age_min_months !== null && service.age_max_months !== null ? `${service.age_min_months} - ${service.age_max_months} Bln` : "0 - 24 Bulan",
    };
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
    <div className="flex flex-col gap-24 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 px-6 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6 relative z-10"
          >
            <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 px-4 py-2 rounded-full w-max text-sm font-medium">
              <Sparkles size={16} /> Spa Bayi Seru & Nyaman
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-slate-800">
              Kasih Sayang Spesial buat{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-600">
                Si Kecil Tersayang
              </span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-md">
              Bikin momen relaksasi bayi jadi makin seru dengan terapis handal kami. Bisa di studio, bisa juga dipanggil ke rumah Bunda lho!
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/reservasi" className="btn-primary flex items-center gap-2 shadow-lg shadow-pink-100">
                Yuk, Booking Sesi <ArrowRight size={18} />
              </Link>
              <a href="#layanan" className="btn-secondary">
                Lihat Menu Layanan
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-pink-200" />
                ))}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-slate-800">500+ Bunda</p>
                <p className="text-slate-500">udah cobain & suka!</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-200 to-pink-50 rounded-[3rem] rotate-3 scale-105 z-0" />
            <img
              src="https://images.unsplash.com/photo-1630305130592-210da48f151e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWJ5JTIwc3BhfGVufDF8fHx8MTc4MDM3MjQ3OHww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Baby enjoying spa"
              className="relative z-10 w-full object-cover rounded-[3rem] shadow-2xl h-[500px]"
            />
            {/* Floating Badges */}
            <div
              className="absolute -left-8 top-12 z-20 glass-card p-4 flex items-center gap-3 animate-bounce"
              style={{ animationDuration: "3s" }}
            >
              <div className="bg-green-100 p-2 rounded-full text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Terapis Expert</p>
                <p className="text-xs text-slate-500">Aman & Terpercaya</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeri" className="px-6 max-w-7xl mx-auto w-full scroll-mt-24">
        <div className="text-center mb-12">
          <span className="text-pink-500 font-bold tracking-wider text-xs md:text-sm uppercase mb-2 block">
            Galeri Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">
            Galeri Mayesha Baby Spa
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
            Lihat aktivitas layanan dan fasilitas lengkap kami.
          </p>
        </div>

        {/* Aktivitas Kami */}
        <div className="mb-14">
          <h3 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
            <Star className="text-pink-500 fill-pink-500 w-5 h-5" /> Aktivitas Kami
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activities.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelectedImage({ src: item.img, title: item.title, desc: item.desc })}
                className="group relative overflow-hidden rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer bg-slate-100 h-64 border border-white/60"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h4 className="font-bold text-lg leading-tight group-hover:text-pink-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-200 mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Fasilitas Kami */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
            <Building2 className="text-pink-500 w-5 h-5" /> Fasilitas Kami
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {facilities.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelectedImage({ src: item.img, title: item.title, desc: item.desc })}
                className="group relative overflow-hidden rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer bg-slate-100 h-64 border border-white/60"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h4 className="font-bold text-lg leading-tight group-hover:text-pink-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-200 mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="layanan" className="px-6 max-w-7xl mx-auto w-full scroll-mt-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Pilihan Layanan Kami</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Tiap layanan dirancang khusus biar tumbuh kembang si Kecil makin optimal sambil seru-seruan bareng kita.
          </p>

          {/* Klasifikasi Filter Pills (Bayi / Anak / Ibu) */}
          {!isLoading && services.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
              {[
                { id: "all", label: "Semua Layanan", dot: "" },
                { id: "Bayi", label: "Layanan Bayi", dot: "bg-sky-500" },
                { id: "Anak", label: "Layanan Anak", dot: "bg-amber-500" },
                { id: "Ibu", label: "Layanan Ibu", dot: "bg-pink-500" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSegmentFilter(tab.id as "all" | "Bayi" | "Anak" | "Ibu")}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-2 ${
                    segmentFilter === tab.id
                      ? "bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-100"
                      : "bg-white text-slate-600 border-slate-200 hover:border-pink-200 hover:bg-pink-50/40"
                  }`}
                >
                  {tab.dot && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        segmentFilter === tab.id ? "bg-white" : tab.dot
                      }`}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-pink-500" />
            <p className="text-slate-400 text-sm">Menyiapkan daftar layanan...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-600 font-semibold text-lg">Layanan Belum Tersedia</p>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
              Mohon tunggu sebentar, kami sedang memperbarui paket spa terbaik untuk si Kecil.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {filteredServices.map((service, idx) => {
              const card = getServiceCardDetails(service, idx);
              const cls = getServiceClassification(service);
              const clsStyle =
                cls === "Bayi"
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : cls === "Anak"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-pink-50 text-pink-700 border-pink-200";
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group glass-card p-8 flex flex-col h-full border border-white/50 hover:border-pink-200 transition-all shadow-lg hover:shadow-xl overflow-hidden"
                >
                  {/* Photo Thumbnail Banner */}
                  <div className="relative -mx-8 -mt-8 mb-6 h-48 overflow-hidden bg-slate-100">
                    <img
                      src={card.image}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    {/* Floating Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-md ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur-md text-slate-800 shadow-sm">
                        {card.ageLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${clsStyle}`}>
                      {cls}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{service.name}</h3>
                  <p className="text-slate-500 mb-6 flex-1 text-sm leading-relaxed line-clamp-3">
                    {service.description}
                  </p>
                  <div className="pt-6 border-t border-slate-100/60 flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                        {service.duration_minutes} Menit
                      </span>
                      <span className="text-lg font-extrabold text-pink-500">
                        Rp {service.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <Link
                      to={`/reservasi?service_id=${service.id}`}
                      className="text-sm font-bold text-slate-700 hover:text-pink-500 transition-colors flex items-center gap-1 group"
                    >
                      Booking{" "}
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <section className="px-6 max-w-7xl mx-auto w-full scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Kata Bunda Tentang Mayesha</h2>
            <p className="text-slate-500 text-sm">Feedback jujur dari para Bunda setelah mendatangkan keceriaan bagi si Kecil.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card p-6 flex flex-col justify-between border border-white/50 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={14}
                        className={idx < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm italic leading-relaxed">
                    &quot;{r.comment || "Sangat puas dengan pelayanan Mayesha!"}&quot;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-xs">{r.user_name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{r.service_name}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(r.created_at || "").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="px-6 max-w-7xl mx-auto w-full relative">
        <div className="glass-panel p-10 md:p-16 flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2">
            <img
              src="https://images.unsplash.com/photo-1510154221590-ff63e90a136f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWJ5JTIwbWFzc2FnZXxlbnwxfHx8fDE3ODAzNzI0Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Baby Massage"
              className="w-full h-auto rounded-3xl shadow-xl"
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <h2 className="text-3xl font-bold text-slate-800">Kenapa Mayesha Baby Spa?</h2>
            <ul className="flex flex-col gap-5">
              {[
                { title: "Super Bersih & Nyaman", desc: "Studio wangi, steril, dan pastinya bikin bayi betah." },
                {
                  title: "Terapis Pro & Sabar",
                  desc: "Udah lulus sertifikasi, ramah, dan sayang anak.",
                },
                { title: "Bisa Home Service", desc: "Bunda sibuk? Kita yang meluncur ke rumah!" },
                { title: "Pakai Produk Organik", desc: "Aman banget buat kulit sensitif bayi." },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="mt-1 bg-pink-100 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="text-pink-500 w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.desc}</p>
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
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-pink-500 transition-colors cursor-pointer"
              aria-label="Tutup preview"
            >
              <CloseIcon size={20} />
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
              className="w-full max-h-[70vh] object-contain bg-black/40"
            />
            <div className="p-6 text-white bg-slate-900">
              <h3 className="text-xl font-bold text-pink-400">{selectedImage.title}</h3>
              <p className="text-sm text-slate-300 mt-1">{selectedImage.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}