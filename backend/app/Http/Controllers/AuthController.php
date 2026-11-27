<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new customer account.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = User::create([
                'name'         => $request->name,
                'email'        => $request->email,
                'password'     => $request->password, // auto-hashed via cast
                'phone_number' => $request->phone_number,
                'role'         => 'customer',
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Pendaftaran akun berhasil! Selamat datang di Mayesha Baby Spa.',
                'data'    => [
                    'user'  => new UserResource($user),
                    'token' => $token,
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran akun gagal: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    /**
     * Login and return a Sanctum token.
     * Protected by per-account + IP rate limiting (max 5 failed attempts per minute).
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = Str::transliterate(Str::lower($request->input('email')) . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'success' => false,
                'message' => "Terlalu banyak percobaan masuk yang gagal. Silakan tunggu {$seconds} detik sebelum mencoba kembali.",
                'data'    => [
                    'email' => ["Terlalu banyak percobaan masuk. Coba lagi dalam {$seconds} detik."],
                ],
            ], 429);
        }

        try {
            if (! Auth::attempt($request->only('email', 'password'))) {
                RateLimiter::hit($throttleKey, 60);

                throw ValidationException::withMessages([
                    'email' => ['Email atau kata sandi yang Anda masukkan salah.'],
                ]);
            }

            RateLimiter::clear($throttleKey);

            /** @var User $user */
            $user = Auth::user();

            // Revoke old tokens to allow single active session per device
            $user->tokens()->delete();

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Berhasil masuk! Selamat datang kembali.',
                'data'    => [
                    'user'  => new UserResource($user),
                    'token' => $token,
                ],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.',
                'data'    => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal masuk: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    /**
     * Logout and revoke current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Berhasil keluar dari akun.',
            'data'    => null,
        ]);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Data pengguna berhasil dimuat.',
            'data'    => new UserResource($request->user()),
        ]);
    }

    /**
     * Update authenticated user's profile (name, phone_number, address).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'address'      => ['nullable', 'string', 'max:1000'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data'    => new UserResource($user),
        ]);
    }

    /**
     * Update authenticated user's password and revoke other active sessions.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate(
            [
                'current_password' => ['required', 'string'],
                'password'         => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
            ],
            [
                'current_password.required' => 'Kata sandi saat ini wajib diisi.',
                'password.required'         => 'Kata sandi baru wajib diisi.',
                'password.min'              => 'Kata sandi baru minimal 8 karakter.',
                'password.confirmed'        => 'Konfirmasi kata sandi baru tidak cocok.',
                'password.different'        => 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
            ]
        );

        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Kata sandi saat ini tidak sesuai.',
                'errors'  => [
                    'current_password' => ['Kata sandi saat ini tidak sesuai.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => $validated['password'], // auto-hashed via cast
        ]);

        // Cabut token sesi perangkat lain, pertahankan sesi aktif saat ini
        $currentTokenId = $request->user()->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentTokenId, fn ($query) => $query->where('id', '!=', $currentTokenId))
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kata sandi berhasil diperbarui.',
            'data'    => null,
        ]);
    }
}
