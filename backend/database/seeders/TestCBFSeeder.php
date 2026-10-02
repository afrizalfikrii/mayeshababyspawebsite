<?php

namespace Database\Seeders;

use App\Models\Reservation;
use App\Models\Service;
use App\Models\Therapist;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeder untuk simulasi alur CBF end-to-end:
 *
 * Skenario:
 * - Customer A pernah memesan "Baby Swim" (status: completed)
 *   → Sistem harusnya merekomendasikan layanan serupa:
 *     "Baby Spa (Massage, Gym, Swim)", "Kids Spa", "Bubble Bath", dll.
 *
 * - Customer B pernah memesan "Pijat Laktasi" (status: completed)
 *   → Sistem harusnya merekomendasikan layanan Mom Treatment lain:
 *     "Pijat Nifas", "Mom Spa", "Hidroterapi", dll.
 *
 * - Customer C belum punya riwayat → cold start (layanan terpopuler)
 */
class TestCBFSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin ─────────────────────────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'admin@babyspa.com'],
            [
                'name'         => 'Admin Mayesha',
                'password'     => Hash::make('password'),
                'phone_number' => '08123456789',
                'role'         => 'admin',
            ]
        );

        // ── Terapis ───────────────────────────────────────────────────────────
        $therapist = Therapist::firstOrCreate(
            ['name' => 'Terapis Susi'],
            ['is_active' => true]
        );
        Therapist::firstOrCreate(['name' => 'Terapis Rini'], ['is_active' => true]);

        // ── Customer A: pernah pesan Baby Swim ────────────────────────────────
        $customerA = User::firstOrCreate(
            ['email' => 'bunda.ani@test.com'],
            [
                'name'         => 'Bunda Ani',
                'password'     => Hash::make('password'),
                'phone_number' => '08111111111',
                'role'         => 'customer',
            ]
        );

        $babySwim = Service::where('name', 'Baby Swim')->first();
        if ($babySwim && $therapist) {
            Reservation::firstOrCreate(
                ['booking_code' => 'BSP-TEST-SWIM1'],
                [
                    'user_id'          => $customerA->id,
                    'service_id'       => $babySwim->id,
                    'therapist_id'     => $therapist->id,
                    'reservation_date' => Carbon::now()->subDays(7)->toDateString(),
                    'start_time'       => '09:00:00',
                    'end_time'         => '09:30:00',
                    'total_price'      => $babySwim->price,
                    'status'           => Reservation::STATUS_COMPLETED, // ← sudah selesai
                    'baby_name'        => 'Bayi Ani',
                    'baby_age'         => 6,
                    'notes'            => null,
                    'expires_at'       => null,
                ]
            );
        }

        $this->command->info("✅ Customer A (Bunda Ani / bunda.ani@test.com) → riwayat: Baby Swim (completed)");

        // ── Customer B: pernah pesan Pijat Laktasi ───────────────────────────
        $customerB = User::firstOrCreate(
            ['email' => 'bunda.sari@test.com'],
            [
                'name'         => 'Bunda Sari',
                'password'     => Hash::make('password'),
                'phone_number' => '08222222222',
                'role'         => 'customer',
            ]
        );

        $pijatLaktasi = Service::where('name', 'Pijat Laktasi')->first();
        if ($pijatLaktasi && $therapist) {
            Reservation::firstOrCreate(
                ['booking_code' => 'BSP-TEST-LAKT1'],
                [
                    'user_id'          => $customerB->id,
                    'service_id'       => $pijatLaktasi->id,
                    'therapist_id'     => $therapist->id,
                    'reservation_date' => Carbon::now()->subDays(14)->toDateString(),
                    'start_time'       => '10:00:00',
                    'end_time'         => '11:00:00',
                    'total_price'      => $pijatLaktasi->price,
                    'status'           => Reservation::STATUS_COMPLETED,
                    'baby_name'        => '-',
                    'baby_age'         => 0,
                    'notes'            => null,
                    'expires_at'       => null,
                ]
            );
        }

        $this->command->info("✅ Customer B (Bunda Sari / bunda.sari@test.com) → riwayat: Pijat Laktasi (completed)");

        // ── Customer C: belum punya riwayat sama sekali (cold start) ─────────
        User::firstOrCreate(
            ['email' => 'bunda.baru@test.com'],
            [
                'name'         => 'Bunda Baru',
                'password'     => Hash::make('password'),
                'phone_number' => '08333333333',
                'role'         => 'customer',
            ]
        );

        $this->command->info("✅ Customer C (Bunda Baru / bunda.baru@test.com) → belum ada riwayat (cold start)");

        $this->command->newLine();
        $this->command->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->command->line("  Semua akun menggunakan password: <fg=yellow>password</>");
        $this->command->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
}
