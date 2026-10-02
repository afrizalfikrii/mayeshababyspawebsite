<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'description'      => $this->description,
            'duration_minutes' => $this->duration_minutes,
            'price'            => (float) $this->price,
            'is_active'        => $this->is_active,
            // Kolom CBF
            'category'         => $this->category,
            'age_min_months'   => $this->age_min_months,
            'age_max_months'   => $this->age_max_months,
            // Hanya ada saat endpoint rekomendasi (null = cold-start / bukan endpoint CBF)
            'similarity_score' => isset($this->similarity_score)
                ? round((float) $this->similarity_score, 4)
                : null,
            'created_at'       => $this->created_at?->toISOString(),
            'updated_at'       => $this->updated_at?->toISOString(),
        ];
    }
}
