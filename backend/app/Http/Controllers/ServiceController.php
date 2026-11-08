<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Services\SupabaseStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    /**
     * List all active services (public endpoint).
     */
    public function index(): JsonResponse
    {
        $services = Service::active()->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar layanan berhasil dimuat.',
            'data'    => ServiceResource::collection($services),
        ]);
    }

    /**
     * Lightweight keep-alive endpoint for Render, TiDB Cloud, and Supabase Storage.
     */
    public function keepAlive(): JsonResponse
    {
        $dbOk       = false;
        $supabaseOk = false;

        try {
            DB::select('SELECT 1');
            $dbOk = true;
        } catch (\Throwable) {
        }

        try {
            $supabaseOk = app(SupabaseStorageService::class)->ping();
        } catch (\Throwable) {
        }

        return response()->json([
            'success'  => true,
            'database' => $dbOk,
            'supabase' => $supabaseOk,
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
