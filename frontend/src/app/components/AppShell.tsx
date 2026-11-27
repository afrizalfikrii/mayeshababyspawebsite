import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Menu, X, MapPin, Phone, Instagram, MessageCircle, ChevronDown, User, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import BrandLogo from "./BrandLogo";

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawerButtonRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpenRef = useRef(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const isAdmin = user?.role === "admin";
  const isAdminRoute = location.pathname.startsWith("/admin");

  const displayName = (user?.name ?? "Akun").trim();
  const firstName = displayName.split(" ")[0] || "Akun";
  const initial = firstName.charAt(0).toUpperCase();
  const portalPath = isAdmin ? "/admin" : "/dashboard";
  const portalLabel = isAdmin ? "Area admin" : "Ruang Bunda";

  // Kunci scroll body, pindah fokus ke panel drawer, tutup dengan Esc, dan kembalikan fokus saat ditutup
  useEffect(() => {
    if (isMenuOpen) {
      wasMenuOpenRef.current = true;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const timer = requestAnimationFrame(() => {
        closeDrawerButtonRef.current?.focus();
      });

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsMenuOpen(false);
      };
      document.addEventListener("keydown", handleEscape);

      return () => {
        cancelAnimationFrame(timer);
        document.body.style.overflow = prevOverflow;
        document.removeEventListener("keydown", handleEscape);
      };
    } else if (wasMenuOpenRef.current) {
      wasMenuOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [isMenuOpen]);

  // Tutup menu profil saat klik di luar, tekan Escape, atau pindah halaman
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  const [activeSection, setActiveSection] = useState<"beranda" | "galeri" | "layanan" | "booking" | "other">("beranda");
  const isProgrammaticScrollRef = useRef(false);

  // Scroll spy untuk memindahkan garis bawah menu sesuai posisi halaman
  useEffect(() => {
    if (location.pathname !== "/") {
      if (location.pathname === "/reservasi") {
        setActiveSection("booking");
      } else {
        setActiveSection("other");
      }
      return;
    }

    const handleScroll = () => {
      // Jangan timpa jika sedang dalam proses smooth scroll akibat klik menu
      if (isProgrammaticScrollRef.current) return;

      const scrollY = window.scrollY;
      const galeriEl = document.getElementById("galeri");
      const layananEl = document.getElementById("layanan");

      const galeriTop = galeriEl ? galeriEl.offsetTop - 180 : Infinity;
      const layananTop = layananEl ? layananEl.offsetTop - 180 : Infinity;

      if (scrollY >= layananTop) {
        setActiveSection("layanan");
      } else if (scrollY >= galeriTop) {
        setActiveSection("galeri");
      } else {
        setActiveSection("beranda");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Scroll otomatis hanya saat halaman pertama kali dimuat dengan hash URL
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          const headerOffset = 84;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Berhasil keluar.");
      navigate("/");
    } catch {
      toast.error("Gagal keluar, silakan coba lagi.");
    }
  };

  const handleMenuLayananClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection("layanan");
    isProgrammaticScrollRef.current = true;

    if (location.pathname === "/") {
      window.history.replaceState(null, "", "#layanan");
      const el = document.getElementById("layanan");
      if (el) {
        const headerOffset = 84;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    } else {
      navigate("/#layanan");
    }

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 800);
  };

  const handleGaleriClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection("galeri");
    isProgrammaticScrollRef.current = true;

    if (location.pathname === "/") {
      window.history.replaceState(null, "", "#galeri");
      const el = document.getElementById("galeri");
      if (el) {
        const headerOffset = 84;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    } else {
      navigate("/#galeri");
    }

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 800);
  };

  const handleBerandaClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      setActiveSection("beranda");
      isProgrammaticScrollRef.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 800);
    }
  };

  const navLinkClass = (active: boolean) =>
    `inline-flex items-center min-h-[44px] text-[15px] font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer border-b-2 ${
      active
        ? "text-[#4A2A1A] border-[#D4568F]"
        : "text-[#6B5A52] border-transparent hover:text-[#4A2A1A]"
    }`;

  const isHomeActive = activeSection === "beranda";
  const isGaleriActive = activeSection === "galeri";
  const isLayananActive = activeSection === "layanan";

  return (
    <div className={`flex flex-col min-h-[100dvh] bg-[#FAF6F2] text-[#4A2A1A] ${isAdminRoute ? "admin-theme" : ""}`}>
      {!isAuthPage && (
        <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-[#FFFBF8] pt-[env(safe-area-inset-top)] print:hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-2 md:gap-6 h-16 md:h-[72px]">
            {/* Brand */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 shrink-0">
              <BrandLogo hideTaglineOnMobile onClick={handleBerandaClick} />
              {isAdminRoute && (
                <span className="text-[13px] leading-[18px] font-normal text-[#6B5A52] pl-2.5 md:pl-3 border-l border-black/10 self-center whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>

            {/* Center Links (>= 768px) */}
            {isAdminRoute ? (
              <nav className="hidden md:flex items-center">
                <Link
                  to="/"
                  className="inline-flex items-center min-h-[44px] text-[14px] font-medium text-[#4A2A1A] hover:text-[#C94A83] hover:underline decoration-[#D4568F] decoration-[1.5px] underline-offset-4 transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 rounded-sm"
                >
                  Lihat situs
                </Link>
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-6 lg:gap-7">
                <Link to="/" onClick={handleBerandaClick} className={navLinkClass(isHomeActive)}>
                  Beranda
                </Link>
                <Link to="/#galeri" onClick={handleGaleriClick} className={navLinkClass(isGaleriActive)}>
                  Galeri
                </Link>
                <Link to="/#layanan" onClick={handleMenuLayananClick} className={navLinkClass(isLayananActive)}>
                  Menu layanan
                </Link>
              </nav>
            )}

            {/* Right Actions (>= 768px) */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4 shrink-0">
              {isAuthenticated ? (
                <>
                  {!isAdmin && !isAdminRoute && (
                    <Link
                      to="/reservasi"
                      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[14px] font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                    >
                      Reservasi
                    </Link>
                  )}
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={isProfileOpen}
                      className="flex items-center gap-2.5 min-h-[44px] pl-1.5 pr-3 rounded-[8px] border border-black/10 bg-white hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                    >
                      <span className="w-7 h-7 rounded-full bg-[#FAF6F2] border border-black/10 flex items-center justify-center text-[13px] font-semibold text-[#4A2A1A]">
                        {initial}
                      </span>
                      <span className="text-[14px] font-medium text-[#4A2A1A] max-w-[110px] truncate capitalize">
                        {firstName}
                      </span>
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`text-[#6B5A52] transition-transform duration-150 ${
                          isProfileOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isProfileOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white border border-black/10 rounded-[12px] p-2 z-50"
                      >
                        <div className="px-3 py-2.5 border-b border-black/10 mb-2">
                          <p className="text-[14px] font-semibold text-[#4A2A1A] truncate capitalize">{displayName}</p>
                          {user?.email && (
                            <p className="text-[12px] text-[#6B5A52] truncate">{user.email}</p>
                          )}
                        </div>

                        <Link
                          to={portalPath}
                          role="menuitem"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 min-h-[44px] rounded-[8px] text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150"
                        >
                          <User size={16} className="text-[#6B5A52]" aria-hidden="true" />
                          {portalLabel}
                        </Link>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }}
                          className="w-full min-h-[44px] mt-1.5 inline-flex items-center justify-center gap-2 px-3 rounded-[8px] border border-black/15 text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer"
                        >
                          <LogOut size={15} className="text-[#6B5A52]" aria-hidden="true" />
                          Keluar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/auth"
                    className="inline-flex items-center min-h-[44px] px-2 text-[15px] font-medium text-[#4A2A1A] hover:text-[#C94A83] hover:underline decoration-[#D4568F] underline-offset-4 transition-colors duration-150 whitespace-nowrap"
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/reservasi"
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[14px] font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                  >
                    Reservasi
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Right Controls (< 768px): Tombol Reservasi (pelanggan) / avatar (admin) + Hamburger 44x44px */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
              {!isAdminRoute && !isAdmin && (
                <Link
                  to="/reservasi"
                  className="inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[14px] font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                >
                  Reservasi
                </Link>
              )}

              {isAdminRoute && isAuthenticated && (
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-white border border-black/15 flex items-center justify-center text-[13px] font-semibold text-[#4A2A1A]"
                >
                  {initial}
                </span>
              )}

              <button
                ref={menuButtonRef}
                type="button"
                className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label={isMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-nav-drawer"
              >
                {isMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Mobile Full-Height Navigation Drawer (< 768px) */}
      {!isAuthPage && isMenuOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className="fixed inset-0 z-50 md:hidden flex justify-end"
        >
          <div
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-black/45"
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-[320px] h-[100dvh] bg-[#FFFBF8] border-l border-black/10 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="h-16 px-4 flex items-center justify-between border-b border-black/10 shrink-0">
              <BrandLogo size="sm" hideTaglineOnMobile onClick={() => setIsMenuOpen(false)} />
              <button
                ref={closeDrawerButtonRef}
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Tutup menu navigasi"
                className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83]"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
              {isAdminRoute ? (
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center min-h-[48px] px-3 rounded-[8px] text-[16px] text-[#4A2A1A] font-medium hover:bg-[#FAF6F2] transition-colors duration-150"
                >
                  Lihat situs
                </Link>
              ) : (
                <>
                  <Link
                    to="/"
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      handleBerandaClick(e);
                    }}
                    className={`flex items-center min-h-[48px] px-3 rounded-[8px] text-[16px] transition-colors duration-150 ${
                      isHomeActive
                        ? "text-[#C94A83] font-medium bg-[#FAF6F2]"
                        : "text-[#4A2A1A] font-normal hover:bg-[#FAF6F2]"
                    }`}
                  >
                    Beranda
                  </Link>
                  <Link
                    to="/#galeri"
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      handleGaleriClick(e);
                    }}
                    className={`flex items-center min-h-[48px] px-3 rounded-[8px] text-[16px] transition-colors duration-150 ${
                      isGaleriActive
                        ? "text-[#C94A83] font-medium bg-[#FAF6F2]"
                        : "text-[#4A2A1A] font-normal hover:bg-[#FAF6F2]"
                    }`}
                  >
                    Galeri
                  </Link>
                  <Link
                    to="/#layanan"
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      handleMenuLayananClick(e);
                    }}
                    className={`flex items-center min-h-[48px] px-3 rounded-[8px] text-[16px] transition-colors duration-150 ${
                      isLayananActive
                        ? "text-[#C94A83] font-medium bg-[#FAF6F2]"
                        : "text-[#4A2A1A] font-normal hover:bg-[#FAF6F2]"
                    }`}
                  >
                    Menu layanan
                  </Link>
                </>
              )}

              <div className="mt-4 pt-4 border-t border-black/10 flex flex-col gap-2.5">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-2 pb-2">
                      <span className="w-9 h-9 rounded-full bg-white border border-black/15 flex items-center justify-center text-[14px] font-semibold text-[#4A2A1A] shrink-0">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[#4A2A1A] truncate capitalize">{displayName}</p>
                        {user?.email && (
                          <p className="text-[13px] text-[#6B5A52] truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                    {!isAdmin && (
                      <Link
                        to="/reservasi"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full min-h-[44px] inline-flex items-center justify-center px-4 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[15px] font-medium transition-colors duration-150"
                      >
                        Buat reservasi
                      </Link>
                    )}
                    <Link
                      to={portalPath}
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-[8px] border border-black/20 bg-white text-[#4A2A1A] hover:bg-[#FAF6F2] text-[15px] font-medium transition-colors duration-150"
                    >
                      <User size={16} className="text-[#6B5A52]" aria-hidden="true" />
                      {portalLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-[8px] border border-black/20 bg-transparent text-[#4A2A1A] hover:bg-[#FAF6F2] text-[15px] font-medium transition-colors duration-150 cursor-pointer"
                    >
                      <LogOut size={16} className="text-[#6B5A52]" aria-hidden="true" />
                      Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full min-h-[44px] inline-flex items-center justify-center px-4 rounded-[8px] border border-black/20 bg-white text-[#4A2A1A] hover:bg-[#FAF6F2] text-[15px] font-medium transition-colors duration-150"
                    >
                      Masuk
                    </Link>
                    <Link
                      to="/reservasi"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full min-h-[44px] inline-flex items-center justify-center px-4 rounded-[8px] bg-[#C94A83] hover:bg-[#B73F73] text-white text-[15px] font-medium transition-colors duration-150"
                    >
                      Buat reservasi
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      {!isAuthPage && (
        <footer id="location" className="bg-white border-t border-black/10 mt-12 md:mt-20 print:hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 md:pt-14 pb-8 md:pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 pb-8 md:pb-12">
              {/* Column 1: Brand & Social */}
              <div className="space-y-4 min-w-0">
                <BrandLogo />
                <p className="text-[15px] leading-[24px] text-[#6B5A52]">
                  Layanan pijat dan perawatan ibu, bayi, serta anak yang ditangani oleh bidan tersertifikasi di Karanganyar.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://www.instagram.com/mayeshababyspa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] border border-black/10 text-[#6B5A52] hover:text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150"
                    title="Instagram @mayeshababyspa"
                    aria-label="Instagram @mayeshababyspa"
                  >
                    <Instagram size={18} aria-hidden="true" />
                  </a>
                  <a
                    href="https://wa.me/6281325641896"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] border border-black/10 text-[#6B5A52] hover:text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150"
                    title="WhatsApp Mayesha Baby Spa"
                    aria-label="WhatsApp Mayesha Baby Spa"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Column 2: Kontak & Lokasi */}
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-[#4A2A1A] mb-3.5">Kontak dan lokasi</h4>
                <div className="space-y-3 text-[15px] leading-[23px] text-[#6B5A52]">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-[#6B5A52] shrink-0 mt-1" aria-hidden="true" />
                    <span className="break-words">
                      Jl. Musi Tegalwinangun Rt 02 Rw 13 Tegalgede, Kec. Karanganyar, Kab. Karanganyar (Barat Pasar Bejen)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={16} className="text-[#6B5A52] shrink-0" aria-hidden="true" />
                    <a
                      href="https://wa.me/6281325641896"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center min-h-[44px] tabular-nums text-[#4A2A1A] hover:text-[#C94A83] hover:underline underline-offset-4 transition-colors duration-150"
                    >
                      +62 813-2564-1896
                    </a>
                  </div>
                  <div className="pt-1">
                    <a
                      href="https://maps.app.goo.gl/wFPszoLPwrqvPav46"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[8px] border border-black/20 text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150"
                    >
                      <MapPin size={15} className="text-[#6B5A52]" aria-hidden="true" />
                      Buka di Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Column 3: Jam Operasional */}
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-[#4A2A1A] mb-3.5">Jam operasional</h4>
                <div className="space-y-2 text-[15px] leading-[23px]">
                  <p className="text-[#4A2A1A] font-medium tabular-nums">
                    Setiap hari, 08.30–16.30 WIB
                  </p>
                  <p className="text-[14px] leading-[22px] text-[#6B5A52]">
                    Tersedia layanan di studio maupun kunjungan ke rumah (Home Care).
                  </p>
                </div>
              </div>

              {/* Column 4: Akses Cepat */}
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-[#4A2A1A] mb-2">Akses cepat</h4>
                <ul className="flex flex-col text-[15px]">
                  <li>
                    <button
                      type="button"
                      onClick={handleGaleriClick}
                      className="inline-flex items-center min-h-[44px] text-[#6B5A52] hover:text-[#4A2A1A] hover:underline underline-offset-4 transition-colors duration-150 text-left cursor-pointer"
                    >
                      Galeri dan fasilitas
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleMenuLayananClick}
                      className="inline-flex items-center min-h-[44px] text-[#6B5A52] hover:text-[#4A2A1A] hover:underline underline-offset-4 transition-colors duration-150 text-left cursor-pointer"
                    >
                      Menu layanan
                    </button>
                  </li>
                  {!isAdmin && (
                    <li>
                      <Link
                        to="/reservasi"
                        className="inline-flex items-center min-h-[44px] text-[#6B5A52] hover:text-[#4A2A1A] hover:underline underline-offset-4 transition-colors duration-150"
                      >
                        Reservasi layanan
                      </Link>
                    </li>
                  )}
                  {isAuthenticated ? (
                    <li>
                      <Link
                        to={portalPath}
                        className="inline-flex items-center min-h-[44px] text-[#6B5A52] hover:text-[#4A2A1A] hover:underline underline-offset-4 transition-colors duration-150"
                      >
                        {portalLabel}
                      </Link>
                    </li>
                  ) : (
                    <li>
                      <Link
                        to="/auth"
                        className="inline-flex items-center min-h-[44px] text-[#6B5A52] hover:text-[#4A2A1A] hover:underline underline-offset-4 transition-colors duration-150"
                      >
                        Masuk atau daftar
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-[13px] text-[#6B5A52] text-center sm:text-left">
              <p className="tabular-nums">&copy; {new Date().getFullYear()} Mayesha Mom, Kids &amp; Baby Spa.</p>
              <p>Bidan tersertifikasi • Karanganyar</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}