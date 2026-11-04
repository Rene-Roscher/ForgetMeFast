<?php

namespace App\Actions;

use App\Models\Secret;
use App\Rules\Base64Url;
use Carbon\CarbonImmutable;

final class GetSecretStatus
{
    /**
     * Zustand für den Ersteller (Verlauf im Browser). Nur mit dem richtigen Verwaltungstoken; sonst, und bei unbekannt,
     * abgelaufen, vernichtet und verbraucht, null (dieselbe einheitliche 404 wie überall). Ändert keinen Zustand.
     *
     * @return array{views_used: int, max_views: int, failed_attempts: int, max_attempts: int, expires_at: string}|null
     */
    public function handle(string $id, string $manageToken): ?array
    {
        $secret = Secret::query()->whereKey($id)->availableAt(CarbonImmutable::now())
            ->first(['manage_hash', 'views_used', 'max_views', 'failed_attempts', 'max_attempts', 'expires_at']);

        if ($secret === null || ! hash_equals($secret->manage_hash, Base64Url::encode(hash('sha256', $manageToken, true)))) {
            return null;
        }

        return [
            'views_used' => (int) $secret->views_used,
            'max_views' => (int) $secret->max_views,
            'failed_attempts' => (int) $secret->failed_attempts,
            'max_attempts' => (int) $secret->max_attempts,
            'expires_at' => CarbonImmutable::instance($secret->expires_at)->toIso8601String(),
        ];
    }
}
