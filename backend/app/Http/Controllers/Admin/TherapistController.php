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
            'message' => 'Data seluruh terapis berhasil dimuat.',
            'data'    => $therapists,
        ]);
    }

    // Menambah data terapis baru
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Nama terapis wajib diisi.',
            'name.max'      => 'Nama terapis maksimal 255 karakter.',
        ]);

        $therapist = Therapist::create([
            'name'      => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data terapis berhasil ditambahkan.',
            'data'    => $therapist,
        ], 201);
    }

    // Menampilkan detail terapis tertentu
    public function show(Therapist $therapist): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Data detail terapis berhasil dimuat.',
            'data'    => $therapist,
        ]);
    }

    // Update data terapis (misal nama atau status aktif/nonaktif)
    public function update(Request $request, Therapist $therapist): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ], [
            'name.required' => 'Nama terapis wajib diisi.',
            'name.max'      => 'Nama terapis maksimal 255 karakter.',
        ]);

        $therapist->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data terapis berhasil diperbarui.',
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
                'message' => 'Terapis tidak dapat dihapus karena masih memiliki jadwal reservasi aktif atau pending.',
            ], 422);
        }

        $therapist->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data terapis berhasil dihapus.',
            'data'    => null,
        ]);
    }
}
