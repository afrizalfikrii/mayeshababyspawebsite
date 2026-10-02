<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * - Tambah kolom `address` di tabel users (alamat rumah pelanggan, disimpan permanen)
     * - Tambah kolom `delivery_address` di tabel reservations (alamat per booking, bisa beda)
     */
    public function up(): void
    {
        // Alamat profil pelanggan
        Schema::table('users', function (Blueprint $table) {
            $table->text('address')->nullable()->after('phone_number');
        });

        // Alamat pengiriman/home visit per reservasi
        Schema::table('reservations', function (Blueprint $table) {
            $table->text('delivery_address')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('address');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('delivery_address');
        });
    }
};
