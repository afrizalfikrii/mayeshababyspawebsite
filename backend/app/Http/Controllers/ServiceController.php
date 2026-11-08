<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Services\SupabaseStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ServiceController extends Controller
{
    /**
     * List all active services (public endpoint).
     */
    public function index(): JsonResponse
    {
        $services = Service::active()->orderBy('name')->get();

        // Keep Supabase active automatically (runs at most once every 12 hours)
        try {
            Cache::remember('supabase_keep_alive_ping', 43200, function () {
                return app(SupabaseStorageService::class)->ping();
            });
        } catch (\Throwable) {
            // Ignore any cache or network error so catalog always loads smoothly
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar layanan berhasil dimuat.',
            'data'    => ServiceResource::collection($services),
        ]);
    }

    /**
     * List active therapists.
     */
    public function therapists(): JsonResponse
    {
        $therapists = \App\Models\Therapist::where('is_active', true)->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar terapis berhasil dimuat.',
            'data'    => $therapists,
        ]);
    }
}
