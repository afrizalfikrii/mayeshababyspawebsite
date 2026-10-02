<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('babies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->date('birth_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Add baby_id foreign key to reservations table
        Schema::table('reservations', function (Blueprint $table) {
            $table->foreignId('baby_id')->nullable()->after('notes')->constrained('babies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropForeign(['baby_id']);
            $table->dropColumn('baby_id');
        });

        Schema::dropIfExists('babies');
    }
};
