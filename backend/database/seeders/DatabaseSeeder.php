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
        // ── Admin User (ambil kredensial dari .env agar tidak hardcode di Git) ──
        $adminEmail    = env('ADMIN_EMAIL', 'admin@babyspa.com');
        $adminName     = env('ADMIN_NAME', 'Admin Baby Spa');
        $adminPhone    = env('ADMIN_PHONE', '08123456789');
        $adminPassword = env('ADMIN_PASSWORD');

        if (! $adminPassword && ! app()->isProduction()) {
            $adminPassword = 'password';
        }

        if ($adminPassword) {
            User::firstOrCreate(
                ['email' => $adminEmail],
                [
                    'name'         => $adminName,
                    'password'     => Hash::make($adminPassword),
                    'phone_number' => $adminPhone,
                    'role'         => 'admin',
                ]
            );
        } else {
            $this->command?->warn(
                'Melewati pembuatan akun admin: setel ADMIN_PASSWORD di file .env terlebih dahulu pada environment production.'
            );
        }

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

        // Akun dummy & skenario pengujian CBF hanya dijalankan di non-production
        if (! app()->isProduction()) {
            User::firstOrCreate(
                ['email' => 'customer@babyspa.com'],
                [
                    'name'         => 'Sample Customer',
                    'password'     => Hash::make('password'),
                    'phone_number' => '08198765432',
                    'role'         => 'customer',
                ]
            );

            // Seed 6 akun pengujian rekomendasi CBF (Bab IV Skripsi)
            $this->call(RecommendationScenarioSeeder::class);
        }
    }
}
