<?php

namespace App\Actions;

use App\Models\Secret;
use Carbon\CarbonImmutable;

final class GetSecretParams
{
    /**
     * Liefert Header-Felder und max_attempts oder null ("nicht verfügbar"). Ändert keinen Zustand.
     *
     * @return array{v: int, kdf: array{name: string, m: int, t: int, p: int}, salt: string, max_attempts: int}|null
     */
    public function handle(string $id): ?array
    {
        $secret = Secret::query()->whereKey($id)->availableAt(CarbonImmutable::now())
            ->whereColumn('failed_attempts', '<', 'max_attempts')->whereColumn('views_used', '<', 'max_views')
            ->first(['v', 'kdf_name', 'kdf_m', 'kdf_t', 'kdf_p', 'salt', 'max_attempts']);

        if ($secret === null) {
            return null;
        }

        return [
            'v' => (int) $secret->v,
            'kdf' => ['name' => $secret->kdf_name, 'm' => (int) $secret->kdf_m, 't' => (int) $secret->kdf_t, 'p' => (int) $secret->kdf_p],
            'salt' => $secret->salt,
            'max_attempts' => (int) $secret->max_attempts,
        ];
    }
}
