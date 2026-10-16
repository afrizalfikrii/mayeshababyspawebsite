<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * RecommendationService — Content-Based Filtering (CBF)
 *
 * Algoritma:
 * 1. Setiap layanan direpresentasikan sebagai feature vector:
 *    [one-hot kategori (3 dim)] + [one-hot bucket usia (4 dim)] + [harga ternormalisasi (1 dim)]
 *    Total: 8 dimensi
 *
 * 2. Profil preferensi pelanggan = rata-rata vektor dari semua layanan
 *    yang pernah dipesan (status: completed atau confirmed).
 *
 * 3. Cosine Similarity antara profil pelanggan dan setiap layanan kandidat.
 *
 * 4. Cold start: jika pelanggan belum punya riwayat, tampilkan layanan terpopuler
 *    (best seller) yang rentang usianya mencakup usia bayi pada profil anak.
 *    Jika profil anak belum diisi, tampilkan layanan terpopuler secara umum.
 */
class RecommendationService
{
    // Definisi konstanta kategori (urutan tetap untuk one-hot encoding)
    private const CATEGORIES = [
        'baby_and_kids',        // index 0
        'baby_kids_treatment',  // index 1
        'mom_treatment',        // index 2
    ];

    // Jenis strategi cold start yang dipakai pada pemanggilan recommend() terakhir
    public const COLD_START_AGE_BASED = 'age_based'; // best seller sesuai usia bayi
    public const COLD_START_GENERAL   = 'general';   // best seller umum (profil anak kosong)

    /** null = bukan cold start (hasil CBF) */
    public ?string $coldStartType = null;

    // Definisi bucket usia dalam bulan (urutan tetap untuk one-hot encoding)
    // null pada batas atas berarti "dewasa / tak terbatas"
    // Mitra hanya melayani anak s.d. 5 tahun; layanan dewasa (Mom Treatment) mulai 18 tahun.
    private const AGE_BUCKETS = [
        [0,   12],   // index 0: 0–1 tahun
        [13,  36],   // index 1: 1–3 tahun
        [37,  60],   // index 2: 3–5 tahun
        [216, null], // index 3: dewasa (≥18 tahun)
    ];

    // Jumlah dimensi vektor: 3 kategori + 4 usia + 1 harga
    private const DIMENSIONS = 8;
    private const PRICE_INDEX = 7;

    /**
     * Bangun feature vector 8 dimensi untuk sebuah layanan.
     *
     * Dimensi:
     * [0]   kategori: baby_and_kids
     * [1]   kategori: baby_kids_treatment
     * [2]   kategori: mom_treatment
     * [3]   usia: 0–1 tahun
     * [4]   usia: 1–3 tahun
     * [5]   usia: 3–5 tahun
     * [6]   usia: dewasa
     * [7]   harga ternormalisasi (0–1)
     *
     * @return float[]
     */
    public function buildFeatureVector(Service $service, float $maxPrice, float $minPrice): array
    {
        $vector = array_fill(0, self::DIMENSIONS, 0.0);

        // --- One-hot encoding: kategori (dimensi 0–2) ---
        $categoryIndex = array_search($service->category, self::CATEGORIES, true);
        if ($categoryIndex !== false) {
            $vector[$categoryIndex] = 1.0;
        }

        // --- One-hot encoding: bucket usia (dimensi 3–6) ---
        $ageMin = $service->age_min_months ?? 0;
        $ageMax = $service->age_max_months; // null = dewasa

        foreach (self::AGE_BUCKETS as $i => $bucket) {
            [$bucketMin, $bucketMax] = $bucket;

            // Layanan "masuk" bucket ini jika rentang usianya overlap
            $serviceMax   = $ageMax ?? PHP_INT_MAX;
            $bucketMaxVal = $bucketMax ?? PHP_INT_MAX;

            if ($ageMin <= $bucketMaxVal && $serviceMax >= $bucketMin) {
                $vector[3 + $i] = 1.0;
            }
        }

        // --- Normalisasi harga (dimensi 7) ---
        $priceRange    = $maxPrice - $minPrice;
        $vector[self::PRICE_INDEX] = $priceRange > 0
            ? ($service->price - $minPrice) / $priceRange
            : 0.5; // semua harga sama → posisi tengah

        return $vector;
    }

    /**
     * Hitung Cosine Similarity antara dua vektor numerik.
     *
     * cosine_similarity(A, B) = (A · B) / (‖A‖ × ‖B‖)
     * Nilai: 0 (tidak mirip) hingga 1 (identik)
     */
    public function cosineSimilarity(array $vectorA, array $vectorB): float
    {
        $dotProduct = 0.0;
        $normA      = 0.0;
        $normB      = 0.0;

        foreach ($vectorA as $i => $a) {
            $b           = $vectorB[$i] ?? 0.0;
            $dotProduct += $a * $b;
            $normA      += $a ** 2;
            $normB      += $b ** 2;
        }

        $normA = sqrt($normA);
        $normB = sqrt($normB);

        if ($normA == 0.0 || $normB == 0.0) {
            return 0.0;
        }

        return $dotProduct / ($normA * $normB);
    }

    /**
     * Bangun vektor profil preferensi pelanggan.
     *
     * Profil = rata-rata vektor dari semua layanan yang pernah dipesan
     * (dengan status completed atau confirmed).
     *
     * @param  Collection<int, Reservation> $reservations
     * @return float[]
     */
    public function buildCustomerProfile(Collection $reservations, float $maxPrice, float $minPrice): array
    {
        $profile    = array_fill(0, self::DIMENSIONS, 0.0);
        $count      = 0;

        foreach ($reservations as $reservation) {
            if (!$reservation->service) {
                continue;
            }
            $vector = $this->buildFeatureVector($reservation->service, $maxPrice, $minPrice);
            foreach ($vector as $i => $val) {
                $profile[$i] += $val;
            }
            $count++;
        }

        if ($count === 0) {
            return $profile;
        }

        // Rata-rata
        return array_map(fn($v) => $v / $count, $profile);
    }

    /**
     * Hasilkan Top-N rekomendasi layanan untuk seorang pelanggan (User).
     *
     * Alur:
     * 1. Ambil riwayat reservasi (confirmed/completed) beserta layanannya.
     * 2. Jika kosong → cold start (layanan terpopuler).
     * 3. Bangun profil pelanggan dari riwayat tersebut.
     * 4. Hitung cosine similarity profil vs. semua layanan aktif yang BELUM dipesan.
     * 5. Urutkan descending, ambil Top-N.
     *
     * @return Collection<int, Service>  koleksi Service dengan atribut tambahan `similarity_score`
     */
    public function recommend(User $user, int $topN = 3): Collection
    {
        $this->coldStartType = null;

        // Riwayat reservasi yang sudah selesai atau dikonfirmasi
        $history = $user->reservations()
            ->whereIn('status', [
                Reservation::STATUS_CONFIRMED,
                Reservation::STATUS_COMPLETED,
            ])
            ->with('service')
            ->get();

        // ── Cold Start: Belum ada riwayat ────────────────────────────────────
        if ($history->isEmpty()) {
            return $this->fallbackPopularServices($user, $topN);
        }

        // ── Ambil semua layanan aktif ─────────────────────────────────────────
        $allServices = Service::active()->get();

        // Hitung rentang harga global untuk normalisasi
        $maxPrice = (float) $allServices->max('price');
        $minPrice = (float) $allServices->min('price');

        // ID layanan yang sudah pernah dipesan (kandidat dikecualikan)
        $bookedServiceIds = $history->pluck('service_id')->unique()->toArray();

        // Kandidat: layanan aktif yang BELUM pernah dipesan oleh pelanggan ini
        $candidates = $allServices->whereNotIn('id', $bookedServiceIds)->values();

        // ── Profil pelanggan ──────────────────────────────────────────────────
        $customerProfile = $this->buildCustomerProfile($history, $maxPrice, $minPrice);

        // ── Hitung similarity & urutkan ───────────────────────────────────────
        $scored = $candidates->map(function (Service $service) use ($customerProfile, $maxPrice, $minPrice) {
            $serviceVector           = $this->buildFeatureVector($service, $maxPrice, $minPrice);
            $service->similarity_score = $this->cosineSimilarity($customerProfile, $serviceVector);
            return $service;
        });

        return $scored
            ->sortByDesc('similarity_score')
            ->take($topN)
            ->values();
    }

    /**
     * Fallback cold start: layanan terpopuler (best seller) berdasarkan usia bayi.
     *
     * Alur:
     * 1. Hitung usia (bulan) setiap bayi dari birth_date di profil anak.
     * 2. Saring layanan aktif yang rentang usianya (age_min_months–age_max_months)
     *    mencakup usia salah satu bayi tersebut.
     * 3. Urutkan berdasarkan jumlah reservasi berstatus completed (descending).
     * 4. Jika profil anak belum diisi (atau tidak ada layanan yang cocok),
     *    kembalikan layanan terpopuler secara umum.
     *
     * @return Collection<int, Service>
     */
    private function fallbackPopularServices(User $user, int $topN): Collection
    {
        // Usia bayi dalam bulan, dihitung dari tanggal lahir
        $babyAges = $user->babies()
            ->whereNotNull('birth_date')
            ->get()
            ->map(fn($baby) => (int) $baby->birth_date->diffInMonths(now()))
            ->unique()
            ->values();

        $results = collect();

        if ($babyAges->isNotEmpty()) {
            $results = $this->popularServicesQuery()
                ->where(function ($query) use ($babyAges) {
                    foreach ($babyAges as $age) {
                        // Layanan cocok jika age_min <= usia <= age_max
                        // (age_min null = 0, age_max null = tanpa batas atas)
                        $query->orWhere(function ($q) use ($age) {
                            $q->where(fn($q2) => $q2->whereNull('age_min_months')->orWhere('age_min_months', '<=', $age))
                              ->where(fn($q2) => $q2->whereNull('age_max_months')->orWhere('age_max_months', '>=', $age));
                        });
                    }
                })
                ->take($topN)
                ->get();

            if ($results->isNotEmpty()) {
                $this->coldStartType = self::COLD_START_AGE_BASED;
            }
        }

        // Profil anak belum diisi / tidak ada layanan yang cocok → best seller umum
        if ($results->isEmpty()) {
            $results = $this->popularServicesQuery()->take($topN)->get();
            $this->coldStartType = self::COLD_START_GENERAL;
        }

        return $results->map(function (Service $service) {
            // Tandai sebagai cold-start (tidak ada similarity score)
            $service->similarity_score = null;
            return $service;
        });
    }

    /**
     * Query dasar layanan aktif diurutkan berdasarkan jumlah reservasi completed.
     */
    private function popularServicesQuery()
    {
        return Service::active()
            ->withCount([
                'reservations as completed_count' => fn($q) => $q->where('status', Reservation::STATUS_COMPLETED),
            ])
            ->orderByDesc('completed_count')
            ->orderBy('id');
    }
}
