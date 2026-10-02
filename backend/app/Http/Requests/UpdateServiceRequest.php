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
}
