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
                'description'      => 'Paket spa bayi usia 0–1 tahun meliputi pijat lembut dan stimulasi sensorik untuk mendukung tumbuh kembang optimal.',
                'duration_minutes' => 45,
                'price'            => 32500.00,  // rata-rata 30K non-member / 35K member
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],
            [
                'name'             => 'Baby 1-3th',
                'description'      => 'Paket spa bayi usia 1–3 tahun dengan pijat seluruh tubuh dan relaksasi untuk mendukung perkembangan motorik.',
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
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 61,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Baby Spa (Massage, Gym, Swim)',
                'description'      => 'Paket spa lengkap meliputi pijat bayi, senam bayi (baby gym), dan sesi renang. Cocok untuk bayi usia 0–5 tahun.',
                'duration_minutes' => 90,
                'price'            => 80000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Baby Swim',
                'description'      => 'Sesi renang bayi dengan kolam bersih bersuhu ideal, dipandu terapis berpengalaman. Bayi usia 0–5 tahun.',
                'duration_minutes' => 30,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Kids Spa (Massage, Mandi Busa + Bola)',
                'description'      => 'Paket spa anak usia 3–12 tahun meliputi pijat anak, mandi busa, dan bermain bola kolam yang menyenangkan.',
                'duration_minutes' => 75,
                'price'            => 90000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 37,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Bubble Bath (Mandi Busa + Bola)',
                'description'      => 'Sesi mandi busa dan bermain bola kolam yang menyenangkan untuk bayi dan anak usia 0–12 tahun.',
                'duration_minutes' => 30,
                'price'            => 55000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Cukur Gundul',
                'description'      => 'Layanan cukur gundul tradisional untuk bayi usia 0–5 tahun, dipercaya membantu pertumbuhan rambut lebih lebat.',
                'duration_minutes' => 20,
                'price'            => 30000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Memandikan Bayi Baru Lahir Home Care',
                'description'      => 'Layanan memandikan bayi baru lahir di rumah meliputi mandi, perawatan tali pusar, dan pemantauan ikterik (kuning). Khusus bayi 0–1 bulan.',
                'duration_minutes' => 60,
                'price'            => 45000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 1,
            ],
            [
                'name'             => 'Mandi Bayi',
                'description'      => 'Layanan memandikan bayi usia 0–1 tahun dengan teknik yang aman dan nyaman oleh terapis berpengalaman.',
                'duration_minutes' => 20,
                'price'            => 15000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],
            [
                'name'             => 'Masker Anak',
                'description'      => 'Perawatan masker wajah alami khusus anak usia 1–12 tahun untuk menjaga kelembaban dan kebersihan kulit.',
                'duration_minutes' => 15,
                'price'            => 10000.00,
                'is_active'        => true,
                'category'         => 'baby_and_kids',
                'age_min_months'   => 13,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Membersihkan Selo Karang',
                'description'      => 'Layanan membersihkan kotoran di lipatan kulit (selo karang) bayi usia 0–1 tahun secara lembut dan aman.',
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
                'description'      => 'Pijat terapeutik untuk meredakan batuk dan pilek pada bayi dan anak usia 0–12 tahun menggunakan teknik refleksiologi.',
                'duration_minutes' => 40,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Pijat Sembelit',
                'description'      => 'Pijat perut khusus untuk mengatasi sembelit pada bayi dan anak usia 0–12 tahun.',
                'duration_minutes' => 35,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Pijat Nafsu Makan',
                'description'      => 'Pijat terapeutik untuk merangsang nafsu makan bayi dan anak usia 0–12 tahun yang sulit makan.',
                'duration_minutes' => 35,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Pijat Susah Tidur',
                'description'      => 'Pijat relaksasi untuk membantu bayi dan anak usia 0–12 tahun yang mengalami gangguan tidur.',
                'duration_minutes' => 40,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Pijat Perut Kembung',
                'description'      => 'Pijat terapeutik untuk meredakan perut kembung dan kolik pada bayi dan anak usia 0–12 tahun.',
                'duration_minutes' => 35,
                'price'            => 50000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Pijat Bayi Prematur',
                'description'      => 'Pijat khusus bayi prematur usia 0–1 tahun dengan teknik lembut untuk mendukung pertumbuhan dan perkembangan.',
                'duration_minutes' => 30,
                'price'            => 30000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 12,
            ],
            [
                'name'             => 'Uap / Nebulizer',
                'description'      => 'Terapi uap (nebulizer) untuk meredakan gangguan pernapasan pada bayi dan anak usia 0–12 tahun.',
                'duration_minutes' => 20,
                'price'            => 30000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Sinar / Infrared',
                'description'      => 'Terapi sinar infrared untuk meredakan nyeri otot dan memperlancar sirkulasi darah pada bayi dan anak usia 0–12 tahun.',
                'duration_minutes' => 20,
                'price'            => 20000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Nebulizer + Infrared',
                'description'      => 'Paket kombinasi terapi uap (nebulizer) dan sinar infrared untuk penanganan gangguan pernapasan lebih komprehensif.',
                'duration_minutes' => 35,
                'price'            => 45000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Tindik',
                'description'      => 'Layanan tindik telinga untuk bayi dan anak usia 0–5 tahun dengan teknik steril dan aman oleh tenaga terlatih.',
                'duration_minutes' => 15,
                'price'            => 45000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 60,
            ],
            [
                'name'             => 'Tapping',
                'description'      => 'Teknik tapping (ketukan lembut) untuk merangsang titik-titik akupresur pada bayi dan anak usia 0–12 tahun.',
                'duration_minutes' => 25,
                'price'            => 25000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
            ],
            [
                'name'             => 'Potong Kuku',
                'description'      => 'Layanan potong kuku bayi dan anak usia 0–12 tahun dengan alat bersih dan teknik aman.',
                'duration_minutes' => 15,
                'price'            => 25000.00,
                'is_active'        => true,
                'category'         => 'baby_kids_treatment',
                'age_min_months'   => 0,
                'age_max_months'   => 144,
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
                'description'      => 'Pijat relaksasi khusus ibu hamil untuk meredakan nyeri punggung, bengkak, dan meningkatkan kenyamanan selama kehamilan.',
                'duration_minutes' => 90,
                'price'            => 120000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Pijat Nifas',
                'description'      => 'Pijat pasca melahirkan untuk membantu pemulihan tubuh ibu, mengurangi nyeri, dan memperlancar pengeluaran lochea.',
                'duration_minutes' => 90,
                'price'            => 120000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Totok Wajah',
                'description'      => 'Perawatan wajah dengan teknik totok (akupresur) untuk relaksasi, meningkatkan sirkulasi, dan mencerahkan kulit.',
                'duration_minutes' => 30,
                'price'            => 25000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Hidroterapi (Berendam Rempah)',
                'description'      => 'Terapi berendam air hangat yang dicampur rempah-rempah pilihan untuk relaksasi dan detoksifikasi tubuh ibu.',
                'duration_minutes' => 60,
                'price'            => 75000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Mom Spa (Massage + Berendam Rempah)',
                'description'      => 'Paket spa ibu lengkap meliputi pijat relaksasi seluruh tubuh dan sesi berendam rempah untuk pemulihan total.',
                'duration_minutes' => 150,
                'price'            => 175000.00,
                'is_active'        => true,
                'category'         => 'mom_treatment',
                'age_min_months'   => 216,
                'age_max_months'   => null,
            ],
            [
                'name'             => 'Bekam',
                'description'      => 'Terapi bekam (hijama) untuk detoksifikasi, melancarkan peredaran darah, dan meredakan nyeri otot.',
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
