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
            'message' => 'Data seluruh layanan berhasil dimuat.',
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
            'message' => 'Data layanan berhasil dimuat.',
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
                'message' => 'Layanan baru berhasil ditambahkan.',
                'data' => new ServiceResource($service),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan layanan: ' . $e->getMessage(),
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
                'message' => 'Data layanan berhasil diperbarui.',
                'data' => new ServiceResource($service->fresh()),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui layanan: ' . $e->getMessage(),
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
                    'message' => 'Layanan tidak dapat dihapus karena masih terkait reservasi aktif. Anda dapat menonaktifkan statusnya.',
                    'data' => null,
                ], 422);
            }

            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Layanan berhasil dihapus.',
                'data' => null,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus layanan: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
