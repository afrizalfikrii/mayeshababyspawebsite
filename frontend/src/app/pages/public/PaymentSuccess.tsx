import { Link } from "react-router";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

export default function PaymentSuccess() {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F472B6', '#FBCFE8', '#38BDF8', '#60A5FA']
    });
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle2 size={48} />
      </motion.div>
      
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-[#3A2622] mb-2"
      >
        Hore! Pembayaran Berhasil!
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[#6E5D58] max-w-md mx-auto mb-8"
      >
        Makasih Bunda! Booking sesi untuk si Kecil udah terkonfirmasi. Terapis kami nggak sabar buat main bareng!
      </motion.p>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-panel p-6 max-w-md w-full mb-8 text-left"
      >
        <div className="flex items-center justify-between border-b border-[#E8DFD8] pb-3 mb-3">
          <span className="text-[#6E5D58]">ID Sesi</span>
          <span className="font-bold text-[#3A2622]">R-10293</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#E8DFD8] pb-3 mb-3">
          <span className="text-[#6E5D58]">Total Harga</span>
          <span className="font-bold text-[#BE346E]">Rp 120.000</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#6E5D58]">Jadwal</span>
          <span className="font-medium text-[#3A2622] flex items-center gap-1">
            <Calendar size={14} className="text-[#BE346E]" /> 15 Jun 2026
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Link to="/dashboard" className="btn-primary flex items-center gap-2 inline-flex">
          Kembali ke Ruang Bunda <ArrowRight size={18} />
        </Link>
      </motion.div>
    </div>
  );
}