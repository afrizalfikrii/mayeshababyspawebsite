<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom untuk fitur Content-Based Filtering (CBF):
     * - category       : kategori layanan (one-hot encoding)
     * - age_min_months : batas usia minimum dalam bulan
     * - age_max_months : batas usia maksimum dalam bulan (null = dewasa/tak terbatas)
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Kategori layanan: baby_and_kids | baby_kids_treatment | mom_treatment
            $table->string('category')->default('baby_and_kids')->after('is_active');

            // Rentang usia target dalam bulan (untuk normalisasi fitur)
            // Contoh: 0–1 tahun = 0–12 bulan, dewasa = null
            $table->unsignedSmallInteger('age_min_months')->default(0)->after('category');
            $table->unsignedSmallInteger('age_max_months')->nullable()->after('age_min_months');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['category', 'age_min_months', 'age_max_months']);
        });
    }
};
