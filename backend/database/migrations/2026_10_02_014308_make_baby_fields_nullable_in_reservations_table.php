<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make baby_name and baby_age nullable to support mom-only services
     * (category = 'mom_treatment') that do not require baby data.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('baby_name')->nullable()->change();
            $table->integer('baby_age')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('baby_name')->nullable(false)->change();
            $table->integer('baby_age')->nullable(false)->change();
        });
    }
};
