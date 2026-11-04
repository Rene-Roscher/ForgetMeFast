<?php

namespace App\Actions;

use App\Models\Secret;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;

final class CreateSecret
{
    /**
     * @param  array<string, mixed>  $data  bereits validiert (CreateSecretRequest)
     * @return CarbonImmutable|null expires_at, oder null, wenn die id schon vergeben ist (nie überschreiben)
     */
    public function handle(array $data): ?CarbonImmutable
    {
        $now = CarbonImmutable::now();
        $ttl = min((int) $data['ttl'], (int) config('secrets.max_ttl'));
        $expiresAt = $now->addSeconds($ttl); // der Server rechnet selbst, nie eine absolute Zeit vom Client

        try {
            Secret::query()->forceCreate([
                'id' => $data['id'],
                'v' => $data['v'],
                'kdf_name' => $data['kdf']['name'],
                'kdf_m' => $data['kdf']['m'],
                'kdf_t' => $data['kdf']['t'],
                'kdf_p' => $data['kdf']['p'],
                'salt' => $data['salt'],
                'iv' => $data['iv'],
                'ciphertext' => $data['ciphertext'],
                'verifier' => $data['verifier'],
                'manage_hash' => $data['manage_hash'],
                'max_views' => $data['max_views'],
                'max_attempts' => $data['max_attempts'],
                'expires_at' => $expiresAt,
                'created_at' => $now,
            ]);
        } catch (UniqueConstraintViolationException) {
            return null;
        }

        return $expiresAt;
    }
}
