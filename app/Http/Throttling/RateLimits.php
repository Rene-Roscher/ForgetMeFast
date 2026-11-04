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

    public static function register(): void
    {
        RateLimiter::for(self::CREATE, fn (Request $r) => Limit::perHour(20)->by(self::key($r, self::CREATE)));
        RateLimiter::for(self::PARAMS, fn (Request $r) => Limit::perMinute(60)->by(self::key($r, self::PARAMS)));
        RateLimiter::for(self::OPEN, fn (Request $r) => Limit::perMinute(30)->by(self::key($r, self::OPEN)));
        RateLimiter::for(self::DESTROY, fn (Request $r) => Limit::perMinute(30)->by(self::key($r, self::DESTROY)));
    }

    public static function key(Request $request, string $limiter): string
    {
        return hash_hmac('sha256', $limiter.'|'.$request->ip(), (string) config('app.key'));
    }
}
