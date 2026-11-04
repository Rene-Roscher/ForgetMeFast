<?php

namespace App\Actions;

use App\Models\Secret;
use App\Rules\Base64Url;
use Carbon\CarbonImmutable;

final class DestroySecret
{
    /** true, wenn vernichtet. Unbekannt, schon vernichtet und falsches Token sind für den Aufrufer nicht zu unterscheiden. */
    public function handle(string $id, string $manageToken): bool
    {
        $now = CarbonImmutable::now();
        $row = Secret::query()->whereKey($id)->availableAt($now)->first(['manage_hash']);
        if ($row === null || ! hash_equals($row->manage_hash, Base64Url::encode(hash('sha256', $manageToken, true)))) {
            return false;
        }

        return Secret::query()->whereKey($id)->whereNull('destroyed_at')
            ->update(['ciphertext' => null, 'destroyed_at' => $now, 'destroyed_reason' => 'manual']) === 1;
    }
}
