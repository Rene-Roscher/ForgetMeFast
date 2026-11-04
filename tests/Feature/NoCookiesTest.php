<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;

it('sets no cookie on any response', function (string $path) {
    $response = $this->get($path);

    expect($response->headers->getCookies())->toBeEmpty()
        ->and($response->headers->has('Set-Cookie'))->toBeFalse();
})->with(['/', '/does-not-exist', '/up']);

it('sets no cookie when a route flashes validation errors', function () {
    Route::middleware('web')->post('/__probe', fn () => back()->withErrors(['x' => 'y']));

    $response = $this->post('/__probe');

    expect($response->headers->has('Set-Cookie'))->toBeFalse();
});

it('keeps the web group free of session, cookie and CSRF middleware', function () {
    $web = app(Kernel::class)->getMiddlewareGroups()['web'];

    expect($web)->not->toContain(StartSession::class)
        ->and($web)->not->toContain(EncryptCookies::class)
        ->and($web)->not->toContain(PreventRequestForgery::class);
});
