<?php

namespace App\Actions;

use App\Models\Secret;
use Carbon\CarbonImmutable;

final class PruneSecrets
{
    /**
     * Idempotent: markiert Abgelaufene als vernichtet (Ciphertext NULL) und löscht dann alle vernichteten Zeilen.
     * Öffnen prüft expires_at selbst; der Job räumt nur auf.
     *
     * @return array{expired: int, deleted: int}
     */
    public function handle(): array
    {
        $now = CarbonImmutable::now();
        $expired = Secret::query()->whereNull('destroyed_at')->where('expires_at', '<=', $now)
            ->update(['ciphertext' => null, 'destroyed_at' => $now, 'destroyed_reason' => 'expired']);
        $deleted = Secret::query()->whereNotNull('destroyed_at')->delete();

        return ['expired' => $expired, 'deleted' => $deleted];
    }
}
