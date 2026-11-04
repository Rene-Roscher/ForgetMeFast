<?php

use App\Models\Secret;
use App\Rules\Base64Url;
use Illuminate\Support\Carbon;

it('legt ein Secret an und rechnet expires_at selbst aus', function () {
    Carbon::setTestNow('2026-11-04 12:00:00');
    $secret = newSecret(['ttl' => 3600]);

    $this->postJson('/api/secrets', $secret['body'])
        ->assertCreated()
        ->assertExactJson(['expires_at' => '2026-11-04T13:00:00+00:00']);

    $row = Secret::query()->find($secret['id']);
    expect($row->ciphertext)->toBe($secret['body']['ciphertext'])
        ->and($row->views_used)->toBe(0)
        ->and($row->failed_attempts)->toBe(0)
        ->and($row->expires_at->toDateTimeString())->toBe('2026-11-04 13:00:00');
});

it('nimmt keine absoluten Zeiten und keine fremden Felder vom Client', function (array $extra) {
    $secret = newSecret();
    $this->postJson('/api/secrets', $secret['body'] + $extra)->assertUnprocessable();
    expect(Secret::query()->count())->toBe(0);
})->with([
    'expires_at' => [['expires_at' => '2099-01-01 00:00:00']],
    'created_at' => [['created_at' => '2000-01-01 00:00:00']],
    'views_used' => [['views_used' => 5]],
    'failed_attempts' => [['failed_attempts' => 0]],
    'beliebig' => [['x' => 1]],
]);

it('lehnt unbekannte Felder in kdf ab', function () {
    $secret = newSecret();
    $secret['body']['kdf']['extra'] = 1;
    $this->postJson('/api/secrets', $secret['body'])->assertUnprocessable();
});

it('prüft jedes Feld streng', function (string $path, mixed $value) {
    $secret = newSecret();
    data_set($secret['body'], $path, $value);
    $this->postJson('/api/secrets', $secret['body'])->assertUnprocessable();
    expect(Secret::query()->count())->toBe(0);
})->with([
    'id zu kurz' => ['id', 'abc'],
    'id Standard-Alphabet' => ['id', 'AAAAAAAAAAAAAAAAAAAA+/'],
    'id Padding' => ['id', 'AAAAAAAAAAAAAAAAAAAAA='],
    'id nicht kanonisch' => ['id', 'AAAAAAAAAAAAAAAAAAAAAB'],
    'v 2' => ['v', 2],
    'v String' => ['v', '1'],
    'kdf name' => ['kdf.name', 'pbkdf2'],
    'm zu klein' => ['kdf.m', 19455],
    'm zu groß' => ['kdf.m', 65537],
    'm String' => ['kdf.m', '19456'],
    't zu klein' => ['kdf.t', 1],
    't zu groß' => ['kdf.t', 7],
    'p 2' => ['kdf.p', 2],
    'salt 15 Byte' => ['salt', Base64Url::encode(str_repeat('a', 15))],
    'iv 16 Byte' => ['iv', Base64Url::encode(str_repeat('a', 16))],
    'ciphertext keine Bucketgröße' => ['ciphertext', Base64Url::encode(str_repeat('a', 1000))],
    'ciphertext ohne Tag' => ['ciphertext', Base64Url::encode(str_repeat('a', 1024))],
    'ciphertext zu groß' => ['ciphertext', Base64Url::encode(str_repeat('a', 65536 + 17))],
    'verifier 31 Byte' => ['verifier', Base64Url::encode(str_repeat('a', 31))],
    'manage_hash leer' => ['manage_hash', ''],
    'ttl nicht in Liste' => ['ttl', 60],
    'ttl String' => ['ttl', '3600'],
    'max_views 0' => ['max_views', 0],
    'max_views 11' => ['max_views', 11],
    'max_attempts 0' => ['max_attempts', 0],
    'max_attempts Fließkomma' => ['max_attempts', 2.5],
]);

it('akzeptiert alle vier Bucketgrößen und alle erlaubten Ablaufzeiten', function () {
    foreach ([1024, 4096, 16384, 65536] as $bucket) {
        $this->postJson('/api/secrets', newSecret(['ciphertext' => Base64Url::encode(random_bytes($bucket + 16))])['body'])->assertCreated();
    }
    foreach ([300, 3600, 86400, 604800] as $ttl) {
        $this->postJson('/api/secrets', newSecret(['ttl' => $ttl])['body'])->assertCreated();
    }
});

it('begrenzt die Ablaufzeit nach der Serverkonfiguration', function () {
    config(['secrets.max_ttl' => 3600]);
    $this->postJson('/api/secrets', newSecret(['ttl' => 86400])['body'])->assertUnprocessable();
    $this->postJson('/api/secrets', newSecret(['ttl' => 3600])['body'])->assertCreated();
});

it('überschreibt nie ein vorhandenes Secret (409)', function () {
    $first = storeSecret();
    $again = newSecret(['id' => $first['id']]);

    $this->postJson('/api/secrets', $again['body'])->assertStatus(409)->assertExactJson(['message' => 'conflict']);
    expect(Secret::query()->find($first['id'])->ciphertext)->toBe($first['body']['ciphertext']);
});

it('lehnt einen kaputten oder leeren Body ab', function () {
    $this->postJson('/api/secrets', [])->assertUnprocessable();
    $this->call('POST', '/api/secrets', [], [], [], ['CONTENT_TYPE' => 'application/json'], '{kaputt')->assertUnprocessable();
});

it('hat eine Spiegel-Konfiguration, die zu den Konstanten des Krypto-Moduls passt', function () {
    $ts = file_get_contents(base_path('resources/js/crypto/constants.ts'));
    preg_match('/KDF_LIMITS = \{ mMin: (\d+), mMax: (\d+), tMin: (\d+), tMax: (\d+), p: (\d+) \}/', $ts, $k);
    preg_match('/BUCKETS = \[([\d, ]+)\]/', $ts, $b);
    preg_match('/TTL_SECONDS = \[([\d, ]+)\]/', $ts, $t);
    preg_match('/MAX_COUNT = (\d+)/', $ts, $c);

    expect(config('secrets.kdf'))->toMatchArray(['m_min' => (int) $k[1], 'm_max' => (int) $k[2], 't_min' => (int) $k[3], 't_max' => (int) $k[4], 'p' => (int) $k[5]])
        ->and(config('secrets.buckets'))->toBe(array_map('intval', explode(', ', $b[1])))
        ->and(config('secrets.ttl_options'))->toBe(array_map('intval', explode(', ', $t[1])))
        ->and(config('secrets.max_count'))->toBe((int) $c[1])
        ->and(config('secrets.tag_bytes'))->toBe(16);
});
