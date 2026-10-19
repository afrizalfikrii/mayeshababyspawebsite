<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'string', 'in:confirmed,cancelled,completed'],
            'notes'  => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'action.required' => 'Status tindakan verifikasi wajib dipilih.',
            'action.in'       => 'Tindakan harus berupa dikonfirmasi (confirmed), dibatalkan (cancelled), atau selesai (completed).',
            'notes.max'       => 'Catatan maksimal 500 karakter.',
        ];
    }
}
