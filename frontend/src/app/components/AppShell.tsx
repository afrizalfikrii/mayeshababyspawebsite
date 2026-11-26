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
  const portalLabel = isAdmin ? "Admin Area" : "Akun Saya";

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
    `py-1 text-[15px] font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer border-b-2 ${
      active
        ? "text-[var(--text)] border-[var(--text)]"
        : "text-[var(--text-muted)] border-transparent hover:text-[var(--text)]"
    }`;

  const isHomeActive = activeSection === "beranda";
  const isGaleriActive = activeSection === "galeri";
  const isLayananActive = activeSection === "layanan";
  const isBookingActive = location.pathname === "/reservasi";

  return (
    <div className={`flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)] ${isAdminRoute ? "admin-theme" : ""}`}>
      {!isAuthPage && (
        <header className="sticky top-0 z-50 w-full bg-[#FFFFFF] border-b border-[var(--border)] print:hidden">
          <div
            className={`max-w-7xl mx-auto px-6 flex items-center justify-between gap-6 ${isAdminRoute ? "h-14" : "h-[72px]"
              }`}
          >
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <BrandLogo onClick={handleBerandaClick} />
              {isAdminRoute && (
                <span className="overline-label pl-3 border-l border-[var(--border)] self-center">
                  ADMIN
                </span>
              )}
            </div>

            {/* Center Links (hanya navigasi situs) */}
            <nav className="hidden lg:flex items-center gap-7">
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

            {/* Right Actions */}
            <div className="hidden lg:flex items-center gap-4 shrink-0">
              {isAuthenticated ? (
                <>
                  {!isAdmin && (
                    <Link to="/reservasi" className="btn-primary whitespace-nowrap">
                      Reservasi
                    </Link>
                  )}
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={isProfileOpen}
                      className="flex items-center gap-2.5 h-10 pl-1.5 pr-3 rounded-[8px] border border-[var(--border)] bg-[#FFFFFF] hover:bg-[var(--fill-subtle)] transition-colors duration-150 cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-[var(--fill-subtle)] border border-[var(--border)] flex items-center justify-center text-[13px] font-semibold text-[var(--text)]">
                        {initial}
                      </span>
                      <span className="text-[14px] font-medium text-[var(--text)] max-w-[120px] truncate">
                        {firstName}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-[var(--text-muted)] transition-transform duration-150 ${isProfileOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {isProfileOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-[calc(100%+8px)] w-64 bg-[#FFFFFF] border border-[var(--border)] rounded-[12px] p-2 z-50"
                      >
                        <div className="px-3 py-2.5 border-b border-[var(--border)] mb-2">
                          <p className="text-[14px] font-semibold text-[var(--text)] truncate">{displayName}</p>
                          {user?.email && (
                            <p className="text-[12px] text-[var(--text-muted)] truncate">{user.email}</p>
                          )}
                        </div>

                        <Link
                          to={portalPath}
                          role="menuitem"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 h-10 rounded-[8px] text-[14px] font-medium text-[var(--text)] hover:bg-[var(--fill-subtle)] transition-colors duration-150"
                        >
                          <User size={16} className="text-[var(--text-muted)]" />
                          {portalLabel}
                        </Link>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }}
                          className="btn-secondary-sm !h-10 w-full mt-1.5"
                        >
                          <LogOut size={15} className="text-[var(--text-muted)]" />
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
                    className="text-[15px] font-medium text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap"
                  >
                    Masuk
                  </Link>
                  <Link to="/reservasi" className="btn-primary whitespace-nowrap">
                    Reservasi
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="lg:hidden p-2 text-[var(--text)] hover:bg-[var(--fill-subtle)] rounded-[8px] transition-colors duration-150 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Buka menu navigasi"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Nav */}
          {isMenuOpen && (
            <div className="lg:hidden bg-[#FFFFFF] border-t border-[var(--border)] px-6 py-4 flex flex-col gap-1">
              <Link
                to="/"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleBerandaClick(e);
                }}
                className={`py-2.5 text-[15px] font-medium border-b border-[var(--border)] transition-colors duration-150 ${
                  isHomeActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text)]"
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
                className={`py-2.5 text-[15px] font-medium border-b border-[var(--border)] transition-colors duration-150 ${
                  isGaleriActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text)]"
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
                className={`py-2.5 text-[15px] font-medium border-b border-[var(--border)] transition-colors duration-150 ${
                  isLayananActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text)]"
                }`}
              >
                Menu layanan
              </Link>
              {isAuthenticated ? (
                <div className="pt-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5 pb-1">
                    <span className="w-8 h-8 rounded-full bg-[var(--fill-subtle)] border border-[var(--border)] flex items-center justify-center text-[13px] font-semibold text-[var(--text)]">
                      {initial}
                    </span>
                    <span className="text-[14px] font-semibold text-[var(--text)] truncate">{displayName}</span>
                  </div>
                  {!isAdmin && (
                    <Link
                      to="/reservasi"
                      className="btn-primary w-full"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Reservasi Sesi
                    </Link>
                  )}
                  <Link
                    to={portalPath}
                    className="btn-secondary w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {portalLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn-secondary w-full"
                  >
                    <LogOut size={16} className="text-[var(--text-muted)]" />
                    Keluar
                  </button>
                </div>
              ) : (
                <div className="pt-3 flex flex-col gap-2.5">
                  <Link
                    to="/auth"
                    className="btn-secondary w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/reservasi"
                    className="btn-primary w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Reservasi Sesi
                  </Link>
                </div>
              )}
            </div>
          )}
        </header>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      {!isAuthPage && (
        <footer id="location" className="bg-[#FFFFFF] border-t border-[var(--border)] mt-20 print:hidden">
          <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12">
              {/* Column 1: Brand & Social */}
              <div className="space-y-4">
                <BrandLogo />
                <p className="text-[14px] leading-[22px] text-[var(--text-muted)]">
                  Layanan pijat dan perawatan ibu, bayi, serta anak yang ditangani oleh bidan tersertifikasi di Karanganyar.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <a
                    href="https://www.instagram.com/mayeshababyspa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
                    title="Instagram @mayeshababyspa"
                    aria-label="Instagram @mayeshababyspa"
                  >
                    <Instagram size={18} />
                  </a>
                  <a
                    href="https://wa.me/6281325641896"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
                    title="WhatsApp Mayesha Baby Spa"
                    aria-label="WhatsApp Mayesha Baby Spa"
                  >
                    <MessageCircle size={18} />
                  </a>
                </div>
              </div>

              {/* Column 2: Kontak & Lokasi */}
              <div>
                <h4 className="text-[14px] font-semibold text-[var(--text)] mb-4">Kontak &amp; Lokasi</h4>
                <div className="space-y-3.5 text-[14px] leading-[22px] text-[var(--text-muted)]">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-[var(--text-muted)] shrink-0 mt-1" />
                    <span>
                      Jl. Musi Tegalwinangun Rt 02 Rw 13 Tegalgede, Kec. Karanganyar, Kab. Karanganyar (Barat Pasar Bejen)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={16} className="text-[var(--text-muted)] shrink-0" />
                    <a
                      href="https://wa.me/6281325641896"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tabular-nums text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150"
                    >
                      +62 813-2564-1896
                    </a>
                  </div>
                  <div className="pt-1">
                    <a
                      href="https://maps.app.goo.gl/wFPszoLPwrqvPav46"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary-sm"
                    >
                      <MapPin size={14} className="text-[var(--text-muted)]" />
                      Buka di Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Column 3: Jam Operasional */}
              <div>
                <h4 className="text-[14px] font-semibold text-[var(--text)] mb-4">Jam Operasional</h4>
                <div className="space-y-2 text-[14px] leading-[22px]">
                  <p className="text-[var(--text)] font-medium tabular-nums">
                    Setiap hari, 08.30–16.30 WIB
                  </p>
                  <p className="text-[13px] leading-[20px] text-[var(--text-muted)]">
                    Tersedia layanan di studio maupun kunjungan ke rumah (Home Care).
                  </p>
                </div>
              </div>

              {/* Column 4: Akses Cepat */}
              <div>
                <h4 className="text-[14px] font-semibold text-[var(--text)] mb-4">Akses Cepat</h4>
                <ul className="space-y-2.5 text-[14px]">
                  <li>
                    <button
                      type="button"
                      onClick={handleGaleriClick}
                      className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150 text-left cursor-pointer"
                    >
                      Galeri &amp; Fasilitas
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleMenuLayananClick}
                      className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150 text-left cursor-pointer"
                    >
                      Menu layanan
                    </button>
                  </li>
                  {!isAdmin && (
                    <li>
                      <Link
                        to="/reservasi"
                        className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150"
                      >
                        Booking Layanan
                      </Link>
                    </li>
                  )}
                  {isAuthenticated ? (
                    <li>
                      <Link
                        to={portalPath}
                        className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150"
                      >
                        {portalLabel}
                      </Link>
                    </li>
                  ) : (
                    <li>
                      <Link
                        to="/auth"
                        className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors duration-150"
                      >
                        Masuk / Daftar Akun
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-3 text-[13px] text-[var(--text-muted)]">
              <p className="tabular-nums">&copy; {new Date().getFullYear()} Mayesha Mom, Kids &amp; Baby Spa.</p>
              <p>Bidan Tersertifikasi • Karanganyar</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}