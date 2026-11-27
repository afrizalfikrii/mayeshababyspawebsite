import { Link } from "react-router";

export default function PaymentSuccess() {
  return (
    <div className="min-h-[75dvh] flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-white border border-black/10 rounded-[12px] max-w-md w-full p-6 sm:p-8">
        <span className="text-[13px] font-semibold text-[var(--accent)] block mb-3">
          Dikonfirmasi
        </span>

        <h1 className="text-[30px] leading-[38px] font-editorial text-[var(--text)] mb-2">
          Pembayaran Diterima
        </h1>

        <p className="text-[15px] leading-[24px] text-[var(--text-muted)] mb-6">
          Reservasi sesi perawatan telah tercatat. Silakan datang ke studio atau menunggu kedatangan terapis sesuai jadwal yang dipilih.
        </p>

        <div className="border-t border-b border-[var(--border)] divide-y divide-[var(--border)] mb-6 text-[14px]">
          <div className="py-3 flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Kode Reservasi</span>
            <span className="booking-code font-medium text-[var(--text)]">R-10293</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Total Pembayaran</span>
            <span className="font-semibold text-[var(--accent)] tabular-nums">Rp 120.000</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Jadwal Sesi</span>
            <span className="font-medium text-[var(--text)] tabular-nums">15 Jun 2026</span>
          </div>
        </div>

        <Link to="/dashboard" className="btn-primary w-full">
          Buka Akun Saya
        </Link>
      </div>
    </div>
  );
}