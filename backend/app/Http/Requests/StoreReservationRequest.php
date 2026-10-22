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

    /**
     * Configure the validator instance with custom datetime validation.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('reservation_date') && $this->filled('start_time')) {
                try {
                    $sessionDateTime = \Carbon\Carbon::createFromFormat(
                        'Y-m-d H:i',
                        "{$this->reservation_date} {$this->start_time}",
                        'Asia/Jakarta'
                    );

                    if ($sessionDateTime->lessThanOrEqualTo(\Carbon\Carbon::now('Asia/Jakarta'))) {
                        $validator->errors()->add(
                            'start_time',
                            'Jam sesi yang Anda pilih sudah lewat untuk hari ini. Silakan pilih jam atau tanggal berikutnya.'
                        );
                    }
                } catch (\Throwable $e) {
                    // Ignore format parsing exceptions (handled by date_format validation)
                }
            }
        });
    }
}
