<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Batasi usia maksimum layanan anak menjadi 5 tahun (60 bulan),
 * sesuai konfirmasi mitra bahwa Mayesha Baby Spa hanya melayani anak s.d. 5 tahun.
 *
 * - Layanan dengan age_max_months > 60 (dan age_min_months <= 60) → age_max_months = 60.
 * - Teks deskripsi "…–12 tahun" disesuaikan menjadi "…–5 tahun".
 * - Layanan "Anak > 5th" (age_min 61 bulan) tidak lagi relevan → dinonaktifkan
 *   (bukan dihapus, agar riwayat reservasinya tetap utuh).
 *
 * Layanan Mom Treatment (age_max_months = null) tidak terpengaruh.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Nonaktifkan layanan yang khusus untuk anak > 5 tahun
        DB::table('services')
            ->where('age_min_months', '>', 60)
            ->whereNotNull('age_max_months')
            ->update(['is_active' => false]);

        // 2. Batasi usia maksimum menjadi 60 bulan
        DB::table('services')
            ->where('age_max_months', '>', 60)
            ->where('age_min_months', '<=', 60)
            ->update(['age_max_months' => 60]);

        // 3. Sesuaikan teks deskripsi
        foreach (['0', '1', '3'] as $min) {
            DB::table('services')
                ->where('description', 'like', "%{$min}–12 tahun%")
                ->update([
                    'description' => DB::raw("REPLACE(description, '{$min}–12 tahun', '{$min}–5 tahun')"),
                ]);
        }
    }

    public function down(): void
    {
        // Perubahan batas usia & deskripsi bersifat data bisnis dan tidak dikembalikan
        // secara otomatis. Hanya aktifkan kembali layanan yang dinonaktifkan.
        DB::table('services')->where('name', 'Anak > 5th')->update(['is_active' => true]);
    }
};
