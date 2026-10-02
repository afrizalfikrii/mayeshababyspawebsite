<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Therapist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TherapistController extends Controller
{
    // Menampilkan list semua terapis untuk halaman admin
    public function index(): JsonResponse
    {
        $therapists = Therapist::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'All therapists retrieved successfully.',
            'data'    => $therapists,
        ]);
    }

    // Menambah data terapis baru
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $therapist = Therapist::create([
            'name'      => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Therapist created successfully.',
            'data'    => $therapist,
        ], 201);
    }

    // Menampilkan detail terapis tertentu
    public function show(Therapist $therapist): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Therapist retrieved successfully.',
            'data'    => $therapist,
        ]);
    }

    // Update data terapis (misal nama atau status aktif/nonaktif)
    public function update(Request $request, Therapist $therapist): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $therapist->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Therapist updated successfully.',
            'data'    => $therapist,
        ]);
    }

    // Menghapus data terapis
    public function destroy(Therapist $therapist): JsonResponse
    {
        // Validasi: terapis tidak boleh dihapus kalau masih ada jadwal booking aktif
        $hasBookings = $therapist->reservations()->whereIn('status', ['pending', 'waiting_verification', 'confirmed'])->exists();

        if ($hasBookings) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete therapist. They have active/pending reservations.',
            ], 422);
        }

        $therapist->delete();

        return response()->json([
            'success' => true,
            'message' => 'Therapist deleted successfully.',
            'data'    => null,
        ]);
    }
}
