import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Baby, LogIn, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
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
          <div className="max-w-6xl mx-auto glass-panel px-6 py-3 flex items-center justify-between rounded-full">
            <Link to="/" onClick={handleBerandaClick} className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Mayesha Baby Spa Logo"
                className="w-10 h-10 object-cover rounded-full group-hover:scale-110 transition-transform"
              />
              <span className="font-bold text-xl text-slate-800 tracking-tight">
                Mayesha<span className="text-pink-500"> Baby Spa</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                onClick={handleBerandaClick}
                className="text-slate-600 hover:text-pink-500 font-medium transition-colors cursor-pointer"
              >
                Beranda
              </Link>
              <Link
                to="/#layanan"
                onClick={handleMenuLayananClick}
                className="text-slate-600 hover:text-pink-500 font-medium transition-colors cursor-pointer"
              >
                Menu Layanan
              </Link>
              {!isAdmin && (
                <Link to="/reservasi" className="text-slate-600 hover:text-pink-500 font-medium transition-colors">
                  Booking
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to={isAdmin ? "/admin" : "/dashboard"}
                  className="text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LayoutDashboard size={16} />
                  {isAdmin ? "Admin Area" : "Ruang Bunda"}
                </Link>
              )}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-red-500 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut size={18} /> Keluar
                </button>
              ) : (
                <>
                  <Link to="/auth" className="text-slate-600 hover:text-pink-500 font-medium flex items-center gap-2">
                    <LogIn size={18} /> Masuk
                  </Link>
                  <Link to="/reservasi" className="btn-primary text-sm py-2.5 px-5">
                    Yuk, Booking!
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              className="md:hidden text-slate-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Nav */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-20 left-4 right-4 glass-panel p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4">
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
        <footer className="bg-white/50 backdrop-blur-md border-t border-white mt-20 print:hidden">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <Link to="/" className="flex items-center gap-2 mb-4">
                  <img
                    src="/logo.png"
                    alt="Mayesha Baby Spa Logo"
                    className="w-8 h-8 object-cover rounded-full"
                  />
                  <span className="font-bold text-lg text-slate-800">
                    Mayesha<span className="text-pink-500"> Baby Spa</span>
                  </span>
                </Link>
                <p className="text-slate-500 mb-4 max-w-sm">
                  Pusat spa & pijat bayi modern dengan sentuhan kasih sayang. Hadir di rumah Bunda atau kunjungi studio nyaman kami.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-4">Akses Cepat</h4>
                <ul className="space-y-2">
                  {!isAdmin && (
                    <li>
                      <Link to="/reservasi" className="text-slate-500 hover:text-pink-500 transition-colors">
                        Booking Layanan
                      </Link>
                    </li>
                  )}
                  {isAuthenticated && (
                    <li>
                      <Link
                        to={isAdmin ? "/admin" : "/dashboard"}
                        className="text-slate-500 hover:text-pink-500 transition-colors"
                      >
                        {isAdmin ? "Admin Area" : "Ruang Bunda"}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-4">Hubungi Kami</h4>
                <ul className="space-y-2">
                  <li className="text-slate-500">WA: +62 812 3456 7890</li>
                  <li className="text-slate-500">Halo@mayesha.id</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-pink-100 mt-8 pt-8 text-center text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} Mayesha Mom, Kids & Baby Spa. Semua Hak Dilindungi.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}