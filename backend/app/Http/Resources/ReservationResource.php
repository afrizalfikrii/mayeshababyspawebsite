<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'booking_code'        => $this->booking_code,
            'reservation_date'    => $this->reservation_date?->toDateString(),
            'start_time'          => $this->start_time,
            'end_time'            => $this->end_time,
            'total_price'         => (float) $this->total_price,
            'status'              => $this->status,
            'payment_proof_url'   => $this->payment_proof_path
                ? (str_starts_with($this->payment_proof_path, 'http')
                    ? $this->payment_proof_path
                    : Storage::url($this->payment_proof_path))
                : null,
            'expires_at'          => $this->expires_at?->toISOString(),
            'baby_name'           => $this->baby_name,
            'baby_age'            => (int) $this->baby_age,
            'notes'               => $this->notes,
            'created_at'          => $this->created_at?->toISOString(),
            'updated_at'          => $this->updated_at?->toISOString(),
            'user'                => new UserResource($this->whenLoaded('user')),
            'service'             => new ServiceResource($this->whenLoaded('service')),
            'therapist'           => $this->relationLoaded('therapist') && $this->therapist
                ? [
                    'id'   => $this->therapist->id,
                    'name' => $this->therapist->name,
                  ]
                : null,
            'review'              => $this->relationLoaded('review') && $this->review
                ? [
                    'id'      => $this->review->id,
                    'rating'  => (int) $this->review->rating,
                    'comment' => $this->review->comment,
                  ]
                : null,
            'baby_id'             => $this->baby_id,
            'baby'                => $this->relationLoaded('baby') && $this->baby
                ? [
                    'id'         => $this->baby->id,
                    'name'       => $this->baby->name,
                    'birth_date' => $this->baby->birth_date->toDateString(),
                    'notes'      => $this->baby->notes,
                  ]
                : null,
            // Reschedule flag
            'is_rescheduled'      => $this->notes ? str_contains($this->notes, '[Rescheduled]') : false,
            'delivery_address'    => $this->delivery_address,
        ];
    }
}
