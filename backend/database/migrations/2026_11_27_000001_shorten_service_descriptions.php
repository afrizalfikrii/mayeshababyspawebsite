<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SHORT_DESCRIPTIONS = [
        'Baby 0-1th'                           => 'Pijat lembut dan stimulasi sensorik untuk mendukung tumbuh kembang.',
        'Baby 1-3th'                           => 'Pijat seluruh tubuh dan relaksasi untuk mendukung perkembangan motorik.',
        'Baby Spa (Massage, Gym, Swim)'        => 'Paket spa lengkap meliputi pijat bayi, baby gym, dan sesi renang.',
        'Baby Swim'                            => 'Sesi renang air hangat di kolam steril dengan pendampingan terapis.',
        'Kids Spa (Massage, Mandi Busa + Bola)' => 'Paket spa meliputi pijat anak, mandi busa, dan bermain bola kolam.',
        'Bubble Bath (Mandi Busa + Bola)'      => 'Sesi mandi busa hangat dan bermain bola kolam yang menyenangkan.',
        'Cukur Gundul'                         => 'Layanan cukur rambut bayi tradisional yang aman, lembut, dan higienis.',
        'Memandikan Bayi Baru Lahir Home Care' => 'Mandi bayi baru lahir di rumah, perawatan tali pusar, dan pantau kuning.',
        'Mandi Bayi'                           => 'Layanan memandikan bayi secara aman dan nyaman oleh bidan terlatih.',
        'Masker Anak'                          => 'Masker wajah alami untuk menjaga kelembapan dan kebersihan kulit anak.',
        'Membersihkan Selo Karang'             => 'Pembersihan kotoran di lipatan kulit (selo karang) secara lembut.',
        'Pijat Batuk Pilek'                    => 'Pijat terapeutik dengan teknik refleksiologi untuk meredakan batuk pilek.',
        'Pijat Bayi Prematur'                  => 'Pijat lembut khusus bayi prematur untuk mendukung pertumbuhan optimal.',
        'Uap / Nebulizer'                      => 'Terapi uap nebulizer untuk membantu melegakan saluran pernapasan.',
        'Sinar / Infrared'                     => 'Terapi sinar infrared untuk meredakan nyeri otot dan melancarkan darah.',
        'Nebulizer + Infrared'                 => 'Kombinasi terapi uap nebulizer dan sinar infrared untuk pernapasan.',
        'Tindik'                               => 'Layanan tindik telinga steril dan aman oleh tenaga bidan terlatih.',
        'Tapping'                              => 'Ketukan lembut pada titik akupresur untuk membantu relaksasi dan napas.',
        'Pijat Hamil'                          => 'Pijat lembut ibu hamil untuk meredakan nyeri punggung dan bengkak.',
        'Pijat Nifas'                          => 'Pijat pascamelahirkan untuk membantu pemulihan tubuh dan mengurangi nyeri.',
        'Totok Wajah'                          => 'Perawatan totok akupresur wajah untuk relaksasi dan kesegaran kulit.',
        'Hidroterapi (Berendam Rempah)'        => 'Berendam air hangat dengan rempah pilihan untuk relaksasi tubuh ibu.',
        'Mom Spa (Massage + Berendam Rempah)'  => 'Paket spa lengkap meliputi pijat seluruh tubuh dan berendam rempah.',
        'Bekam'                                => 'Terapi bekam untuk melancarkan peredaran darah dan meredakan pegal otot.',
    ];

    private const ORIGINAL_DESCRIPTIONS = [
        'Baby 0-1th'                           => 'Paket spa bayi usia 0–1 tahun meliputi pijat lembut dan stimulasi sensorik untuk mendukung tumbuh kembang optimal.',
        'Baby 1-3th'                           => 'Paket spa bayi usia 1–3 tahun dengan pijat seluruh tubuh dan relaksasi untuk mendukung perkembangan motorik.',
        'Baby Spa (Massage, Gym, Swim)'        => 'Paket spa lengkap meliputi pijat bayi, senam bayi (baby gym), dan sesi renang. Cocok untuk bayi usia 0–5 tahun.',
        'Baby Swim'                            => 'Sesi renang bayi dengan kolam bersih bersuhu ideal, dipandu terapis berpengalaman. Bayi usia 0–5 tahun.',
        'Kids Spa (Massage, Mandi Busa + Bola)' => 'Paket spa anak usia 3–5 tahun meliputi pijat anak, mandi busa, dan bermain bola kolam yang menyenangkan.',
        'Bubble Bath (Mandi Busa + Bola)'      => 'Sesi mandi busa dan bermain bola kolam yang menyenangkan untuk bayi dan anak usia 0–5 tahun.',
        'Cukur Gundul'                         => 'Layanan cukur gundul tradisional untuk bayi usia 0–5 tahun, dipercaya membantu pertumbuhan rambut lebih lebat.',
        'Memandikan Bayi Baru Lahir Home Care' => 'Layanan memandikan bayi baru lahir di rumah meliputi mandi, perawatan tali pusar, dan pemantauan ikterik (kuning). Khusus bayi 0–1 bulan.',
        'Mandi Bayi'                           => 'Layanan memandikan bayi usia 0–1 tahun dengan teknik yang aman dan nyaman oleh terapis berpengalaman.',
        'Masker Anak'                          => 'Perawatan masker wajah alami khusus anak usia 1–5 tahun untuk menjaga kelembaban dan kebersihan kulit.',
        'Membersihkan Selo Karang'             => 'Layanan membersihkan kotoran di lipatan kulit (selo karang) bayi usia 0–1 tahun secara lembut dan aman.',
        'Pijat Batuk Pilek'                    => 'Pijat terapeutik untuk meredakan batuk dan pilek pada bayi dan anak usia 0–5 tahun menggunakan teknik refleksiologi.',
        'Pijat Bayi Prematur'                  => 'Pijat khusus bayi prematur usia 0–1 tahun dengan teknik lembut untuk mendukung pertumbuhan dan perkembangan.',
        'Uap / Nebulizer'                      => 'Terapi uap (nebulizer) untuk meredakan gangguan pernapasan pada bayi dan anak usia 0–5 tahun.',
        'Sinar / Infrared'                     => 'Terapi sinar infrared untuk meredakan nyeri otot dan memperlancar sirkulasi darah pada bayi dan anak usia 0–5 tahun.',
        'Nebulizer + Infrared'                 => 'Paket kombinasi terapi uap (nebulizer) dan sinar infrared untuk penanganan gangguan pernapasan lebih komprehensif.',
        'Tindik'                               => 'Layanan tindik telinga untuk bayi dan anak usia 0–5 tahun dengan teknik steril dan aman oleh tenaga terlatih.',
        'Tapping'                              => 'Teknik tapping (ketukan lembut) untuk merangsang titik-titik akupresur pada bayi dan anak usia 0–5 tahun.',
        'Pijat Hamil'                          => 'Pijat relaksasi khusus ibu hamil untuk meredakan nyeri punggung, bengkak, dan meningkatkan kenyamanan selama kehamilan.',
        'Pijat Nifas'                          => 'Pijat pasca melahirkan untuk membantu pemulihan tubuh ibu, mengurangi nyeri, dan memperlancar pengeluaran lochea.',
        'Totok Wajah'                          => 'Perawatan wajah dengan teknik totok (akupresur) untuk relaksasi, meningkatkan sirkulasi, dan mencerahkan kulit.',
        'Hidroterapi (Berendam Rempah)'        => 'Terapi berendam air hangat yang dicampur rempah-rempah pilihan untuk relaksasi dan detoksifikasi tubuh ibu.',
        'Mom Spa (Massage + Berendam Rempah)'  => 'Paket spa ibu lengkap meliputi pijat relaksasi seluruh tubuh dan sesi berendam rempah untuk pemulihan total.',
        'Bekam'                                => 'Terapi bekam (hijama) untuk detoksifikasi, melancarkan peredaran darah, dan meredakan nyeri otot.',
    ];

    public function up(): void
    {
        foreach (self::SHORT_DESCRIPTIONS as $name => $description) {
            DB::table('services')
                ->where('name', $name)
                ->update(['description' => $description]);
        }
    }

    public function down(): void
    {
        foreach (self::ORIGINAL_DESCRIPTIONS as $name => $description) {
            DB::table('services')
                ->where('name', $name)
                ->update(['description' => $description]);
        }
    }
};
