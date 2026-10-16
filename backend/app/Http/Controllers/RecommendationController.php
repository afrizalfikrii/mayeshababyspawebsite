<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceResource;
use App\Services\RecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function __construct(private readonly RecommendationService $recommendationService)
    {
    }

    /**
     * GET /api/recommendations
     *
     * Mengembalikan Top-3 rekomendasi layanan untuk pelanggan yang sedang login,
     * menggunakan Content-Based Filtering (Cosine Similarity).
     *
     * Response tiap layanan menyertakan `similarity_score` (0–1):
     * - null  → hasil cold start (belum ada riwayat), diurutkan berdasarkan popularitas
     * - 0–1   → skor kemiripan dengan profil preferensi pelanggan
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $topN            = min((int) $request->query('top', 3), 10); // default 3, maks 10
        $recommendations = $this->recommendationService->recommend($user, $topN);

        $isColdStart   = $recommendations->every(fn($s) => is_null($s->similarity_score));
        $coldStartType = $this->recommendationService->coldStartType; // 'age_based' | 'general' | null

        return response()->json([
            'success'    => true,
            'message'    => match (true) {
                $coldStartType === RecommendationService::COLD_START_AGE_BASED
                    => 'Rekomendasi layanan terpopuler sesuai usia si Kecil (belum ada riwayat reservasi).',
                $isColdStart
                    => 'Rekomendasi berdasarkan layanan terpopuler (belum ada riwayat reservasi).',
                default
                    => 'Rekomendasi layanan berhasil dikalkulasi.',
            },
            'is_cold_start'   => $isColdStart,
            'cold_start_type' => $coldStartType,
            'data'       => ServiceResource::collection($recommendations),
        ]);
    }
}
