<?php

namespace App\Http\Controllers;

use App\Models\Baby;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BabyController extends Controller
{
    // Mengambil data semua bayi milik user yang sedang login
    public function index(Request $request): JsonResponse
    {
        $babies = $request->user()->babies()->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'Data profil si Kecil berhasil dimuat.',
            'data'    => $babies,
        ]);
    }

    // Menambah data bayi baru ke database
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\'\.\-]+$/'],
            'birth_date' => ['required', 'date', 'before_or_equal:today'],
            'notes'      => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required'              => 'Nama si Kecil wajib diisi.',
            'name.max'                   => 'Nama si Kecil maksimal 255 karakter.',
            'name.regex'                 => 'Nama si Kecil hanya boleh berisi huruf dan spasi (tidak boleh angka).',
            'birth_date.required'        => 'Tanggal lahir si Kecil wajib diisi.',
            'birth_date.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
        ]);

        $baby = $request->user()->babies()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil si Kecil berhasil ditambahkan.',
            'data'    => $baby,
        ], 201);
    }

    // Update data profil bayi
    public function update(Request $request, Baby $baby): JsonResponse
    {
        // Validasi kepemilikan data bayi
        if ($baby->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke profil anak ini.',
            ], 403);
        }

        $validated = $request->validate([
            'name'       => ['sometimes', 'required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\'\.\-]+$/'],
            'birth_date' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'notes'      => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required'              => 'Nama si Kecil wajib diisi.',
            'name.max'                   => 'Nama si Kecil maksimal 255 karakter.',
            'name.regex'                 => 'Nama si Kecil hanya boleh berisi huruf dan spasi (tidak boleh angka).',
            'birth_date.required'        => 'Tanggal lahir si Kecil wajib diisi.',
            'birth_date.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
        ]);

        $baby->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil si Kecil berhasil diperbarui.',
            'data'    => $baby,
        ]);
    }

    // Hapus data bayi
    public function destroy(Request $request, Baby $baby): JsonResponse
    {
        // Pastikan user adalah pemilik data bayi
        if ($baby->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke profil anak ini.',
            ], 403);
        }

        $baby->delete();

        return response()->json([
            'success' => true,
            'message' => 'Profil si Kecil berhasil dihapus.',
            'data'    => null,
        ]);
    }
}
