<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ── Admin User ───────────────────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'admin@babyspa.com'],
            [
                'name'         => 'Admin Baby Spa',
                'password'     => Hash::make('password'),
                'phone_number' => '08123456789',
                'role'         => 'admin',
            ]
        );

        // ── Sample Customer ──────────────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'customer@babyspa.com'],
            [
                'name'         => 'Sample Customer',
                'password'     => Hash::make('password'),
                'phone_number' => '08198765432',
                'role'         => 'customer',
            ]
        );

        // ── Seed 32 Layanan Resmi Mayesha Baby Spa (sesuai brosur Our Treatment) ──
        $this->call(ServiceSeeder::class);

        // ── Therapists ────────────────────────────────────────────────────────
        $therapists = [
            ['name' => 'Terapis Susi'],
            ['name' => 'Terapis Rini'],
            ['name' => 'Terapis Mega'],
        ];

        foreach ($therapists as $therapist) {
            \App\Models\Therapist::firstOrCreate(['name' => $therapist['name']], $therapist);
        }

        // Seed 6 akun pengujian rekomendasi CBF (Bab IV Skripsi)
        $this->call(RecommendationScenarioSeeder::class);
    }
}
