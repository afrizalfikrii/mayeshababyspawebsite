import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Baby, LogIn, LogOut, Menu, X, LayoutDashboard, MapPin, Phone, Instagram, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const isAdmin = user?.role === "admin";

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
    if (location.pathname === "/") {
      const element = document.getElementById("layanan");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById("layanan");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const handleGaleriClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      const element = document.getElementById("galeri");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById("galeri");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const handleBerandaClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 print:hidden">
          <div className="max-w-6xl mx-auto glass-panel px-4 sm:px-6 py-3 flex items-center justify-between gap-4 rounded-full">
            <Link to="/" onClick={handleBerandaClick} className="flex items-center gap-2 group shrink-0">
              <img
                src="/logo.png"
                alt="Mayesha Baby Spa Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-full group-hover:scale-110 transition-transform shrink-0"
              />
              <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight whitespace-nowrap">
                Mayesha<span className="text-pink-500"> Baby Spa</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              <Link
                to="/"
                onClick={handleBerandaClick}
                className="text-slate-600 hover:text-pink-500 font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                Beranda
              </Link>
              <Link
                to="/#galeri"
                onClick={handleGaleriClick}
                className="text-slate-600 hover:text-pink-500 font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                Galeri
              </Link>
              <Link
                to="/#layanan"
                onClick={handleMenuLayananClick}
                className="text-slate-600 hover:text-pink-500 font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                Menu Layanan
              </Link>
              {!isAdmin && (
                <Link to="/reservasi" className="text-slate-600 hover:text-pink-500 font-medium transition-colors whitespace-nowrap">
                  Booking
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to={isAdmin ? "/admin" : "/dashboard"}
                  className="text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <LayoutDashboard size={16} />
                  {isAdmin ? "Admin Area" : "Ruang Bunda"}
                </Link>
              )}
            </nav>

            <div className="hidden lg:flex items-center gap-4 shrink-0">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-red-500 font-medium flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <LogOut size={18} /> Keluar
                </button>
              ) : (
                <>
                  <Link to="/auth" className="text-slate-600 hover:text-pink-500 font-medium flex items-center gap-2 whitespace-nowrap">
                    <LogIn size={18} /> Masuk
                  </Link>
                  <Link to="/reservasi" className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap">
                    Yuk, Booking!
                  </Link>
                </>
              )}
            </div>

            {/* Mobile & Tablet Toggle */}
            <button
              className="lg:hidden p-1.5 text-slate-600 hover:text-pink-500 transition-colors cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile & Tablet Nav */}
          {isMenuOpen && (
            <div className="lg:hidden absolute top-20 left-4 right-4 max-w-6xl mx-auto glass-panel p-4 flex flex-col gap-2 shadow-xl animate-in fade-in slide-in-from-top-4">
              <Link
                to="/"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleBerandaClick(e);
                }}
                className="p-2 text-slate-700 font-medium cursor-pointer"
              >
                Beranda
              </Link>
              <Link
                to="/#galeri"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleGaleriClick(e);
                }}
                className="p-2 text-slate-700 font-medium cursor-pointer"
              >
                Galeri
              </Link>
              <Link
                to="/#layanan"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleMenuLayananClick(e);
                }}
                className="p-2 text-slate-700 font-medium cursor-pointer"
              >
                Menu Layanan
              </Link>
              {!isAdmin && (
                <Link to="/reservasi" className="p-2 text-slate-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                  Booking
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to={isAdmin ? "/admin" : "/dashboard"}
                  className="p-2 text-pink-600 font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {isAdmin ? "Admin Area" : "Ruang Bunda"}
                </Link>
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
                <Link to="/auth" className="p-2 text-slate-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                  Masuk / Daftar
                </Link>
              )}
            </div>
          )}
        </header>
      )}

      <main className={"flex-1 " + (!isAuthPage ? "pt-24" : "")}>
        <Outlet />
      </main>

      {!isAuthPage && (
        <footer id="location" className="bg-white/80 backdrop-blur-md border-t border-slate-200 mt-20 print:hidden">
          <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
              {/* Brand & Socials */}
              <div className="space-y-4">
                <Link to="/" className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Mayesha Spa Logo"
                    className="w-10 h-10 rounded-full object-cover shadow-sm"
                  />
                  <span className="font-bold text-xl text-slate-800">
                    Mayesha <span className="text-pink-500">Baby Spa</span>
                  </span>
                </Link>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Solusi kesehatan dan relaksasi keluarga. Kami menggabungkan perawatan modern dengan sentuhan kasih sayang.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href="https://www.instagram.com/mayeshababyspa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all shadow-sm"
                    title="Instagram @mayeshababyspa"
                  >
                    <Instagram size={18} />
                  </a>
                  <a
                    href="https://wa.me/6281325641896"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                    title="Chat WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </a>
                </div>
              </div>

              {/* Kontak & Lokasi */}
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-4">Kontak & Lokasi</h4>
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={18} className="text-pink-500 shrink-0 mt-0.5" />
                    <span>Jl. Musi Tegalwinangun Rt 02 Rw 13 Tegalgede, Kec. Karanganyar, Kab. Karanganyar (Barat Pasar Bejen)</span>
                  </div>
                  <div>
                    <a
                      href="https://maps.app.goo.gl/wFPszoLPwrqvPav46"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-pink-500 text-white text-xs font-bold rounded-full hover:bg-pink-600 transition-all shadow-sm"
                    >
                      <MapPin size={13} /> Buka di Maps
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Phone size={18} className="text-pink-500 shrink-0" />
                    <a
                      href="https://wa.me/6281325641896"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-700 hover:text-pink-500 transition-colors"
                    >
                      +62 813-2564-1896
                    </a>
                  </div>
                </div>
              </div>

              {/* Jam Operasional */}
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-4">Jam Operasional</h4>
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Senin - Minggu</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      BUKA
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    08.30 - 16.30 <span className="text-xs font-semibold text-slate-500">WIB</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-1">
                    Tersedia layanan di Studio &amp; Home Care langsung ke rumah Bunda.
                  </p>
                </div>
              </div>

              {/* Akses Cepat */}
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-4">Akses Cepat</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <button
                      onClick={handleGaleriClick}
                      className="text-slate-600 hover:text-pink-500 transition-colors text-left"
                    >
                      Galeri &amp; Fasilitas
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleMenuLayananClick}
                      className="text-slate-600 hover:text-pink-500 transition-colors text-left"
                    >
                      Pilihan Perawatan
                    </button>
                  </li>
                  {!isAdmin && (
                    <li>
                      <Link to="/reservasi" className="text-slate-600 hover:text-pink-500 transition-colors">
                        Booking Layanan
                      </Link>
                    </li>
                  )}
                  {isAuthenticated ? (
                    <li>
                      <Link
                        to={isAdmin ? "/admin" : "/dashboard"}
                        className="text-slate-600 hover:text-pink-500 transition-colors"
                      >
                        {isAdmin ? "Dashboard Admin" : "Ruang Bunda"}
                      </Link>
                    </li>
                  ) : (
                    <li>
                      <Link to="/auth" className="text-slate-600 hover:text-pink-500 transition-colors">
                        Masuk / Daftar Akun
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
              <p>© {new Date().getFullYear()} Mayesha Baby Spa. All rights reserved.</p>
              <div className="flex gap-4">
                <span className="text-slate-400">Certified Bidan &amp; Professional Baby Care</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}