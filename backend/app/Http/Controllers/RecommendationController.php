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
     * Mengembalikan Top-5 rekomendasi layanan untuk pelanggan yang sedang login,
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

        $topN            = min((int) $request->query('top', 5), 10); // maks 10
        $recommendations = $this->recommendationService->recommend($user, $topN);

        $isColdStart = $recommendations->every(fn($s) => is_null($s->similarity_score));

        return response()->json([
            'success'    => true,
            'message'    => $isColdStart
                ? 'Rekomendasi berdasarkan layanan terpopuler (belum ada riwayat reservasi).'
                : 'Rekomendasi layanan berhasil dikalkulasi.',
            'is_cold_start' => $isColdStart,
            'data'       => ServiceResource::collection($recommendations),
        ]);
    }
}
