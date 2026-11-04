<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the response headers required by docs/SPEC.md ("Server-Härtung") on every response.
 *
 * The CSP has no 'unsafe-inline' for scripts. Inertia injects inline <style> elements (progress bar,
 * error dialog); they carry a per-request nonce, which the page passes on via <meta name="csp-nonce">.
 * Source: https://inertiajs.com/docs/v3/installation/client-side-setup (createInertiaApp nonce option).
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = base64_encode(random_bytes(16));
        $request->attributes->set('csp_nonce', $nonce);
        Vite::useCspNonce($nonce);

        $response = $next($request);

        $response->headers->set('Content-Security-Policy', $this->contentSecurityPolicy($nonce));
        $response->headers->set('Cache-Control', 'no-store');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Robots-Tag', 'noindex');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

        return $response;
    }

    private function contentSecurityPolicy(string $nonce): string
    {
        $dev = $this->viteDevOrigins();

        $directives = [
            "default-src 'none'",
            "script-src 'self'".$dev['http'],
            "style-src 'self' 'nonce-{$nonce}'".$dev['http'],
            "font-src 'self'".$dev['http'],
            "img-src 'self'",
            "connect-src 'self'".$dev['http'].$dev['ws'],
            "frame-ancestors 'none'",
            "base-uri 'none'",
            "form-action 'self'",
        ];

        return implode('; ', $directives);
    }

    /**
     * Only while the Vite dev server runs (public/hot exists) and only in the local environment.
     *
     * @return array{http: string, ws: string}
     */
    private function viteDevOrigins(): array
    {
        $none = ['http' => '', 'ws' => ''];
        $hot = public_path('hot');

        if (! app()->environment('local') || ! is_file($hot)) {
            return $none;
        }

        $parts = parse_url(trim((string) file_get_contents($hot)));
        if (! isset($parts['scheme'], $parts['host'])) {
            return $none;
        }

        $host = str_contains($parts['host'], ':') ? "[{$parts['host']}]" : $parts['host'];
        $authority = $host.(isset($parts['port']) ? ":{$parts['port']}" : '');
        $wsScheme = $parts['scheme'] === 'https' ? 'wss' : 'ws';

        return ['http' => " {$parts['scheme']}://{$authority}", 'ws' => " {$wsScheme}://{$authority}"];
    }
}
