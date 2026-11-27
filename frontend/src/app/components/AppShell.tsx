import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  Menu,
  X,
  MapPin,
  Phone,
  Instagram,
  MessageCircle,
  ChevronDown,
  User,
  LogOut,
  KeyRound,
  ArrowLeft,
  ArrowUpRight,
  Home as HomeIcon,
  LayoutGrid,
  Calendar,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import BrandLogo from "./BrandLogo";
import ChangePasswordModal from "./ChangePasswordModal";

const OPERATING_HOURS = "08.30–16.30 WIB";

const isTextEntryElement = (el: Element | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type?.toLowerCase() ?? "text";
    return !["checkbox", "radio", "button", "submit", "reset", "file", "hidden"].includes(type);
  }
  return false;
};

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isVisualKeyboardOpen, setIsVisualKeyboardOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawerButtonRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpenRef = useRef(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const isPublicPage = location.pathname === "/";
  const isAdmin = user?.role === "admin";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isBookingRoute = location.pathname === "/reservasi";
  const isPaymentSuccessRoute = location.pathname === "/pembayaran-sukses";
  const isBookingDetailRoute = location.pathname.startsWith("/dashboard/reservasi/");
  const isSubFlowPage = !isAdminRoute && (isBookingRoute || isBookingDetailRoute || isPaymentSuccessRoute);

  const subFlowTitle = isBookingRoute
    ? "Reservasi sesi"
    : isBookingDetailRoute
      ? "Detail reservasi"
      : isPaymentSuccessRoute
        ? "Konfirmasi pembayaran"
        : "";

  const hasBottomNavOnRoute =
    !isAdminRoute && !isAuthPage && !isBookingRoute && !isPaymentSuccessRoute;

  const shouldRenderBottomNav =
    isMobileViewport &&
    hasBottomNavOnRoute &&
    !isInputFocused &&
    !isVisualKeyboardOpen &&
    !isModalOpen;

  const displayName = (user?.name ?? "Akun").trim();
  const firstName = displayName.split(" ")[0] || "Akun";
  const initial = firstName.charAt(0).toUpperCase();
  const portalPath = isAdmin ? "/admin" : "/dashboard";
  const portalLabel = isAdmin ? "Area admin" : "Ruang Bunda";

  // Pantau lebar viewport (< 768px) agar bottom nav tidak dirender sama sekali di >= 768px
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobileViewport(mq.matches);
    handleChange();
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Sembunyikan bottom nav saat input/textarea/select fokus atau keyboard layar terbuka
  useEffect(() => {
    if (!isMobileViewport || !hasBottomNavOnRoute) {
      setIsInputFocused(false);
      setIsVisualKeyboardOpen(false);
      return;
    }

    let blurTimer: number | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      if (blurTimer !== null) {
        window.clearTimeout(blurTimer);
        blurTimer = null;
      }
      if (isTextEntryElement(e.target as Element | null)) {
        setIsInputFocused(true);
      }
    };

    const handleFocusOut = () => {
      blurTimer = window.setTimeout(() => {
        setIsInputFocused(isTextEntryElement(document.activeElement));
      }, 60);
    };

    const vv = window.visualViewport;
    const handleViewportResize = () => {
      if (!vv) return;
      setIsVisualKeyboardOpen(window.innerHeight - vv.height > 150);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    vv?.addEventListener("resize", handleViewportResize);

    return () => {
      if (blurTimer !== null) window.clearTimeout(blurTimer);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      vv?.removeEventListener("resize", handleViewportResize);
    };
  }, [isMobileViewport, hasBottomNavOnRoute]);

  // Sembunyikan bottom nav saat ada modal/dialog terbuka
  useEffect(() => {
    if (!isMobileViewport || !hasBottomNavOnRoute) {
      setIsModalOpen(false);
      return;
    }

    const checkModals = () => {
      const openDialog = document.querySelector(
        '[role="dialog"], [role="alertdialog"], [aria-modal="true"]'
      );
      setIsModalOpen(Boolean(openDialog));
    };

    checkModals();
    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["role", "aria-modal"] });

    return () => observer.disconnect();
  }, [isMobileViewport, hasBottomNavOnRoute]);

  // Kunci scroll body, pindah fokus ke panel drawer (area Admin mobile), tutup dengan Esc, kembalikan fokus
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

  // Scroll spy untuk memindahkan indikator menu sesuai posisi halaman
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

  // Scroll otomatis saat halaman beranda dibuka dengan hash URL (#layanan / #galeri)
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const id = location.hash.replace("#", "");
      if (id === "layanan") setActiveSection("layanan");
      if (id === "galeri") setActiveSection("galeri");
      const el = document.getElementById(id);
      if (el) {
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setTimeout(() => {
          const headerOffset = 80;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: prefersReduced ? "auto" : "smooth" });
        }, 120);
      }
    }
  }, [location.pathname, location.hash]);

  const handleSubFlowBack = () => {
    if (isBookingDetailRoute || isPaymentSuccessRoute) {
      navigate("/dashboard");
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

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
    `inline-flex items-center min-h-[44px] text-[14px] transition-colors duration-150 whitespace-nowrap cursor-pointer border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2 rounded-t-[4px] ${
      active
        ? "text-[#4A2A1A] font-medium border-[#D4568F]"
        : "text-[#6B5A52] font-normal border-transparent hover:text-[#4A2A1A]"
    }`;

  const isHomeActive = location.pathname === "/" && activeSection === "beranda";
  const isGaleriActive = location.pathname === "/" && activeSection === "galeri";
  const isLayananActive = location.pathname === "/" && activeSection === "layanan";
  const isAccountActive =
    isAuthenticated
      ? location.pathname === portalPath || location.pathname.startsWith(`${portalPath}/`)
      : location.pathname === "/auth";

  return (
    <div
      className={`flex flex-col min-h-[100dvh] bg-[#FAF6F2] text-[#4A2A1A] ${
        isAdminRoute ? "admin-theme" : ""
      } ${hasBottomNavOnRoute ? "pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0" : ""}`}
    >
      {/* Bar info di atas header — hanya halaman publik (bukan admin/login/reservasi) */}
      {isPublicPage && (
        <div
          data-info-strip
          className="w-full bg-[var(--strip)] text-[#F6EDE4] text-[12px] sm:text-[13px] leading-[18px] text-center px-3 py-2 pt-[calc(8px+env(safe-area-inset-top))] print:hidden"
        >
          <span className="sm:hidden">Buka setiap hari, {OPERATING_HOURS}</span>
          <span className="hidden sm:inline">
            Buka setiap hari, {OPERATING_HOURS}. Di studio Tegalgede atau kunjungan ke rumah Bunda.
          </span>
        </div>
      )}

      {!isAuthPage && (
        <header
          className={`sticky top-0 z-40 w-full border-b border-black/10 bg-[#FFFBF8] print:hidden ${
            isPublicPage ? "" : "pt-[env(safe-area-inset-top)]"
          }`}
        >
          {!isAdminRoute ? (
            <div
              className={`max-w-7xl mx-auto px-4 md:px-6 h-[56px] md:h-[72px] lg:h-auto lg:min-h-[84px] lg:py-1.5 flex items-center md:justify-between md:gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6 ${
                isSubFlowPage ? "justify-start" : "justify-center"
              }`}
            >
              {/* Bilah atas HP (< 768px): tombol kembali + judul pada sub-alur, atau logo 32px + Mayesha di tengah */}
              {isSubFlowPage ? (
                <div className="flex md:hidden items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={handleSubFlowBack}
                    aria-label="Kembali"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center justify-center rounded-[8px] text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73]"
                  >
                    <ArrowLeft size={20} aria-hidden="true" />
                  </button>
                  <span className="text-[16px] leading-[22px] font-medium text-[#4A2A1A] truncate">
                    {subFlowTitle}
                  </span>
                </div>
              ) : (
                <Link
                  to="/"
                  onClick={handleBerandaClick}
                  aria-label="Mayesha, ke beranda"
                  className="md:hidden inline-flex items-center gap-2 min-h-[44px] rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2 select-none"
                >
                  <img
                    src="/logo-mayesha.png"
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 shrink-0 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith("/logo.png")) {
                        target.src = "/logo.png";
                      }
                    }}
                  />
                  <span
                    className="font-['Playfair_Display',Georgia,serif] font-medium italic text-[22px] leading-none text-[#D4568F]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    Mayesha
                  </span>
                </Link>
              )}

              {/* Tablet (768px - 1023px): logo horizontal di kiri (ikon 36px + nama + tagline) */}
              <Link
                to="/"
                onClick={handleBerandaClick}
                aria-label="Mayesha, ke beranda"
                className="hidden md:inline-flex lg:hidden items-center gap-2.5 min-h-[44px] rounded-[8px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2 select-none"
              >
                <img
                  src="/logo-mayesha.png"
                  alt=""
                  width={36}
                  height={36}
                  className="w-9 h-9 shrink-0 object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith("/logo.png")) {
                      target.src = "/logo.png";
                    }
                  }}
                />
                <span className="flex flex-col leading-none">
                  <span
                    className="font-['Playfair_Display',Georgia,serif] font-medium italic text-[22px] leading-none text-[#D4568F]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    Mayesha
                  </span>
                  <span className="font-['DM_Sans',sans-serif] font-normal text-[12px] leading-[15px] text-[#6B3A1E] mt-0.5 whitespace-nowrap">
                    Mom, Kids &amp; Baby Spa
                  </span>
                </span>
              </Link>

              {/* Kiri desktop (>= 1024px) & kanan rapat tablet (768px-1023px): menu navigasi */}
              <nav
                aria-label="Navigasi utama"
                className="hidden md:flex items-center gap-4 lg:gap-6 md:ml-auto lg:ml-0 lg:col-start-1 lg:row-start-1 lg:justify-self-start"
              >
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

              {/* Tengah desktop (>= 1024px): logo bertumpuk rata tengah */}
              <Link
                to="/"
                onClick={handleBerandaClick}
                aria-label="Mayesha, ke beranda"
                className="hidden lg:inline-flex flex-col items-center justify-center text-center lg:col-start-2 lg:row-start-1 lg:justify-self-center rounded-[8px] px-2 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2 select-none"
              >
                <img
                  src="/logo-mayesha.png"
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 shrink-0 object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith("/logo.png")) {
                      target.src = "/logo.png";
                    }
                  }}
                />
                <span
                  className="font-['Playfair_Display',Georgia,serif] font-medium italic text-[22px] leading-[1.05] text-[#D4568F] mt-0.5"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Mayesha
                </span>
                <span className="font-['DM_Sans',sans-serif] font-normal text-[12px] leading-[14px] text-[#6B3A1E] mt-0.5 whitespace-nowrap">
                  Mom, Kids &amp; Baby Spa
                </span>
              </Link>

              {/* Kanan (>= 768px): Masuk / Menu Profil + Reservasi */}
              <div className="hidden md:flex items-center gap-3 lg:gap-4 shrink-0 lg:col-start-3 lg:row-start-1 lg:justify-self-end">
                {isAuthenticated ? (
                  <>
                    <div className="relative" ref={profileRef}>
                      <button
                        type="button"
                        onClick={() => setIsProfileOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={isProfileOpen}
                        className="flex items-center gap-2 min-h-[40px] pl-1.5 pr-3 rounded-[8px] border border-black/10 bg-white hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2"
                      >
                        <span className="w-7 h-7 rounded-full bg-[#FAF6F2] border border-black/10 flex items-center justify-center text-[13px] font-semibold text-[#4A2A1A]">
                          {initial}
                        </span>
                        <span className="text-[14px] font-medium text-[#4A2A1A] max-w-[96px] lg:max-w-[110px] truncate capitalize">
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
                              setIsPasswordModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-[8px] text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer text-left"
                          >
                            <KeyRound size={16} className="text-[#6B5A52]" aria-hidden="true" />
                            Ubah kata sandi
                          </button>

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
                    {!isAdmin && (
                      <Link
                        to="/reservasi"
                        className="inline-flex items-center justify-center px-4 py-2 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[14px] font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2"
                      >
                        Reservasi
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="inline-flex items-center min-h-[40px] px-1.5 text-[14px] font-medium text-[#4A2A1A] hover:text-[#B73F73] hover:underline decoration-[#D4568F] underline-offset-4 transition-colors duration-150 whitespace-nowrap rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2"
                    >
                      Masuk
                    </Link>
                    <Link
                      to="/reservasi"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[14px] font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2"
                    >
                      Reservasi
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Header khusus Area Admin */
            <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-2 md:gap-6 h-16 md:h-[72px]">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 shrink-0">
                <BrandLogo hideTaglineOnMobile onClick={handleBerandaClick} />
                <span className="text-[13px] leading-[18px] font-normal text-[#6B5A52] pl-2.5 md:pl-3 border-l border-black/10 self-center whitespace-nowrap">
                  Panel admin
                </span>
              </div>

              {/* Right Actions Admin (>= 768px) */}
              <div className="hidden md:flex items-center gap-3 lg:gap-4 shrink-0">
                <Link
                  to="/"
                  className="inline-flex items-center gap-[6px] min-h-[44px] px-1 text-[14px] font-medium text-[#4A2A1A] hover:text-[#B73F73] hover:underline decoration-[#D4568F] decoration-[1.5px] underline-offset-4 transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2 rounded-sm"
                >
                  <span>Lihat situs</span>
                  <ArrowUpRight size={14} aria-hidden="true" className="shrink-0" />
                </Link>

                {isAuthenticated && (
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={isProfileOpen}
                      className="flex items-center gap-2.5 min-h-[44px] pl-1.5 pr-3 rounded-[8px] border border-black/10 bg-white hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2"
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
                            setIsPasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-[8px] text-[14px] font-medium text-[#4A2A1A] hover:bg-[#FAF6F2] transition-colors duration-150 cursor-pointer text-left"
                        >
                          <KeyRound size={16} className="text-[#6B5A52]" aria-hidden="true" />
                          Ubah kata sandi
                        </button>

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
                )}
              </div>

              {/* Mobile Right Controls (< 768px): KHUSUS AREA ADMIN */}
              <div className="flex md:hidden items-center gap-2 shrink-0">
                {isAuthenticated && (
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
                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#4A2A1A] hover:bg-[#FAF6F2] rounded-[8px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73F73] focus-visible:ring-offset-2"
                  onClick={() => setIsMenuOpen((v) => !v)}
                  aria-label={isMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-nav-drawer"
                >
                  {isMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Mobile Full-Height Navigation Drawer (< 768px) — KHUSUS AREA ADMIN */}
      {!isAuthPage && isAdminRoute && isMenuOpen && (
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
                  className="flex items-center gap-[6px] min-h-[48px] px-3 rounded-[8px] text-[16px] text-[#4A2A1A] font-medium hover:bg-[#FAF6F2] transition-colors duration-150"
                >
                  <span>Lihat situs</span>
                  <ArrowUpRight size={15} aria-hidden="true" className="shrink-0" />
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
                        className="w-full min-h-[44px] inline-flex items-center justify-center px-4 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[15px] font-medium transition-colors duration-150"
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
                        setIsPasswordModalOpen(true);
                      }}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-[8px] border border-black/20 bg-white text-[#4A2A1A] hover:bg-[#FAF6F2] text-[15px] font-medium transition-colors duration-150 cursor-pointer"
                    >
                      <KeyRound size={16} className="text-[#6B5A52]" aria-hidden="true" />
                      Ubah kata sandi
                    </button>
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
                      className="w-full min-h-[44px] inline-flex items-center justify-center px-4 rounded-[8px] bg-[#B73F73] hover:bg-[#A13464] text-white text-[15px] font-medium transition-colors duration-150"
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
                    Setiap hari, {OPERATING_HOURS}
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

      {/* Mobile Customer Bottom Navigation (< 768px, tidak dirender di >= 768px atau area Admin) */}
      {shouldRenderBottomNav && (
        <nav
          aria-label="Menu utama"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 w-full bg-[#FFFBF8] border-t border-[rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <div className="grid grid-cols-4 h-[62px] w-full">
            <Link
              to="/"
              onClick={handleBerandaClick}
              aria-current={isHomeActive ? "page" : undefined}
              className={`relative -mt-px flex flex-col items-center justify-center gap-1 min-h-[44px] w-full px-0.5 border-t-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset ${
                isHomeActive
                  ? "border-[#C94A83] text-[#4A2A1A]"
                  : "border-transparent text-[#6B5A52]"
              }`}
            >
              <HomeIcon
                size={22}
                strokeWidth={1.75}
                aria-hidden="true"
                className={isHomeActive ? "text-[#C94A83]" : "text-[#6B5A52]"}
              />
              <span
                className={`text-[12px] leading-[15px] whitespace-nowrap ${
                  isHomeActive ? "text-[#4A2A1A] font-medium" : "text-[#6B5A52] font-normal"
                }`}
              >
                Beranda
              </span>
            </Link>

            <Link
              to="/#layanan"
              onClick={handleMenuLayananClick}
              aria-current={isLayananActive ? "page" : undefined}
              className={`relative -mt-px flex flex-col items-center justify-center gap-1 min-h-[44px] w-full px-0.5 border-t-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset ${
                isLayananActive
                  ? "border-[#C94A83] text-[#4A2A1A]"
                  : "border-transparent text-[#6B5A52]"
              }`}
            >
              <LayoutGrid
                size={22}
                strokeWidth={1.75}
                aria-hidden="true"
                className={isLayananActive ? "text-[#C94A83]" : "text-[#6B5A52]"}
              />
              <span
                className={`text-[12px] leading-[15px] whitespace-nowrap ${
                  isLayananActive ? "text-[#4A2A1A] font-medium" : "text-[#6B5A52] font-normal"
                }`}
              >
                Layanan
              </span>
            </Link>

            <Link
              to="/reservasi"
              aria-current={isBookingRoute ? "page" : undefined}
              className={`relative -mt-px flex flex-col items-center justify-center gap-1 min-h-[44px] w-full px-0.5 border-t-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset ${
                isBookingRoute
                  ? "border-[#C94A83] text-[#4A2A1A]"
                  : "border-transparent text-[#6B5A52]"
              }`}
            >
              <Calendar
                size={22}
                strokeWidth={1.75}
                aria-hidden="true"
                className={isBookingRoute ? "text-[#C94A83]" : "text-[#6B5A52]"}
              />
              <span
                className={`text-[12px] leading-[15px] whitespace-nowrap ${
                  isBookingRoute ? "text-[#4A2A1A] font-medium" : "text-[#6B5A52] font-normal"
                }`}
              >
                Reservasi
              </span>
            </Link>

            <Link
              to={isAuthenticated ? portalPath : "/auth"}
              aria-current={isAccountActive ? "page" : undefined}
              className={`relative -mt-px flex flex-col items-center justify-center gap-1 min-h-[44px] w-full px-0.5 border-t-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-inset ${
                isAccountActive
                  ? "border-[#C94A83] text-[#4A2A1A]"
                  : "border-transparent text-[#6B5A52]"
              }`}
            >
              <User
                size={22}
                strokeWidth={1.75}
                aria-hidden="true"
                className={isAccountActive ? "text-[#C94A83]" : "text-[#6B5A52]"}
              />
              <span
                className={`text-[12px] leading-[15px] whitespace-nowrap ${
                  isAccountActive ? "text-[#4A2A1A] font-medium" : "text-[#6B5A52] font-normal"
                }`}
              >
                {isAuthenticated ? portalLabel : "Masuk"}
              </span>
            </Link>
          </div>
        </nav>
      )}
      {/* Modal Ubah Kata Sandi (Desktop Profile Menu & Mobile Admin Drawer) */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}