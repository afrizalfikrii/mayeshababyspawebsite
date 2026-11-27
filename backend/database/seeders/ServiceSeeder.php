<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

/**
 * Seeder data layanan aktual Mayesha Baby Spa.
 *
 * Kolom CBF:
 * - category       : 'baby_and_kids' | 'baby_kids_treatment' | 'mom_treatment'
 * - age_min_months : usia minimum dalam bulan
 * - age_max_months : usia maksimum dalam bulan (null = dewasa)
 *
 * Untuk harga rentang (mis. 40K–60K), dipakai nilai tengah (50K).
 */
class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            // ── Kategori: Baby and Kids ──────────────────────────────────────
            [
                'name'             => 'Baby 0-1th',
                'description'      => 'Pijat lembut dan stimulasi sensorik untuk mendukung tumbuh kembang.',
                'duration_minutes' => 45,
                'price'            => 32500.00,  // rata-rata 30K non-member / 35K member
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],
            [
                'name'             => 'Baby 1-3th',
                'description'      => 'Pijat seluruh tubuh dan relaksasi untuk mendukung perkembangan motorik.',
                'duration_minutes' => 45,
                'price'            => 37500.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 13,
                'age_max_months'   => 36,
            ],
            [
                'name'             => 'Baby 3-4th',
                'description'      => 'Paket spa anak usia 3–4 tahun dengan pijat dan perawatan tubuh yang menyegarkan.',
                'duration_minutes' => 50,
                'price'            => 42500.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 37,
                'age_max_months'   => 48,
            ],
            [
                'name'             => 'Anak > 5th',
                'description'      => 'Paket spa anak usia di atas 5 tahun dengan pijat relaksasi dan perawatan tubuh menyeluruh.',
                'duration_minutes' => 60,
                'price'            => 47500.00,
                'is_active'        => false, // nonaktif: mitra hanya melayani anak s.d. 5 tahun
                'category'         => 'baby_and_kids',
                'age_min_months'   => 61,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Baby Spa (Massage, Gym, Swim)',
                'description'      => 'Paket spa lengkap meliputi pijat bayi, baby gym, dan sesi renang.',
                'duration_minutes' => 90,
                'price'            => 80000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Baby Swim',
                'description'      => 'Sesi renang air hangat di kolam steril dengan pendampingan terapis.',
                'duration_minutes' => 30,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Kids Spa (Massage, Mandi Busa + Bola)',
                'description'      => 'Paket spa meliputi pijat anak, mandi busa, dan bermain bola kolam.',
                'duration_minutes' => 75,
                'price'            => 90000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 37,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Bubble Bath (Mandi Busa + Bola)',
                'description'      => 'Sesi mandi busa hangat dan bermain bola kolam yang menyenangkan.',
                'duration_minutes' => 30,
                'price'            => 55000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Cukur Gundul',
                'description'      => 'Layanan cukur rambut bayi tradisional yang aman, lembut, dan higienis.',
                'duration_minutes' => 20,
                'price'            => 30000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Memandikan Bayi Baru Lahir Home Care',
                'description'      => 'Mandi bayi baru lahir di rumah, perawatan tali pusar, dan pantau kuning.',
                'duration_minutes' => 60,
                'price'            => 45000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 1,
            ],
            [
                'name'             => 'Mandi Bayi',
                'description'      => 'Layanan memandikan bayi secara aman dan nyaman oleh bidan terlatih.',
                'duration_minutes' => 20,
                'price'            => 15000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],
            [
                'name'             => 'Masker Anak',
                'description'      => 'Masker wajah alami untuk menjaga kelembapan dan kebersihan kulit anak.',
                'duration_minutes' => 15,
                'price'            => 10000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 13,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Membersihkan Selo Karang',
                'description'      => 'Pembersihan kotoran di lipatan kulit (selo karang) secara lembut.',
                'duration_minutes' => 15,
                'price'            => 15000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],

            // ── Kategori: Baby & Kids Treatment ─────────────────────────────
            [
                'name'             => 'Pijat Batuk Pilek',
                'description'      => 'Pijat terapeutik dengan teknik refleksiologi untuk meredakan batuk pilek.',
                'duration_minutes' => 40,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Pijat Sembelit',
                'description'      => 'Pijat perut khusus untuk mengatasi sembelit pada bayi dan anak usia 0–5 tahun.',
                'duration_minutes' => 35,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Pijat Nafsu Makan',
                'description'      => 'Pijat terapeutik untuk merangsang nafsu makan bayi dan anak usia 0–5 tahun yang sulit makan.',
                'duration_minutes' => 35,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Pijat Susah Tidur',
                'description'      => 'Pijat relaksasi untuk membantu bayi dan anak usia 0–5 tahun yang mengalami gangguan tidur.',
                'duration_minutes' => 40,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Pijat Perut Kembung',
                'description'      => 'Pijat terapeutik untuk meredakan perut kembung dan kolik pada bayi dan anak usia 0–5 tahun.',
                'duration_minutes' => 35,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Pijat Bayi Prematur',
                'description'      => 'Pijat lembut khusus bayi prematur untuk mendukung pertumbuhan optimal.',
                'duration_minutes' => 30,
                'price'            => 30000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],
            [
                'name'             => 'Uap / Nebulizer',
                'description'      => 'Terapi uap nebulizer untuk membantu melegakan saluran pernapasan.',
                'duration_minutes' => 20,
                'price'            => 30000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Sinar / Infrared',
                'description'      => 'Terapi sinar infrared untuk meredakan nyeri otot dan melancarkan darah.',
                'duration_minutes' => 20,
                'price'            => 20000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Nebulizer + Infrared',
                'description'      => 'Kombinasi terapi uap nebulizer dan sinar infrared untuk pernapasan.',
                'duration_minutes' => 35,
                'price'            => 45000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Tindik',
                'description'      => 'Layanan tindik telinga steril dan aman oleh tenaga bidan terlatih.',
                'duration_minutes' => 15,
                'price'            => 45000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Tapping',
                'description'      => 'Ketukan lembut pada titik akupresur untuk membantu relaksasi dan napas.',
                'duration_minutes' => 25,
                'price'            => 25000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Potong Kuku',
                'description'      => 'Layanan potong kuku bayi dan anak usia 0–5 tahun dengan alat bersih dan teknik aman.',
                'duration_minutes' => 15,
                'price'            => 25000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],

            // ── Kategori: Mom Treatment ──────────────────────────────────────
            [
                'name'             => 'Pijat Laktasi',
                'description'      => 'Pijat payudara dan punggung untuk melancarkan produksi ASI pada ibu menyusui.',
                'duration_minutes' => 60,
                'price'            => 75000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216, // 18 tahun
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Pijat Hamil',
                'description'      => 'Pijat lembut ibu hamil untuk meredakan nyeri punggung dan bengkak.',
                'duration_minutes' => 90,
                'price'            => 120000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Pijat Nifas',
                'description'      => 'Pijat pascamelahirkan untuk membantu pemulihan tubuh dan mengurangi nyeri.',
                'duration_minutes' => 90,
                'price'            => 120000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Totok Wajah',
                'description'      => 'Perawatan totok akupresur wajah untuk relaksasi dan kesegaran kulit.',
                'duration_minutes' => 30,
                'price'            => 25000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Hidroterapi (Berendam Rempah)',
                'description'      => 'Berendam air hangat dengan rempah pilihan untuk relaksasi tubuh ibu.',
                'duration_minutes' => 60,
                'price'            => 75000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Mom Spa (Massage + Berendam Rempah)',
                'description'      => 'Paket spa lengkap meliputi pijat seluruh tubuh dan berendam rempah.',
                'duration_minutes' => 150,
                'price'            => 175000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Bekam',
                'description'      => 'Terapi bekam untuk melancarkan peredaran darah dan meredakan pegal otot.',
                'duration_minutes' => 60,
                'price'            => 75000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
        ];

        foreach ($services as $service) {
            Service::firstOrCreate(
                ['name' => $service['name']],
                $service
            );
        }

        $this->command->info('✅ ' . count($services) . ' layanan Mayesha Baby Spa berhasil di-seed.');
    }
}
