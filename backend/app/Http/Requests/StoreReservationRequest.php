<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id'       => ['required', 'integer', 'exists:services,id'],
            'reservation_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time'       => ['required', 'date_format:H:i'],
            'baby_id'          => ['nullable', 'integer', 'exists:babies,id'],
            'baby_name'        => ['nullable', 'string', 'max:255'],
            'baby_age'         => ['nullable', 'integer', 'min:1'],
            'notes'            => ['nullable', 'string', 'max:1000'],
            'therapist_id'     => ['nullable', 'integer', 'exists:therapists,id'],
            'delivery_address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'reservation_date.after_or_equal' => 'The reservation date must be today or a future date.',
            'start_time.date_format'           => 'The start time must be in HH:MM format (e.g., 09:00).',
        ];
    }
}
