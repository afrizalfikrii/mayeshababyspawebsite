<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;

class ServiceController extends Controller
{
    /**
     * List all services (admin sees all, including inactive).
     */
    public function index(): JsonResponse
    {
        $services = Service::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'Services retrieved successfully.',
            'data' => ServiceResource::collection($services),
        ]);
    }

    /**
     * Show a specific service.
     */
    public function show(Service $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Service retrieved successfully.',
            'data' => new ServiceResource($service),
        ]);
    }

    /**
     * Create a new service.
     */
    public function store(StoreServiceRequest $request): JsonResponse
    {
        try {
            $service = Service::create($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully.',
                'data' => new ServiceResource($service),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Update an existing service.
     */
    public function update(UpdateServiceRequest $request, Service $service): JsonResponse
    {
        try {
            $service->update($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully.',
                'data' => new ServiceResource($service->fresh()),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Delete a service.
     */
    public function destroy(Service $service): JsonResponse
    {
        try {
            // Check if any confirmed/active reservations exist for this service
            $activeReservations = $service->reservations()
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->count();

            if ($activeReservations > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete service with active reservations. Deactivate it instead.',
                    'data' => null,
                ], 422);
            }

            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully.',
                'data' => null,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
