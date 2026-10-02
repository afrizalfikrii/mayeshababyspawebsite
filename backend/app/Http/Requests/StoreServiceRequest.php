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
}
