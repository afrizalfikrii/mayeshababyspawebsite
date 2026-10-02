<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds walk-in support to the reservations table:
     * - is_walkin: marks admin-created walk-in reservations
     * - guest_name: stores customer name for walk-ins (no user account needed)
     * - Makes user_id nullable so walk-in reservations can be stored without a user account
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Mark reservations created by admin for walk-in customers
            $table->boolean('is_walkin')->default(false)->after('notes');

            // Name of walk-in customer (used when user_id is null)
            $table->string('guest_name')->nullable()->after('is_walkin');

            // Make user_id nullable to support walk-in reservations without user accounts
            // Drop the foreign key first, then re-add it as nullable with nullOnDelete
            $table->dropForeign(['user_id']);
            $table->foreignId('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('is_walkin');
            $table->dropColumn('guest_name');

            // Restore user_id to non-nullable with cascade delete
            $table->dropForeign(['user_id']);
            $table->foreignId('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
