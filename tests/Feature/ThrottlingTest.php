<?php

use App\Http\Throttling\RateLimits;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

it('limits each endpoint class as the spec says', function (string $limiter, int $max) {
    Route::middleware('throttle:'.$limiter)->get('/__throttle/'.$limiter, fn () => 'ok');

    foreach (range(1, $max) as $i) {
        $this->get('/__throttle/'.$limiter)->assertOk();
    }

    $this->get('/__throttle/'.$limiter)->assertStatus(429);
})->with([
    'create 20/h' => [RateLimits::CREATE, 20],
    'params 60/min' => [RateLimits::PARAMS, 60],
    'open 30/min' => [RateLimits::OPEN, 30],
    'destroy 30/min' => [RateLimits::DESTROY, 30],
]);

it('keys the limiter by a salted hash and never by the raw IP', function () {
    $request = Request::create('/', 'GET', server: ['REMOTE_ADDR' => '203.0.113.7']);
    $key = RateLimits::key($request, RateLimits::OPEN);

    expect($key)->toMatch('/^[0-9a-f]{64}$/')
        ->and($key)->not->toContain('203.0.113.7')
        ->and($key)->toBe(hash_hmac('sha256', RateLimits::OPEN.'|203.0.113.7', config('app.key')));

    config(['app.key' => 'base64:'.base64_encode(random_bytes(32))]);
    expect(RateLimits::key($request, RateLimits::OPEN))->not->toBe($key);
});

it('stores no raw IP in the rate limiter cache', function () {
    Route::middleware('throttle:'.RateLimits::OPEN)->get('/__throttle/raw', fn () => 'ok');

    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])->get('/__throttle/raw')->assertOk();

    $storage = (fn () => $this->storage)->call(app('cache')->store()->getStore());

    expect($storage)->not->toBeEmpty()
        ->and(json_encode(array_keys($storage)))->not->toContain('203.0.113.9')
        ->and(json_encode($storage))->not->toContain('203.0.113.9');
});
