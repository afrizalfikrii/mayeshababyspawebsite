<?php

namespace Database\Seeders;

use App\Models\Baby;
use App\Models\Reservation;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder 6 Skenario Pengujian Sistem Rekomendasi (Content-Based Filtering)
 *
 * Akun dan data ini digunakan untuk pengujian evaluasi Precision@3 di Bab IV Skripsi.
 * Setiap akun memiliki riwayat transaksi berstatus 'completed' yang murni untuk
 * menguji respons rekomendasi CBF berdasarkan profil usia, kategori, dan harga.
 */
class RecommendationScenarioSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password');

        $scenarios = [
            // ── Skenario 1: Bayi 0–12 Bulan (Relaksasi Bayi) ─────────────────
            [
                'email'        => 'skenario1@test.com',
                'name'         => 'Bunda Skenario 1 (Bayi 6 Bln)',
                'phone'        => '081200000001',
                'baby'         => [
                    'name'       => 'Baby Kenzo',
                    'birth_date' => Carbon::now()->subMonths(6)->toDateString(),
                    'age_months' => 6,
                ],
                'history_services' => ['Baby 0–1 Tahun'],
            ],

            // ── Skenario 2: Batita 1–3 Tahun (Aktivitas & Relaksasi) ─────────
            [
                'email'        => 'skenario2@test.com',
                'name'         => 'Bunda Skenario 2 (Batita 2 Thn)',
                'phone'        => '081200000002',
                'baby'         => [
                    'name'       => 'Ananda Alif',
                    'birth_date' => Carbon::now()->subMonths(24)->toDateString(),
                    'age_months' => 24,
                ],
                'history_services' => ['Baby 1–3 Tahun'],
            ],

            // ── Skenario 3: Balita 3–5 Tahun (Kids Spa & Rekreasi) ───────────
            [
                'email'        => 'skenario3@test.com',
                'name'         => 'Bunda Skenario 3 (Balita 4 Thn)',
                'phone'        => '081200000003',
                'baby'         => [
                    'name'       => 'Kakak Zara',
                    'birth_date' => Carbon::now()->subMonths(48)->toDateString(),
                    'age_months' => 48,
                ],
                'history_services' => ['Kids Spa (Massage, Mandi Busa + Bola)'],
            ],

            // ── Skenario 4: Treatment Keluhan Kesehatan Bayi ─────────────────
            [
                'email'        => 'skenario4@test.com',
                'name'         => 'Bunda Skenario 4 (Treatment Batuk)',
                'phone'        => '081200000004',
                'baby'         => [
                    'name'       => 'Baby Arka',
                    'birth_date' => Carbon::now()->subMonths(9)->toDateString(),
                    'age_months' => 9,
                ],
                'history_services' => ['Pijat Batuk Pilek'],
            ],

            // ── Skenario 5: Mom Treatment (Perawatan Ibu Menyusui / Nifas) ───
            [
                'email'        => 'skenario5@test.com',
                'name'         => 'Bunda Skenario 5 (Mom Treatment)',
                'phone'        => '081200000005',
                'baby'         => null, // Layanan ibu dewasa, tidak memerlukan profil bayi
                'history_services' => ['Pijat Laktasi'],
            ],

            // ── Skenario 6: Kombinasi Spa Rutin + Terapi Tumbuh Kembang ─────
            [
                'email'        => 'skenario6@test.com',
                'name'         => 'Bunda Skenario 6 (Kombinasi Spa & Terapi)',
                'phone'        => '081200000006',
                'baby'         => [
                    'name'       => 'Baby Rayyan',
                    'birth_date' => Carbon::now()->subMonths(10)->toDateString(),
                    'age_months' => 10,
                ],
                'history_services' => ['Baby 0–1 Tahun', 'Pijat Nafsu Makan'],
            ],
        ];

        foreach ($scenarios as $idx => $sc) {
            $user = User::updateOrCreate(
                ['email' => $sc['email']],
                [
                    'name'         => $sc['name'],
                    'password'     => $password,
                    'phone_number' => $sc['phone'],
                    'role'         => 'customer',
                    'address'      => 'Jl. Uji Coba Mayesha No. ' . ($idx + 1),
                ]
            );

            // Bersihkan data reservasi dan bayi lama untuk akun ini agar selalu konsisten
            $user->reservations()->delete();
            $user->babies()->delete();

            $baby = null;
            if ($sc['baby']) {
                $baby = Baby::create([
                    'user_id'    => $user->id,
                    'name'       => $sc['baby']['name'],
                    'birth_date' => $sc['baby']['birth_date'],
                    'notes'      => 'Profil anak untuk skenario ' . ($idx + 1),
                ]);
            }

            // Buat riwayat reservasi berstatus 'completed'
            foreach ($sc['history_services'] as $hIndex => $serviceName) {
                $service = Service::where('name', $serviceName)->first();

                if (! $service) {
                    $this->command?->warn("Layanan '{$serviceName}' tidak ditemukan. Lewati.");
                    continue;
                }

                Reservation::create([
                    'booking_code'     => sprintf('TEST-SKEN-%d-%d', $idx + 1, $hIndex + 1),
                    'user_id'          => $user->id,
                    'service_id'       => $service->id,
                    'reservation_date' => Carbon::now()->subDays(10 - $hIndex)->toDateString(),
                    'start_time'       => '09:00:00',
                    'end_time'         => '10:00:00',
                    'total_price'      => $service->price,
                    'status'           => Reservation::STATUS_COMPLETED,
                    'baby_name'        => $baby ? $baby->name : $user->name,
                    'baby_age'         => $sc['baby'] ? $sc['baby']['age_months'] : null,
                    'baby_id'          => $baby?->id,
                    'delivery_address' => $user->address,
                    'notes'            => 'Riwayat pengujian skenario ' . ($idx + 1),
                ]);
            }

            $this->command?->info("✓ Akun {$sc['email']} berhasil disiapkan.");
        }
    }
}
