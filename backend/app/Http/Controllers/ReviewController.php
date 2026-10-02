<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    // Simpan rating dan ulasan untuk reservasi yang sudah selesai
    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        // Pastikan reservasi ini milik user yang sedang login
        if ($reservation->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action.',
            ], 403);
        }

        // Ulasan hanya bisa diberikan untuk reservasi yang sudah selesai
        if ($reservation->status !== Reservation::STATUS_COMPLETED) {
            return response()->json([
                'success' => false,
                'message' => 'Anda hanya bisa memberikan ulasan untuk sesi spa yang sudah selesai.',
            ], 400);
        }

        // Cek agar tidak terjadi duplikasi ulasan
        $exists = Review::where('reservation_id', $reservation->id)->exists();
        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah memberikan ulasan untuk reservasi ini.',
            ], 400);
        }

        // Validasi input rating dan komentar ulasan
        $validated = $request->validate([
            'rating'  => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        // Simpan ulasan ke tabel reviews
        $review = Review::create([
            'reservation_id' => $reservation->id,
            'user_id'        => $request->user()->id,
            'service_id'     => $reservation->service_id,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ulasan Anda berhasil dikirim! Terima kasih atas feedback-nya.',
            'data'    => $review,
        ], 201);
    }

    // Mengambil 6 ulasan terbaru untuk ditampilkan di halaman landing page
    public function index(): JsonResponse
    {
        $reviews = Review::with(['user', 'service'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(function ($review) {
                return [
                    'id'           => $review->id,
                    'rating'       => $review->rating,
                    'comment'      => $review->comment,
                    'user_name'    => $review->user ? $review->user->name : 'Bunda Anonim',
                    'service_name' => $review->service ? $review->service->name : 'Layanan Spa',
                    'created_at'   => $review->created_at->toISOString(),
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Reviews retrieved successfully.',
            'data'    => $reviews,
        ]);
    }
}
