<?php

namespace App\Http\Throttling;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Named limiters from docs/SPEC.md ("Server-Härtung"). Routes use them as throttle:<name>.
 *
 * The limiter key is an HMAC of the client IP under APP_KEY, so neither the cache nor any log ever
 * holds a raw IP (CLAUDE.md invariant). HMAC-SHA-256 per RFC 2104.
 */
final class RateLimits
{
    public const CREATE = 'secrets-create';

    public const PARAMS = 'secrets-params';

    public const OPEN = 'secrets-open';

    public const DESTROY = 'secrets-destroy';

    public const STATUS = 'secrets-status';

    public static function register(): void
    {
        RateLimiter::for(self::CREATE, fn (Request $r) => Limit::perHour((int) config('secrets.create_per_hour', 20))->by(self::key($r, self::CREATE)));
        RateLimiter::for(self::PARAMS, fn (Request $r) => Limit::perMinute(60)->by(self::key($r, self::PARAMS)));
        RateLimiter::for(self::OPEN, fn (Request $r) => Limit::perMinute(30)->by(self::key($r, self::OPEN)));
        RateLimiter::for(self::DESTROY, fn (Request $r) => Limit::perMinute(30)->by(self::key($r, self::DESTROY)));
        RateLimiter::for(self::STATUS, fn (Request $r) => Limit::perMinute(60)->by(self::key($r, self::STATUS)));
    }

    public static function key(Request $request, string $limiter): string
    {
        return hash_hmac('sha256', $limiter.'|'.self::network((string) $request->ip()), (string) config('app.key'));
    }

    /**
     * Fasst Adressen eines Anschlusses zusammen: IPv4 bleibt, IPv6 zählt nach dem /64-Präfix (ein Endkunde bekommt meist
     * ein ganzes /64 und könnte sonst mit jeder Anfrage eine neue Adresse nehmen), IPv4-in-IPv6 zählt als IPv4.
     */
    public static function network(string $ip): string
    {
        $packed = @inet_pton($ip);
        if ($packed === false || strlen($packed) !== 16) {
            return $ip;
        }
        if (str_starts_with($packed, str_repeat("\0", 10)."\xff\xff")) {
            return (string) inet_ntop(substr($packed, 12));
        }

        return (string) inet_ntop(substr($packed, 0, 8).str_repeat("\0", 8));
    }
}
