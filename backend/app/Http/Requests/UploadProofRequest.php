<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_proof' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_proof.required' => 'Please upload a payment proof image.',
            'payment_proof.image'    => 'The file must be a valid image.',
            'payment_proof.mimes'    => 'Accepted formats: JPG, JPEG, PNG, WEBP.',
            'payment_proof.max'      => 'The image must not exceed 2MB.',
        ];
    }
}
