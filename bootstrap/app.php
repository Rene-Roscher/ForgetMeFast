<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LimitBodySize;
use App\Http\Middleware\SecurityHeaders;
use App\Http\TrustedProxies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(SecurityHeaders::class);
        $middleware->alias(['body.max' => LimitBodySize::class]);
        // Nur ausdrücklich genannte Proxys dürfen die Client-Adresse per X-Forwarded-For setzen (siehe TrustedProxies).
        // Der Host-Header gehört nicht dazu, damit niemand die Adresse der Seite fälschen kann.
        $middleware->trustProxies(
            at: TrustedProxies::fromEnv(env('TRUSTED_PROXIES')),
            headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_PORT,
        );
        // No cookies, no session, no CSRF token: the endpoints are stateless and unauthenticated (ADR 0003).
        $middleware->removeFromGroup('web', [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            PreventRequestForgery::class,
        ]);
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Unbekannte Pfade und falsche Methoden unter /api sehen aus wie ein nicht verfügbares Secret (keine Framework-Details).
        $exceptions->render(fn (NotFoundHttpException|MethodNotAllowedHttpException $e, Request $request) => $request->is('api/*')
            ? response()->json(['message' => 'unavailable'], 404)
            : null);
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
