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

        // ── Services ─────────────────────────────────────────────────────────
        $services = [
            [
                'name'             => 'Baby Spa Classic',
                'description'      => 'Paket spa bayi klasik meliputi mandi bunga, pijat bayi lembut, dan refleksi kaki. Cocok untuk bayi usia 1-12 bulan.',
                'duration_minutes' => 60,
                'price'            => 150000.00,
                'is_active'        => true,
            ],
            [
                'name'             => 'Baby Spa Premium',
                'description'      => 'Paket lengkap meliputi mandi susu, aromaterapi, pijat seluruh tubuh, dan sesi renang bayi. Cocok untuk bayi usia 3-18 bulan.',
                'duration_minutes' => 90,
                'price'            => 250000.00,
                'is_active'        => true,
            ],
            [
                'name'             => 'Baby Swim Only',
                'description'      => 'Sesi renang bayi dengan instruktur berpengalaman menggunakan kolam higienis bersuhu ideal. Durasi 30 menit.',
                'duration_minutes' => 30,
                'price'            => 80000.00,
                'is_active'        => true,
            ],
            [
                'name'             => 'Baby Massage Only',
                'description'      => 'Pijat bayi menggunakan minyak alami pilihan dengan teknik pijat yang menstimulasi perkembangan motorik bayi.',
                'duration_minutes' => 45,
                'price'            => 100000.00,
                'is_active'        => true,
            ],
        ];

        foreach ($services as $service) {
            Service::firstOrCreate(['name' => $service['name']], $service);
        }

        // Seed 32 layanan aktual Mayesha Baby Spa (dengan kolom CBF)
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
    }
}
