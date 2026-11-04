<?php

use App\Actions\PruneSecrets;
use App\Http\Throttling\RateLimits;
use App\Http\TrustedProxies;
use App\Models\Secret;
use App\Rules\Base64Url;
use App\Rules\StrictInteger;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;

afterEach(function () {
    TrustProxies::flushState();
    Carbon::setTestNow();
});

// --- Reverse Proxys und Throttling-Schlüssel -------------------------------------------------------------------------

it('liest TRUSTED_PROXIES: leer heißt keiner, * heißt alle, sonst die Liste ohne Leerräume', function (?string $env, array|string|null $expected) {
    expect(TrustedProxies::fromEnv($env))->toBe($expected);
})->with([
    'nicht gesetzt' => [null, null],
    'leer' => ['', null],
    'nur Leerraum' => ['  ', null],
    'nur Kommas' => [' , ,', null],
    'alle' => ['*', '*'],
    'eine Adresse' => ['10.0.0.1', ['10.0.0.1']],
    'Liste mit Bereich' => [' 10.0.0.1 , 192.168.0.0/16,,', ['10.0.0.1', '192.168.0.0/16']],
]);

it('ignoriert X-Forwarded-For von jedem, dem nicht ausdrücklich vertraut wird', function () {
    Route::get('/__ip', fn () => request()->ip());

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4'])
        ->get('/__ip')->assertSee('10.0.0.1');
});

it('übernimmt die Client-Adresse nur von einem vertrauten Proxy, und nur für die letzte Station der Kette', function () {
    Route::get('/__ip', fn () => request()->ip());
    TrustProxies::at(['10.0.0.1']);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4'])
        ->get('/__ip')->assertSee('1.2.3.4');

    // Ein anderer Absender, der denselben Header schickt, bleibt wer er ist.
    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.50', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4'])
        ->get('/__ip')->assertSee('203.0.113.50');
});

it('fasst Adressen eines Anschlusses zusammen: IPv4 bleibt, IPv6 zählt nach /64, IPv4-in-IPv6 zählt als IPv4', function () {
    expect(RateLimits::network('203.0.113.7'))->toBe('203.0.113.7')
        ->and(RateLimits::network('2001:db8:1:2:aaaa:bbbb:cccc:dddd'))->toBe(RateLimits::network('2001:db8:1:2:1:2:3:4'))
        ->and(RateLimits::network('2001:db8:1:2::1'))->toBe('2001:db8:1:2::')
        ->and(RateLimits::network('2001:db8:1:3::1'))->not->toBe(RateLimits::network('2001:db8:1:2::1'))
        ->and(RateLimits::network('::ffff:203.0.113.7'))->toBe('203.0.113.7')
        ->and(RateLimits::network('kein-ip'))->toBe('kein-ip');

    $a = Request::create('/', 'GET', server: ['REMOTE_ADDR' => '2001:db8:1:2::1']);
    $b = Request::create('/', 'GET', server: ['REMOTE_ADDR' => '2001:db8:1:2:ffff::9']);
    expect(RateLimits::key($a, RateLimits::CREATE))->toBe(RateLimits::key($b, RateLimits::CREATE));
});

// --- Größenlimit ---------------------------------------------------------------------------------------------------

it('lehnt einen zu großen Body vor dem Lesen mit 413 ab und legt nichts an', function () {
    $secret = newSecret();
    $secret['body']['padding'] = str_repeat('x', 100_000);

    $this->postJson('/api/secrets', $secret['body'])->assertStatus(413)->assertExactJson(['message' => 'too_large']);
    expect(Secret::query()->count())->toBe(0);
});

it('wertet die angekündigte Länge aus, ohne den Body zu lesen', function () {
    $this->call('POST', '/api/secrets', [], [], [], ['CONTENT_TYPE' => 'application/json', 'CONTENT_LENGTH' => 5_000_000], '{}')
        ->assertStatus(413);
});

it('lässt den größten gültigen Body (64-KiB-Bucket) durch', function () {
    $this->postJson('/api/secrets', newSecret(['ciphertext' => Base64Url::encode(random_bytes(65536 + 16))])['body'])->assertCreated();
});

it('begrenzt Öffnen und Löschen auf wenige KiB', function () {
    $id = str_repeat('a', 22);
    $this->postJson("/api/secrets/{$id}/open", ['proof' => wrongProof(), 'pad' => str_repeat('x', 3000)])->assertStatus(413);
    $this->deleteJson("/api/secrets/{$id}", ['pad' => str_repeat('x', 3000)], ['X-Manage-Token' => wrongProof()])->assertStatus(413);
});

// --- Einheitliche Antworten und Header ------------------------------------------------------------------------------

it('beantwortet falsche Methoden unter /api wie ein unbekanntes Secret, ohne Framework-Details', function (string $method, string $uri) {
    $response = $this->json($method, $uri);
    $response->assertNotFound()->assertExactJson(['message' => 'unavailable']);
})->with([
    'GET auf open' => ['GET', '/api/secrets/'.'aaaaaaaaaaaaaaaaaaaaaa/open'],
    'PUT auf Sammlung' => ['PUT', '/api/secrets'],
    'PATCH auf ein Secret' => ['PATCH', '/api/secrets/aaaaaaaaaaaaaaaaaaaaaa'],
    'POST auf params' => ['POST', '/api/secrets/aaaaaaaaaaaaaaaaaaaaaa/params'],
]);

it('setzt auf jeder API-Antwort dieselben Schutz-Header und nie ein Cookie', function () {
    $created = storeSecret();
    $id = $created['id'];
    $responses = [
        'create 201' => fn () => $this->postJson('/api/secrets', newSecret()['body']),
        'create 409' => fn () => $this->postJson('/api/secrets', $created['body']),
        'create 422' => fn () => $this->postJson('/api/secrets', ['x' => 1]),
        'create 413' => fn () => $this->postJson('/api/secrets', ['p' => str_repeat('x', 100_000)]),
        'params 200' => fn () => $this->getJson("/api/secrets/{$id}/params"),
        'params 404' => fn () => $this->getJson('/api/secrets/'.str_repeat('b', 22).'/params'),
        'open 403' => fn () => $this->postJson("/api/secrets/{$id}/open", ['proof' => wrongProof()]),
        'status 200' => fn () => $this->getJson("/api/secrets/{$id}/status", ['X-Manage-Token' => $created['token']]),
        'delete 204' => fn () => $this->deleteJson("/api/secrets/{$id}", [], ['X-Manage-Token' => $created['token']]),
        'unbekannt 404' => fn () => $this->getJson('/api/nichts'),
        'methode 404' => fn () => $this->json('PUT', '/api/secrets'),
    ];

    foreach ($responses as $name => $send) {
        $r = $send();
        expect($r->headers->get('Cache-Control'), $name)->toContain('no-store');
        expect($r->headers->get('X-Content-Type-Options'), $name)->toBe('nosniff');
        expect($r->headers->get('Cross-Origin-Resource-Policy'), $name)->toBe('same-origin');
        expect($r->headers->get('Cross-Origin-Opener-Policy'), $name)->toBe('same-origin');
        expect($r->headers->get('Referrer-Policy'), $name)->toBe('no-referrer');
        expect($r->headers->get('Content-Security-Policy'), $name)->toContain("default-src 'none'");
        expect($r->headers->getCookies(), $name)->toBe([]);
        expect($r->headers->has('Strict-Transport-Security'), $name)->toBeFalse(); // nur über HTTPS
    }
});

it('sendet HSTS nur über HTTPS', function () {
    $this->get('http://localhost/')->assertHeaderMissing('Strict-Transport-Security');
    $this->get('https://localhost/')->assertHeader('Strict-Transport-Security', 'max-age=31536000');
});

// --- Zustände, die nicht gesperrt, aber verbraucht sind (vor dem Aufräumen) ------------------------------------------

it('liefert für ein ausgeschöpftes, noch nicht aufgeräumtes Secret keine Parameter', function (array $exhausted) {
    $s = storeSecret();
    Secret::query()->whereKey($s['id'])->update($exhausted);

    $this->getJson("/api/secrets/{$s['id']}/params")->assertNotFound()->assertExactJson(['message' => 'unavailable']);
})->with([
    'alle Abrufe verbraucht' => [['views_used' => 1]],
    'alle Fehlversuche verbraucht' => [['failed_attempts' => 3]],
]);

it('liefert für ein abgelaufenes Secret keinen Status, auch nicht mit dem richtigen Token', function () {
    $s = storeSecret();
    Carbon::setTestNow(Carbon::now()->addHours(2));

    $this->getJson("/api/secrets/{$s['id']}/status", ['X-Manage-Token' => $s['token']])->assertNotFound()->assertExactJson(['message' => 'unavailable']);
});

it('lehnt Verwaltungstoken falscher Länge mit derselben Antwort ab', function (int $bytes) {
    $s = storeSecret();
    $token = Base64Url::encode(random_bytes($bytes));

    $this->getJson("/api/secrets/{$s['id']}/status", ['X-Manage-Token' => $token])->assertNotFound()->assertExactJson(['message' => 'unavailable']);
    $this->deleteJson("/api/secrets/{$s['id']}", [], ['X-Manage-Token' => $token])->assertNotFound()->assertExactJson(['message' => 'unavailable']);
    expect(Secret::query()->whereKey($s['id'])->whereNull('destroyed_at')->exists())->toBeTrue();
})->with([31, 33, 1, 64]);

// --- Regeln ------------------------------------------------------------------------------------------------------------

it('StrictInteger lässt nur echte ganze Zahlen im Bereich zu', function (mixed $value, bool $valid) {
    $v = Validator::make(['n' => $value], ['n' => [new StrictInteger(1, 10)]]);
    expect($v->passes())->toBe($valid);
})->with([
    'int im Bereich' => [5, true], 'Untergrenze' => [1, true], 'Obergrenze' => [10, true],
    'unter dem Bereich' => [0, false], 'über dem Bereich' => [11, false],
    'Float mit .0' => [5.0, false], 'String' => ['5', false], 'true' => [true, false], 'null' => [null, false], 'Array' => [[5], false],
]);

it('StrictInteger beachtet eine Liste erlaubter Werte', function () {
    $rule = new StrictInteger(allowed: [300, 3600]);
    expect(Validator::make(['n' => 300], ['n' => [$rule]])->passes())->toBeTrue()
        ->and(Validator::make(['n' => 301], ['n' => [$rule]])->passes())->toBeFalse();
});

it('Base64Url::decode lehnt alles Nichtkanonische ab', function (mixed $value) {
    expect(Base64Url::decode($value))->toBeNull();
})->with([
    'leer' => [''], 'Padding' => ['AAAA=='], 'Plus und Slash' => ['AA+/'], 'Leerzeichen' => ['AA AA'], 'Zeilenumbruch' => ["AAAA\n"],
    'Unicode' => ['ÄÄÄÄ'], 'unmögliche Länge' => ['AAAAA'], 'Restbits ungleich null' => ['AB'], 'kein String' => [123], 'null' => [null],
]);

it('Base64Url::decode und encode sind zueinander invers', function () {
    foreach ([1, 2, 3, 15, 16, 31, 32, 33, 64] as $n) {
        $raw = random_bytes($n);
        expect(Base64Url::decode(Base64Url::encode($raw)))->toBe($raw);
    }
});

// --- Aufräumen -----------------------------------------------------------------------------------------------------

it('räumt eine große Menge ab und trennt Abgelaufene genau an der Grenze von noch gültigen', function () {
    Carbon::setTestNow('2026-11-04 12:00:00');
    $rows = [];
    foreach (range(1, 300) as $i) {
        $rows[] = ['id' => Base64Url::encode(random_bytes(16)), 'expires_at' => $i <= 100 ? '2026-11-04 12:00:00' : ($i <= 200 ? '2026-11-04 11:59:59' : '2026-11-04 12:00:01')];
    }
    $template = storeSecret();
    $base = Secret::query()->whereKey($template['id'])->first()->getAttributes();
    Secret::query()->whereKey($template['id'])->delete();
    foreach ($rows as $r) {
        Secret::query()->insert(array_replace($base, $r));
    }

    $result = (new PruneSecrets)->handle();

    expect($result)->toBe(['expired' => 200, 'deleted' => 200])
        ->and(Secret::query()->count())->toBe(100)
        ->and(Secret::query()->where('expires_at', '<=', Carbon::now())->count())->toBe(0);
    expect((new PruneSecrets)->handle())->toBe(['expired' => 0, 'deleted' => 0]); // idempotent
});
