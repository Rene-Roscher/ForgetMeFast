<?php

namespace App\Http\Requests;

use App\Rules\Base64Url;
use App\Rules\StrictInteger;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Strenge Validierung für POST /api/secrets: Wertebereiche, Größen, base64url, unbekannte Felder werden abgewiesen.
 * Der Server nimmt nie absolute Zeiten vom Client an, nur `ttl` aus einer Liste.
 */
class CreateSecretRequest extends FormRequest
{
    private const FIELDS = ['id', 'v', 'kdf', 'salt', 'iv', 'ciphertext', 'verifier', 'manage_hash', 'ttl', 'max_views', 'max_attempts'];

    private const KDF_FIELDS = ['name', 'm', 't', 'p'];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $kdf = config('secrets.kdf');
        $count = config('secrets.max_count');
        $ttl = array_values(array_filter(config('secrets.ttl_options'), fn (int $t) => $t <= config('secrets.max_ttl')));
        $sealed = array_map(fn (int $b) => $b + config('secrets.tag_bytes'), config('secrets.buckets'));

        return [
            'id' => ['required', Base64Url::bytes(16)],
            'v' => ['required', new StrictInteger(allowed: [1])],
            'kdf' => ['required', 'array'],
            'kdf.name' => ['required', 'in:'.$kdf['name']],
            'kdf.m' => ['required', new StrictInteger($kdf['m_min'], $kdf['m_max'])],
            'kdf.t' => ['required', new StrictInteger($kdf['t_min'], $kdf['t_max'])],
            'kdf.p' => ['required', new StrictInteger(allowed: [$kdf['p']])],
            'salt' => ['required', Base64Url::bytes(16)],
            'iv' => ['required', Base64Url::bytes(12)],
            // Chiffretext = genau eine Bucketgröße plus Tag (docs/CRYPTO-NOTES.md).
            'ciphertext' => ['required', Base64Url::bytes(...$sealed)],
            'verifier' => ['required', Base64Url::bytes(32)],
            'manage_hash' => ['required', Base64Url::bytes(32)],
            'ttl' => ['required', new StrictInteger(allowed: $ttl)],
            'max_views' => ['required', new StrictInteger(1, $count)],
            'max_attempts' => ['required', new StrictInteger(1, $count)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $input = $this->json()->all();
            if (array_diff(array_keys($input), self::FIELDS) !== []) {
                $validator->errors()->add('body', 'Unknown fields.');
            }
            if (is_array($input['kdf'] ?? null) && array_diff(array_keys($input['kdf']), self::KDF_FIELDS) !== []) {
                $validator->errors()->add('kdf', 'Unknown fields.');
            }
        }];
    }
}
