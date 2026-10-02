# CLAUDE.md — Modul Rekomendasi Layanan (Content-Based Filtering)

## Konteks Proyek

Sistem reservasi online Mayesha Baby Spa Karanganyar (Laravel + PHP + MySQL) **sudah dibangun** (autentikasi, katalog layanan, reservasi dengan penguncian slot, verifikasi pembayaran, dsb). Yang **belum diimplementasikan** adalah modul **rekomendasi layanan lanjutan** menggunakan metode **Content-Based Filtering (CBF)** dengan algoritma **Cosine Similarity**, berdasarkan riwayat transaksi pelanggan.

Tujuan modul ini: setelah pelanggan melakukan reservasi (atau saat melihat riwayat transaksinya), sistem menampilkan rekomendasi layanan lain yang mirip dengan layanan yang pernah/sedang dipesan, guna mendorong *upselling* layanan lanjutan.

---

## 1. Data Layanan (Katalog)

Berikut daftar layanan aktual Mayesha Baby Spa yang harus dimasukkan ke tabel `services` (atau `layanans`), lengkap dengan atribut yang dipakai sebagai fitur CBF: **kategori**, **target usia**, dan **harga**. Harga dalam ribuan Rupiah (K = x1.000).

### Kategori: Baby and Kids
| Nama Layanan | Target Usia | Harga (Non-Member / Member) |
|---|---|---|
| Baby 0-1th | 0–1 tahun | 30K / 35K |
| Baby 1-3th | 1–3 tahun | 35K / 40K |
| Baby 3-4th | 3–4 tahun | 40K / 45K |
| Anak > 5th | >5 tahun | 45K / 50K |
| Baby Spa (Massage, Gym, Swim) | 0–5 tahun | 80K |
| Baby Swim | 0–5 tahun | 50K |
| Kids Spa (Massage, Mandi Busa + Bola) | 3–12 tahun | 90K |
| Bubble Bath (Mandi Busa + Bola) | 0–12 tahun | 55K |
| Cukur Gundul | 0–5 tahun | 30K |
| Memandikan Bayi Baru Lahir Home Care (Mandi, Perawatan Tali Pusar, Pemantauan Ikterik) | 0–1 bulan | 45K |
| Mandi Bayi | 0–1 tahun | 15K |
| Masker Anak | 1–12 tahun | 10K |
| Membersihkan Selo Karang | 0–1 tahun | 15K |

### Kategori: Baby & Kids Treatment
| Nama Layanan | Target Usia | Harga |
|---|---|---|
| Pijat Batuk Pilek | 0–12 tahun | 40K–60K |
| Pijat Sembelit | 0–12 tahun | 40K–60K |
| Pijat Nafsu Makan | 0–12 tahun | 40K–60K |
| Pijat Susah Tidur | 0–12 tahun | 40K–60K |
| Pijat Perut Kembung | 0–12 tahun | 40K–60K |
| Pijat Bayi Prematur | 0–1 tahun | 30K |
| Uap / Nebulizer | 0–12 tahun | 30K |
| Sinar / Infrared | 0–12 tahun | 20K |
| Nebulizer + Infrared | 0–12 tahun | 45K |
| Tindik | 0–5 tahun | 45K |
| Tapping | 0–12 tahun | 25K |
| Potong Kuku | 0–12 tahun | 25K |

### Kategori: Mom Treatment
| Nama Layanan | Target Usia (dewasa) | Harga |
|---|---|---|
| Pijat Laktasi | Dewasa | 75K |
| Pijat Hamil | Dewasa | 120K |
| Pijat Nifas | Dewasa | 120K |
| Totok Wajah | Dewasa | 25K |
| Hidroterapi (Berendam Rempah) | Dewasa | 75K |
| Mom Spa (Massage + Berendam Rempah) | Dewasa | 175K |
| Bekam | Dewasa | 75K |

> Catatan implementasi: kolom `harga` yang berupa rentang (mis. `40K–60K`) sebaiknya disimpan sebagai `harga_min` dan `harga_max`, atau diambil titik tengahnya untuk keperluan normalisasi fitur numerik.

---

## 2. Skema Atribut untuk Feature Vector

Setiap layanan direpresentasikan sebagai vektor fitur dengan 3 kelompok atribut:

1. **Kategori** (nominal → one-hot encoding)
   - `baby_and_kids`, `baby_kids_treatment`, `mom_treatment`
2. **Target usia** (ordinal → dikelompokkan ke rentang/bucket, lalu one-hot atau ordinal encoding)
   - `0-1_tahun`, `1-3_tahun`, `3-5_tahun`, `5-12_tahun`, `dewasa`
3. **Harga** (numerik → dinormalisasi min-max ke rentang 0–1)
   - `harga_normalized = (harga - harga_min_global) / (harga_max_global - harga_min_global)`

Total dimensi vektor = (jumlah kategori) + (jumlah bucket usia) + 1 (harga ternormalisasi).

---

## 3. Algoritma: Cosine Similarity

Setelah setiap layanan direpresentasikan sebagai vektor numerik `V`, kemiripan antar dua layanan A dan B dihitung dengan:

```
cosine_similarity(A, B) = (A · B) / (‖A‖ * ‖B‖)
```

dengan `A · B` adalah dot product, dan `‖A‖`, `‖B‖` adalah norma Euclidean masing-masing vektor. Nilai berkisar 0 (tidak mirip) sampai 1 (identik).

### Alur rekomendasi per pelanggan:
1. Ambil daftar layanan yang **pernah dipesan** pelanggan (riwayat transaksi) → bentuk **profil preferensi** pelanggan (bisa berupa vektor rata-rata dari seluruh layanan yang pernah dipesan, atau dihitung per-item terhadap layanan terakhir).
2. Hitung cosine similarity antara profil/item tersebut terhadap **seluruh layanan lain** yang belum pernah dipesan.
3. Urutkan hasil similarity secara descending, ambil Top-N (mis. Top 3–5) sebagai rekomendasi.
4. Untuk pelanggan baru tanpa riwayat (*cold start*), tampilkan layanan terpopuler (fallback), bukan hasil CBF.

---

## 4. Struktur Implementasi (Laravel)

Buat service class terpisah agar logika CBF tidak bercampur dengan controller:

```
app/
  Services/
    RecommendationService.php   ← logika utama CBF + cosine similarity
  Models/
    Service.php                  ← model layanan (services table)
    Transaction.php               ← model riwayat transaksi
```

### Pseudocode `RecommendationService.php`

```php
class RecommendationService
{
    public function buildFeatureVector(Service $service): array
    {
        // one-hot kategori + one-hot bucket usia + harga_normalized
    }

    public function cosineSimilarity(array $vectorA, array $vectorB): float
    {
        $dotProduct = array_sum(array_map(fn($a, $b) => $a * $b, $vectorA, $vectorB));
        $normA = sqrt(array_sum(array_map(fn($a) => $a ** 2, $vectorA)));
        $normB = sqrt(array_sum(array_map(fn($b) => $b ** 2, $vectorB)));

        if ($normA == 0 || $normB == 0) {
            return 0;
        }

        return $dotProduct / ($normA * $normB);
    }

    public function recommend(Customer $customer, int $topN = 5): Collection
    {
        $history = $customer->transactions()->with('service')->get();

        if ($history->isEmpty()) {
            return $this->fallbackPopularServices($topN); // cold start
        }

        $candidateServices = Service::whereNotIn(
            'id',
            $history->pluck('service_id')
        )->get();

        $customerProfileVector = $this->buildCustomerProfile($history);

        return $candidateServices
            ->map(function ($service) use ($customerProfileVector) {
                $service->similarity_score = $this->cosineSimilarity(
                    $customerProfileVector,
                    $this->buildFeatureVector($service)
                );
                return $service;
            })
            ->sortByDesc('similarity_score')
            ->take($topN);
    }
}
```

---

## 5. Yang Perlu Dikerjakan (Todo)

- [ ] Migrasi/seed data layanan pada tabel `services` sesuai daftar di atas (kategori, target usia, harga).
- [ ] Implementasi `buildFeatureVector()` — one-hot encoding kategori & usia, normalisasi harga.
- [ ] Implementasi `cosineSimilarity()`.
- [ ] Implementasi `buildCustomerProfile()` — agregasi vektor dari riwayat transaksi pelanggan.
- [ ] Implementasi fallback popularitas untuk kasus *cold start*.
- [ ] Endpoint/controller untuk menampilkan hasil rekomendasi (mis. di halaman riwayat transaksi atau setelah reservasi berhasil).
- [ ] Unit test: verifikasi nilai cosine similarity dengan kasus uji manual sederhana (2–3 layanan dengan vektor diketahui).
