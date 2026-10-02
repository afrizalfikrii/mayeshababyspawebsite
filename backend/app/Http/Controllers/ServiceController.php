<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;

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
            'message' => 'Services retrieved successfully.',
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
            'message' => 'Therapists retrieved successfully.',
            'data'    => $therapists,
        ]);
    }
}
