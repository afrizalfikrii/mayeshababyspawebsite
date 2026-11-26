<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\BabyController;
use App\Http\Controllers\RecommendationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Mayesha Baby Spa
|--------------------------------------------------------------------------
*/

// Auth (Register & Login) dengan proteksi Rate Limiting (Anti Brute-Force)
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:10,1')->name('login');

// Route Public (Bisa diakses tanpa login)
Route::get('/keep-alive', [ServiceController::class, 'keepAlive']);
Route::get('/services',   [ServiceController::class, 'index']);
Route::get('/reviews',    [ReviewController::class, 'index']);

// Route yang wajib menggunakan Token (Sanctum)
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);
    Route::put('/me',      [AuthController::class, 'updateProfile']);
    Route::get('/therapists', [ServiceController::class, 'therapists']);

    // Route khusus Customer
    Route::middleware('role:customer')->group(function () {
        Route::get('/reservations',                             [ReservationController::class, 'index']);
        Route::post('/reservations',                            [ReservationController::class, 'store'])->middleware('throttle:6,1');
        Route::post('/reservations/{reservation}/upload-proof', [ReservationController::class, 'uploadProof'])->middleware('throttle:6,1');
        Route::post('/reservations/{reservation}/reschedule',   [ReservationController::class, 'reschedule']);
        Route::post('/reservations/{reservation}/reviews',      [ReviewController::class, 'store']);
        
        // Cek ketersediaan slot berdasarkan tanggal & layanan (untuk UI dinamis di halaman booking)
        Route::get('/slot-availability',                        [ReservationController::class, 'checkSlotAvailability']);

        // CRUD Profil Bayi
        Route::apiResource('/babies', BabyController::class);

        // Rekomendasi Layanan (Content-Based Filtering)
        Route::get('/recommendations', [RecommendationController::class, 'index']);
    });

    // Route khusus Admin
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        // Statistik Dashboard Admin
        Route::get('/stats',                              [Admin\ReservationController::class, 'stats']);

        // Verifikasi & List Reservasi
        Route::get('/reservations',                            [Admin\ReservationController::class, 'index']);
        Route::post('/reservations/{reservation}/verify',      [Admin\ReservationController::class, 'verify']);
        Route::post('/reservations/{reservation}/reschedule',  [Admin\ReservationController::class, 'reschedule']);


        // CRUD Layanan & Terapis
        Route::apiResource('/services', Admin\ServiceController::class);
        Route::apiResource('/therapists', Admin\TherapistController::class);
    });
});
