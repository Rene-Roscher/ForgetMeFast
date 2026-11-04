<?php

namespace App\Http\Requests;

use App\Rules\Base64Url;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class OpenSecretRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['proof' => ['required', Base64Url::bytes(32)]];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (array_keys($this->json()->all()) !== ['proof']) {
                $validator->errors()->add('body', 'Unknown fields.');
            }
        }];
    }
}
