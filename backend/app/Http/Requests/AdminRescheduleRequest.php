<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation for admin-initiated reschedule.
 * Admin changes the date and start_time of an existing confirmed reservation
 * after coordinating with the customer (e.g., via WhatsApp).
 */
class AdminRescheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reservation_date' => ['required', 'date'],
            'start_time'       => ['required', 'date_format:H:i'],
            'notes'            => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'reservation_date.required' => 'Tanggal baru wajib diisi.',
            'reservation_date.date'     => 'Format tanggal tidak valid.',
            'start_time.required'       => 'Jam baru wajib diisi.',
            'start_time.date_format'    => 'Format jam harus HH:MM (contoh: 13:00).',
        ];
    }
}
