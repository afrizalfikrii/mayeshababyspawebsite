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
            'service_id.required'             => 'Pilihan layanan wajib dipilih.',
            'service_id.exists'               => 'Layanan yang dipilih tidak valid atau tidak ditemukan.',
            'reservation_date.required'       => 'Tanggal reservasi wajib dipilih.',
            'reservation_date.after_or_equal' => 'Tanggal reservasi minimal hari ini atau hari yang akan datang.',
            'start_time.required'             => 'Jam sesi reservasi wajib dipilih.',
            'start_time.date_format'          => 'Format jam harus dalam format JJ:MM (contoh: 09:00).',
            'baby_id.exists'                  => 'Profil anak yang dipilih tidak valid.',
            'baby_age.min'                    => 'Usia anak minimal 1 bulan.',
        ];
    }
}
