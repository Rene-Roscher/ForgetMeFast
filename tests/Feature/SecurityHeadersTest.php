<?php

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Vite;
use Inertia\DevTools\DevTools;

function cspDirective(string $csp, string $name): string
{
    foreach (explode('; ', $csp) as $directive) {
        if (str_starts_with($directive, $name.' ') || $directive === $name) {
            return $directive;
        }
    }

    return '';
}

it('sends the required headers on a page, a 404 and the health endpoint', function (string $path) {
    $response = $this->get($path);

    // Symfony appends "private" itself, so the header reads "no-store, private".
    expect($response->headers->get('Cache-Control'))->toContain('no-store');

    $response
        ->assertHeader('Referrer-Policy', 'no-referrer')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Robots-Tag', 'noindex')
        ->assertHeader('Permissions-Policy')
        ->assertHeader('Content-Security-Policy');
})->with(['/', '/does-not-exist', '/up']);

it('uses the fixed CSP directives from the spec', function () {
    $csp = $this->get('/')->headers->get('Content-Security-Policy');

    expect(cspDirective($csp, 'default-src'))->toBe("default-src 'none'")
        ->and(cspDirective($csp, 'script-src'))->toBe("script-src 'self'")
        ->and(cspDirective($csp, 'frame-ancestors'))->toBe("frame-ancestors 'none'")
        ->and(cspDirective($csp, 'base-uri'))->toBe("base-uri 'none'")
        ->and(cspDirective($csp, 'form-action'))->toBe("form-action 'self'");
});

it('allows no unsafe keywords and no external origin', function () {
    $csp = $this->get('/')->headers->get('Content-Security-Policy');

    expect($csp)->not->toContain('unsafe-inline')
        ->and($csp)->not->toContain('unsafe-eval')
        ->and($csp)->not->toMatch('#https?://#')
        ->and($csp)->not->toContain('*');
});

it('uses a fresh nonce per request and exposes it to the page', function () {
    $nonces = collect(range(1, 2))->map(function () {
        $response = $this->get('/');
        preg_match("/style-src 'self' 'nonce-([^']+)'/", $response->headers->get('Content-Security-Policy'), $m);
        $response->assertSee('<meta name="csp-nonce" content="'.$m[1].'">', escape: false);

        return $m[1];
    });

    expect($nonces[0])->not->toBe($nonces[1]);
});

it('adds the Vite dev server only in the local environment', function () {
    $hot = storage_path('framework/testing/vite-hot');
    Vite::useHotFile($hot);
    File::put($hot, 'http://localhost:5173');

    try {
        $csp = $this->get('/')->headers->get('Content-Security-Policy');
        expect($csp)->not->toContain('localhost:5173');

        app()->detectEnvironment(fn () => 'local');
        $csp = $this->get('/')->headers->get('Content-Security-Policy');
        expect(cspDirective($csp, 'script-src'))->toBe("script-src 'self' http://localhost:5173")
            ->and(cspDirective($csp, 'connect-src'))->toBe("connect-src 'self' http://localhost:5173 ws://localhost:5173");
    } finally {
        File::delete($hot);
    }
});

it('does not record requests with Inertia DevTools, not even locally', function () {
    app()->detectEnvironment(fn () => 'local');

    expect(DevTools::enabled())->toBeFalse();
});

it('writes a valid CSP source for an IPv6 Vite dev server', function () {
    $hot = storage_path('framework/testing/vite-hot');
    Vite::useHotFile($hot);
    File::put($hot, 'http://[::1]:5173');

    try {
        app()->detectEnvironment(fn () => 'local');
        $csp = $this->get('/')->headers->get('Content-Security-Policy');

        expect(cspDirective($csp, 'script-src'))->toBe("script-src 'self' http://[::1]:5173")
            ->and(cspDirective($csp, 'connect-src'))->toBe("connect-src 'self' http://[::1]:5173 ws://[::1]:5173")
            ->and($csp)->not->toContain('[[');
    } finally {
        File::delete($hot);
    }
});

it('keeps DevTools and SSR off even when the environment says otherwise', function () {
    putenv('INERTIA_DEVTOOLS_ENABLED=true');
    $_ENV['INERTIA_DEVTOOLS_ENABLED'] = 'true';
    config(['inertia.devtools.enabled' => true, 'inertia.ssr.enabled' => true]);

    (new AppServiceProvider(app()))->boot();

    expect(config('inertia.devtools.enabled'))->toBeFalse()
        ->and(config('inertia.ssr.enabled'))->toBeFalse();
});
