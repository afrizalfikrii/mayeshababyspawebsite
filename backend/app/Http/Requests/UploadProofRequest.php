<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_proof' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_proof.required' => 'Silakan unggah foto bukti pembayaran terlebih dahulu.',
            'payment_proof.image'    => 'File yang diunggah harus berupa gambar yang valid.',
            'payment_proof.mimes'    => 'Format gambar yang didukung: JPG, JPEG, PNG, atau WEBP.',
            'payment_proof.max'      => 'Ukuran foto bukti pembayaran maksimal 2MB.',
        ];
    }
}
