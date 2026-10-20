<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:8', 'confirmed'],
            'phone_number' => ['required', 'string', 'min:9', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'         => 'Nama lengkap wajib diisi.',
            'name.max'              => 'Nama lengkap maksimal 255 karakter.',
            'email.required'        => 'Alamat email wajib diisi.',
            'email.email'           => 'Format alamat email tidak valid.',
            'email.unique'          => 'Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
            'password.required'     => 'Kata sandi wajib diisi.',
            'password.min'          => 'Kata sandi minimal terdiri dari 8 karakter.',
            'password.confirmed'    => 'Konfirmasi kata sandi tidak cocok.',
            'phone_number.required' => 'Nomor WhatsApp / telepon wajib diisi.',
            'phone_number.min'      => 'Nomor telepon minimal 9 digit.',
            'phone_number.max'      => 'Nomor telepon maksimal 20 digit.',
        ];
    }
}
