<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:255'],
            'description'      => ['required', 'string'],
            'duration_minutes' => ['required', 'integer', 'min:1'],
            'price'            => ['required', 'numeric', 'min:0'],
            'is_active'        => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'             => 'Nama layanan wajib diisi.',
            'name.max'                  => 'Nama layanan maksimal 255 karakter.',
            'description.required'      => 'Deskripsi layanan wajib diisi.',
            'duration_minutes.required' => 'Durasi layanan wajib diisi.',
            'duration_minutes.integer'  => 'Durasi layanan harus berupa angka menit.',
            'duration_minutes.min'      => 'Durasi layanan minimal 1 menit.',
            'price.required'            => 'Harga layanan wajib diisi.',
            'price.numeric'             => 'Harga layanan harus berupa angka.',
            'price.min'                 => 'Harga layanan tidak boleh bernilai negatif.',
        ];
    }
}
