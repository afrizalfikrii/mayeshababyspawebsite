<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'             => ['sometimes', 'string', 'max:255'],
            'description'      => ['sometimes', 'string'],
            'duration_minutes' => ['sometimes', 'integer', 'min:1'],
            'price'            => ['sometimes', 'numeric', 'min:0'],
            'is_active'        => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.max'                 => 'Nama layanan maksimal 255 karakter.',
            'duration_minutes.integer' => 'Durasi layanan harus berupa angka menit.',
            'duration_minutes.min'     => 'Durasi layanan minimal 1 menit.',
            'price.numeric'            => 'Harga layanan harus berupa angka.',
            'price.min'                => 'Harga layanan tidak boleh bernilai negatif.',
        ];
    }
}
