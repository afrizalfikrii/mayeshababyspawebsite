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
 *    [one-hot kategori (3 dim)] + [one-hot bucket usia (5 dim)] + [harga ternormalisasi (1 dim)]
 *    Total: 9 dimensi
 *
 * 2. Profil preferensi pelanggan = rata-rata vektor dari semua layanan
 *    yang pernah dipesan (status: completed atau confirmed).
 *
 * 3. Cosine Similarity antara profil pelanggan dan setiap layanan kandidat.
 *
 * 4. Cold start: jika pelanggan belum punya riwayat, tampilkan layanan terpopuler.
 */
class RecommendationService
{
    // Definisi konstanta kategori (urutan tetap untuk one-hot encoding)
    private const CATEGORIES = [
        'baby_and_kids',        // index 0
        'baby_kids_treatment',  // index 1
        'mom_treatment',        // index 2
    ];

    // Definisi bucket usia dalam bulan (urutan tetap untuk one-hot encoding)
    // null pada batas atas berarti "dewasa / tak terbatas"
    private const AGE_BUCKETS = [
        [0,   12],   // index 0: 0–1 tahun
        [13,  36],   // index 1: 1–3 tahun
        [37,  60],   // index 2: 3–5 tahun
        [61,  144],  // index 3: 5–12 tahun
        [145, null], // index 4: dewasa (>12 tahun)
    ];

    /**
     * Bangun feature vector 9 dimensi untuk sebuah layanan.
     *
     * Dimensi:
     * [0]   kategori: baby_and_kids
     * [1]   kategori: baby_kids_treatment
     * [2]   kategori: mom_treatment
     * [3]   usia: 0–1 tahun
     * [4]   usia: 1–3 tahun
     * [5]   usia: 3–5 tahun
     * [6]   usia: 5–12 tahun
     * [7]   usia: dewasa
     * [8]   harga ternormalisasi (0–1)
     *
     * @return float[]
     */
    public function buildFeatureVector(Service $service, float $maxPrice, float $minPrice): array
    {
        $vector = array_fill(0, 9, 0.0);

        // --- One-hot encoding: kategori (dimensi 0–2) ---
        $categoryIndex = array_search($service->category, self::CATEGORIES, true);
        if ($categoryIndex !== false) {
            $vector[$categoryIndex] = 1.0;
        }

        // --- One-hot encoding: bucket usia (dimensi 3–7) ---
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

        // --- Normalisasi harga (dimensi 8) ---
        $priceRange    = $maxPrice - $minPrice;
        $vector[8]     = $priceRange > 0
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
        $profile    = array_fill(0, 9, 0.0);
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
    public function recommend(User $user, int $topN = 5): Collection
    {
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
            return $this->fallbackPopularServices($topN);
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
     * Fallback cold start: kembalikan layanan terpopuler (by jumlah reservasi completed).
     *
     * @return Collection<int, Service>
     */
    private function fallbackPopularServices(int $topN): Collection
    {
        return Service::active()
            ->withCount([
                'reservations as completed_count' => fn($q) => $q->where('status', Reservation::STATUS_COMPLETED),
            ])
            ->orderByDesc('completed_count')
            ->take($topN)
            ->get()
            ->map(function (Service $service) {
                // Tandai sebagai cold-start (tidak ada similarity score)
                $service->similarity_score = null;
                return $service;
            });
    }
}
