# Panduan Pertahanan Sidang Skripsi - Sistem Informasi BabyBliss Spa

Dokumen ini dirancang khusus untuk membantu Anda menyusun **Buku Skripsi (Bab III, IV, dan V)** serta mempersiapkan diri menghadapi **Pertanyaan Dosen Penguji** saat sidang nanti.

---

## 1. Topik Utama yang Wajib Ditulis di Buku Skripsi

### A. Latar Belakang Masalah (Bab I)
*   **Masalah Nyata**: Sistem pemesanan Baby Spa konvensional yang mengandalkan chat WhatsApp rentan terhadap **Human Error** seperti:
    *   *Double Booking* (bentrok jadwal terapis/ruangan).
    *   Proses verifikasi pembayaran manual yang lambat.
    *   Slot waktu terbuang sia-sia karena pelanggan membooking tapi tidak kunjung membayar (*no-show*).
*   **Solusi**: Aplikasi berbasis Web dengan alur pemesanan waktu nyata (*real-time reservation*), pembatalan otomatis (*auto-cancellation*), dan pencegahan bentrok transaksi (*pessimistic locking*).

### B. Arsitektur Teknologi (Bab II & III)
Jelaskan bahwa sistem ini menggunakan arsitektur **Decoupled (Decoupled Architecture)**:
*   **Frontend**: React.js SPA (Single Page Application) menggunakan Vite.
*   **Backend**: Laravel 12 RESTful API.
*   **Keamanan**: Stateless Token-Based Authentication menggunakan **Laravel Sanctum**.
*   **Keunggulan**: Memisahkan beban kerja antarmuka pengguna (client-side) dan pemrosesan database (server-side) untuk performa yang lebih cepat dan aman.

---

## 2. Poin Teknis Terpenting (Sering Ditanyakan Dosen)

Dosen penguji bidang TI/SI sangat menyukai aspek keandalan database. Berikut adalah **tiga fitur andalan** sistem ini yang wajib Anda presentasikan:

### Poin 1: Pencegahan Bentrok Jadwal (Pessimistic Locking)
*   **Pertanyaan Dosen**: *"Bagaimana jika ada dua ibu membooking jadwal terapis yang sama di detik yang sama?"*
*   **Jawaban Anda**: Sistem menggunakan mekanisme **Pessimistic Locking** (`lockForUpdate()`) di level database MySQL dalam satu transaksi SQL terisolasi.
*   **Potongan Kode (Bab IV - Implementasi)**:
    ```php
    // Membuka Transaksi Database
    DB::transaction(function () use ($validated, $service) {
        // Melakukan lock baris data yang bertabrakan waktu
        $overlap = Reservation::where('reservation_date', $validated['reservation_date'])
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                  ->where('end_time', '>', $startTime);
            })
            ->lockForUpdate() // Mencegah proses lain menulis ke slot ini
            ->exists();

        if ($overlap) {
            throw new \Exception("Jadwal sudah terisi.");
        }
        
        // Buat reservasi baru jika slot aman
    });
    ```
*   **Penjelasan**: Baris di database akan dikunci sementara selama transaksi validasi berlangsung. Permintaan kedua akan mengantre hingga transaksi pertama selesai, lalu otomatis ditolak dengan pesan error `409 Conflict`.

### Poin 2: Pelepasan Slot Otomatis (Slot Locking & Scheduler)
*   **Pertanyaan Dosen**: *"Bagaimana jika ada orang iseng membooking slot tapi tidak membayar? Bukankah itu merugikan bisnis?"*
*   **Jawaban Anda**: Sistem mengunci slot tersebut hanya selama **15 menit** sejak dipesan. Jika dalam 15 menit pengguna tidak mengunggah bukti bayar, status reservasi otomatis diubah menjadi `cancelled` (Dibatalkan) dan slot waktu dibebaskan kembali untuk umum.
*   **Metode**:
    1.  **Laravel Task Scheduling** (berjalan tiap 1 menit di server untuk mengecek reservasi kedaluwarsa).
    2.  **Lazy Expiry Synchronization**: Sistem melakukan pemindaian otomatis setiap kali admin atau user memanggil data reservasi, memastikan status selalu akurat secara real-time.

### Poin 3: Analisis Data Dinamis & Ekspor Laporan Resmi (Owner Reporting)
*   **Pertanyaan Dosen**: *"Bagaimana pemilik usaha melihat performa laporan keuangannya?"*
*   **Jawaban Anda**: Halaman Admin dilengkapi dengan fitur **Analisis & Laporan** dinamis berbasis diagram garis (pendapatan) dan diagram batang (layanan terpopuler). Admin juga dapat mengekspor seluruh rekaman transaksi bulanan ke dalam format **Laporan Cetak Fisik / PDF** lengkap dengan kolom tanda tangan pemilik usaha secara instan.

---

## 3. Diagram UML yang Wajib Anda Gambar di Bab III
Pastikan Anda menggambarkan diagram-diagram berikut dalam buku skripsi Anda:
1.  **Use Case Diagram**:
    *   **Aktor**: Pelanggan (Customer) & Admin.
    *   *Pelanggan*: Registrasi/Login, Lihat Layanan, Lakukan Booking, Unggah Bukti Bayar, Cetak Tiket.
    *   *Admin*: Kelola Layanan (CRUD), Lihat Semua Booking, Verifikasi Pembayaran, Selesaikan Sesi Spa, Cetak Laporan Keuangan.
2.  **Activity Diagram**: Alur booking dari memilih layanan -> terkunci 15 menit -> verifikasi admin -> sesi selesai.
3.  **Class Diagram**: Hubungan tabel `users`, `services`, dan `reservations`.
4.  **Entity Relationship Diagram (ERD)**: Kardinalitas relasi One-to-Many (`users` ke `reservations`, `services` ke `reservations`).

---

## 4. Tips Sukses Menghadapi Sidang Demo Program
*   **Lakukan Simulasi Concurrency**: Buka dua browser berbeda (misal Chrome biasa dan Incognito), coba lakukan booking di slot jam yang sama secara bersamaan. Tunjukkan bahwa sistem hanya meloloskan satu orang dan menolak yang lainnya. Ini akan langsung menaikkan nilai Anda di mata penguji.
*   **Pamerkan Fitur Cetak PDF**: Cetak bukti reservasi dari sisi customer, lalu cetak Laporan Resmi dari sisi admin. Layout cetak yang rapi tanpa menyertakan elemen web (navbar/footer) menunjukkan kerapian coding Anda.
