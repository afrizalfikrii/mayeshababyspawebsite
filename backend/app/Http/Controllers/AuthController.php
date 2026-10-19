<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            if (! Auth::attempt($request->only('email', 'password'))) {
                throw ValidationException::withMessages([
                    'email' => ['Email atau kata sandi yang Anda masukkan salah.'],
                ]);
            }

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
}
