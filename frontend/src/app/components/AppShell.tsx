import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { LogIn, LogOut, Menu, X, LayoutDashboard, MapPin, Phone, Instagram, MessageCircle, ChevronDown, Calendar, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ChangePasswordModal from "./ChangePasswordModal";

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeHomeSection, setActiveHomeSection] = useState<"beranda" | "galeri" | "layanan">("beranda");
  const scrollLockUntilRef = useRef<number>(0);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const isAdmin = user?.role === "admin";

  const userInitials = (user?.name || "MB")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // Close dropdown & mobile drawer on route change
  useEffect(() => {
    setIsAccountMenuOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Close account dropdown on outside click or Escape
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  // Track active Home section reliably without jumping during smooth scroll
  useEffect(() => {
    if (location.pathname !== "/") return;

    const updateActiveSectionFromScroll = () => {
      if (Date.now() < scrollLockUntilRef.current) return;
      const scrollPos = window.scrollY + 140;
      const layananEl = document.getElementById("layanan");
      const galeriEl = document.getElementById("galeri");

      if (layananEl && scrollPos >= layananEl.offsetTop) {
        setActiveHomeSection("layanan");
      } else if (galeriEl && scrollPos >= galeriEl.offsetTop) {
        setActiveHomeSection("galeri");
      } else {
        setActiveHomeSection("beranda");
      }
    };

    window.addEventListener("scroll", updateActiveSectionFromScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSectionFromScroll);
  }, [location.pathname]);

  const scrollToSection = (sectionId: "galeri" | "layanan") => {
    scrollLockUntilRef.current = Date.now() + 800;
    setActiveHomeSection(sectionId);
    setIsMenuOpen(false);

    const attemptScroll = (triesLeft = 8) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (triesLeft > 0) {
        setTimeout(() => attemptScroll(triesLeft - 1), 80);
      }
    };

    if (location.pathname === "/") {
      attemptScroll(2);
    } else {
      navigate(`/#${sectionId}`);
      setTimeout(() => attemptScroll(10), 60);
    }
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
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
    scrollToSection("layanan");
  };

  const handleGaleriClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection("galeri");
  };

  const handleBerandaClick = (e: React.MouseEvent) => {
    scrollLockUntilRef.current = Date.now() + 700;
    setActiveHomeSection("beranda");
    setIsMenuOpen(false);
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E8DFD8] print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
            <Link to="/" onClick={handleBerandaClick} className="flex items-center gap-2.5 group shrink-0">
              <img
                src="/logo.png"
                alt="Mayesha Mom, Kids & Baby Spa Logo"
                className="w-10 h-10 object-contain rounded-full shrink-0"
              />
              <div className="leading-tight">
                <span className="font-editorial italic font-semibold text-lg sm:text-xl text-[#BE346E] tracking-tight block">
                  Mayesha
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#3A2622] tracking-wide block -mt-0.5 whitespace-nowrap">
                  Mom, Kids &amp; Baby Spa
                </span>
              </div>
            </Link>

            {/* Desktop Nav — Public Pages Only */}
            <nav className="hidden lg:flex items-center gap-7 text-[14px]">
              <Link
                to="/"
                onClick={handleBerandaClick}
                className={`font-medium transition-colors cursor-pointer whitespace-nowrap py-1 border-b-2 ${location.pathname === "/" && activeHomeSection === "beranda"
                  ? "border-[#BE346E] text-[#BE346E]"
                  : "border-transparent text-[#6E5D58] hover:text-[#3A2622]"
                  }`}
              >
                Beranda
              </Link>
              <Link
                to="/#galeri"
                onClick={handleGaleriClick}
                className={`font-medium transition-colors cursor-pointer whitespace-nowrap py-1 border-b-2 ${location.pathname === "/" && activeHomeSection === "galeri"
                  ? "border-[#BE346E] text-[#BE346E]"
                  : "border-transparent text-[#6E5D58] hover:text-[#3A2622]"
                  }`}
              >
                Galeri
              </Link>
              <Link
                to="/#layanan"
                onClick={handleMenuLayananClick}
                className={`font-medium transition-colors cursor-pointer whitespace-nowrap py-1 border-b-2 ${location.pathname === "/" && activeHomeSection === "layanan"
                  ? "border-[#BE346E] text-[#BE346E]"
                  : "border-transparent text-[#6E5D58] hover:text-[#3A2622]"
                  }`}
              >
                Menu Layanan
              </Link>
              {!isAdmin && (
                <Link
                  to="/reservasi"
                  className={`border-b-2 font-medium transition-colors whitespace-nowrap py-1 ${location.pathname.startsWith("/reservasi")
                    ? "border-[#BE346E] text-[#BE346E]"
                    : "border-transparent text-[#6E5D58] hover:text-[#3A2622]"
                    }`}
                >
                  Booking
                </Link>
              )}
            </nav>

            {/* Desktop Right — Account Pill Dropdown & Primary CTA */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {isAuthenticated ? (
                <>
                  {!isAdmin && (
                    <Link to="/reservasi" className="btn-primary !min-h-[40px] !px-4 text-sm whitespace-nowrap">
                      Reservasi
                    </Link>
                  )}

                  <div className="relative" ref={accountMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                      aria-expanded={isAccountMenuOpen}
                      aria-haspopup="menu"
                      className={`inline-flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border transition-colors cursor-pointer bg-white ${location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/admin")
                        ? "border-[#BE346E] text-[#3A2622]"
                        : "border-[#E8DFD8] hover:border-[#D7C9BE] text-[#3A2622]"
                        }`}
                    >
                      <span className="w-8 h-8 rounded-full bg-[#F9EBEF] text-[#BE346E] font-bold text-xs inline-flex items-center justify-center shrink-0">
                        {userInitials}
                      </span>
                      <span className="text-left leading-tight">
                        <span className="text-xs font-semibold text-[#3A2622] block max-w-[110px] truncate">
                          {user?.name?.split(" ")[0] || (isAdmin ? "Admin" : "Bunda")}
                        </span>
                        <span className="text-[10px] font-medium text-[#BE346E] block">
                          {isAdmin ? "Admin Area" : "Ruang Bunda"}
                        </span>
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-[#6E5D58] transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isAccountMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-56 bg-white border border-[#E8DFD8] rounded-2xl shadow-lg py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-[#E8DFD8] mb-1">
                          <p className="text-xs font-bold text-[#3A2622] truncate">{user?.name}</p>
                          <p className="text-[11px] text-[#6E5D58] truncate">{user?.email}</p>
                        </div>

                        <Link
                          to={isAdmin ? "/admin" : "/dashboard"}
                          role="menuitem"
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-[#3A2622] hover:bg-[#FAF7F2] hover:text-[#BE346E] transition-colors"
                        >
                          <LayoutDashboard size={15} className="text-[#BE346E]" />
                          {isAdmin ? "Admin Area" : "Ruang Bunda"}
                        </Link>

                        {!isAdmin && (
                          <Link
                            to="/reservasi"
                            role="menuitem"
                            onClick={() => setIsAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-[#3A2622] hover:bg-[#FAF7F2] hover:text-[#BE346E] transition-colors"
                          >
                            <Calendar size={15} className="text-[#6E5D58]" />
                            Reservasi
                          </Link>
                        )}

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            setIsChangePasswordOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-[#3A2622] hover:bg-[#FAF7F2] hover:text-[#BE346E] transition-colors cursor-pointer text-left"
                        >
                          <KeyRound size={15} className="text-[#6E5D58]" />
                          Ubah Kata Sandi
                        </button>

                        <div className="border-t border-[#E8DFD8] my-1.5" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                        >
                          <LogOut size={15} />
                          Keluar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="text-[#3A2622] hover:text-[#BE346E] text-sm font-medium flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5"
                  >
                    <LogIn size={16} /> Masuk
                  </Link>
                  <Link to="/reservasi" className="btn-primary !min-h-[40px] !px-5 text-sm whitespace-nowrap">
                    Reservasi
                  </Link>
                </>
              )}
            </div>

            {/* Mobile & Tablet Toggle */}
            <button
              type="button"
              className="lg:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#3A2622] hover:text-[#BE346E] hover:bg-[#F4EFE8] transition-colors cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Tutup Menu" : "Buka Menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile & Tablet Nav */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-[#E8DFD8] bg-[#FAF7F2] px-4 py-3 flex flex-col gap-1 shadow-md">
              <Link
                to="/"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleBerandaClick(e);
                }}
                className="p-2 text-[#3A2622] font-medium cursor-pointer"
              >
                Beranda
              </Link>
              <Link
                to="/#galeri"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleGaleriClick(e);
                }}
                className="p-2 text-[#3A2622] font-medium cursor-pointer"
              >
                Galeri
              </Link>
              <Link
                to="/#layanan"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleMenuLayananClick(e);
                }}
                className="p-2 text-[#3A2622] font-medium cursor-pointer"
              >
                Menu Layanan
              </Link>
              {!isAdmin && (
                <Link to="/reservasi" className="p-2 text-[#3A2622] font-medium" onClick={() => setIsMenuOpen(false)}>
                  Booking
                </Link>
              )}
              {isAuthenticated && (
                <>
                  <Link
                    to={isAdmin ? "/admin" : "/dashboard"}
                    className="p-2 text-[#BE346E] font-semibold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {isAdmin ? "Admin Area" : "Ruang Bunda"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="p-2 text-[#3A2622] font-medium text-left flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound size={17} className="text-[#6E5D58]" /> Ubah Kata Sandi
                  </button>
                </>
              )}
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="p-2 text-red-500 font-medium text-left flex items-center gap-2"
                >
                  <LogOut size={18} /> Keluar
                </button>
              ) : (
                <Link to="/auth" className="p-2 text-[#3A2622] font-medium" onClick={() => setIsMenuOpen(false)}>
                  Masuk / Daftar
                </Link>
              )}
            </div>
          )}
        </header>
      )}

      <main className={"flex-1 " + (!isAuthPage ? "pt-[76px]" : "")}>
        <Outlet />
      </main>

      {!isAuthPage && (
        <footer id="location" className="bg-[#F4EFE8] border-t border-[#E8DFD8] mt-16 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
              {/* Brand & Socials */}
              <div className="space-y-4">
                <Link to="/" className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="Mayesha Mom, Kids & Baby Spa Logo"
                    className="w-11 h-11 rounded-full object-contain shrink-0"
                  />
                  <div className="leading-tight">
                    <span className="font-editorial italic font-semibold text-xl text-[#BE346E] tracking-tight block">
                      Mayesha
                    </span>
                    <span className="text-[11px] font-semibold text-[#3A2622] tracking-wide block -mt-0.5">
                      Mom, Kids &amp; Baby Spa
                    </span>
                  </div>
                </Link>
                <p className="text-sm text-[#6E5D58] leading-relaxed">
                  Solusi kesehatan dan relaksasi keluarga di Karanganyar oleh bidan tersertifikasi dengan pendekatan penuh kasih sayang.
                </p>
                <div className="flex items-center gap-2.5 pt-1">
                  <a
                    href="https://www.instagram.com/mayeshababyspa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white border border-[#E8DFD8] text-[#BE346E] flex items-center justify-center hover:bg-[#BE346E] hover:text-white hover:border-[#BE346E] transition-colors"
                    title="Instagram @mayeshababyspa"
                    aria-label="Instagram Mayesha Baby Spa"
                  >
                    <Instagram size={17} />
                  </a>
                  <a
                    href="https://wa.me/6281325641896"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white border border-[#E8DFD8] text-[#2F6B45] flex items-center justify-center hover:bg-[#2F6B45] hover:text-white hover:border-[#2F6B45] transition-colors"
                    title="Chat WhatsApp"
                    aria-label="Chat WhatsApp Mayesha Baby Spa"
                  >
                    <MessageCircle size={17} />
                  </a>
                </div>
              </div>

              {/* Kontak & Lokasi */}
              <div>
                <h4 className="font-semibold text-[#3A2622] text-sm uppercase tracking-wider mb-4">
                  Kontak &amp; Lokasi
                </h4>
                <div className="space-y-4 text-sm text-[#6E5D58]">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={17} className="text-[#BE346E] shrink-0 mt-0.5" />
                    <span>
                      Jl. Musi Tegalwinangun Rt 02 Rw 13 Tegalgede, Kec. Karanganyar, Kab. Karanganyar (Barat Pasar Bejen)
                    </span>
                  </div>
                  <div>
                    <a
                      href="https://maps.app.goo.gl/wFPszoLPwrqvPav46"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !min-h-[38px] !py-1.5 !px-4 !text-xs"
                    >
                      <MapPin size={13} /> Buka di Maps
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Phone size={16} className="text-[#BE346E] shrink-0" />
                    <a
                      href="https://wa.me/6281325641896"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#3A2622] hover:text-[#BE346E] transition-colors tabular-nums"
                    >
                      +62 813-2564-1896
                    </a>
                  </div>
                </div>
              </div>

              {/* Jam Operasional */}
              <div>
                <h4 className="font-semibold text-[#3A2622] text-sm uppercase tracking-wider mb-4">
                  Jam Operasional
                </h4>
                <div className="p-4 rounded-2xl border bg-[#FAF7F2] border-[#E8DFD8] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#3A2622]">Senin – Minggu</span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF5F0] text-[#2F6B45]">
                      BUKA
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-[#3A2622] tracking-tight tabular-nums">
                    08.30 – 16.30 <span className="text-xs font-semibold text-[#6E5D58]">WIB</span>
                  </div>
                  <p className="text-xs text-[#6E5D58] pt-1 leading-relaxed">
                    Tersedia layanan di Studio &amp; Home Care langsung ke rumah Bunda.
                  </p>
                </div>
              </div>

              {/* Akses Cepat */}
              <div>
                <h4 className="font-semibold text-[#3A2622] text-sm uppercase tracking-wider mb-4">
                  Akses Cepat
                </h4>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={handleGaleriClick}
                      className="text-[#6E5D58] hover:text-[#BE346E] transition-colors text-left cursor-pointer"
                    >
                      Galeri &amp; Fasilitas
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleMenuLayananClick}
                      className="text-[#6E5D58] hover:text-[#BE346E] transition-colors text-left cursor-pointer"
                    >
                      Pilihan Perawatan
                    </button>
                  </li>
                  {!isAdmin && (
                    <li>
                      <Link to="/reservasi" className="text-[#6E5D58] hover:text-[#BE346E] transition-colors">
                        Booking Layanan
                      </Link>
                    </li>
                  )}
                  {isAuthenticated ? (
                    <li>
                      <Link
                        to={isAdmin ? "/admin" : "/dashboard"}
                        className="text-[#6E5D58] hover:text-[#BE346E] transition-colors"
                      >
                        {isAdmin ? "Dashboard Admin" : "Ruang Bunda"}
                      </Link>
                    </li>
                  ) : (
                    <li>
                      <Link to="/auth" className="text-[#6E5D58] hover:text-[#BE346E] transition-colors">
                        Masuk / Daftar Akun
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-[#E8DFD8] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#6E5D58]">
              <p>© {new Date().getFullYear()} Mayesha Baby Spa. Seluruh hak cipta dilindungi.</p>
              <span className="font-medium text-[#3A2622]">Bidan Tersertifikasi · Karanganyar</span>
            </div>
          </div>
        </footer>
      )}

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}