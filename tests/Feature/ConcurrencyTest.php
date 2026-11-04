<?php

use App\Rules\Base64Url;
use Symfony\Component\Process\Process;

// Kein RefreshDatabase: echte Prozesse brauchen eine echte SQLite-Datei.
uses()->group('concurrency');

function concurrencyDb(): array
{
    $path = storage_path('framework/testing/concurrency-'.bin2hex(random_bytes(6)).'.sqlite');
    touch($path);
    $env = ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => $path, 'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array', 'LOG_CHANNEL' => 'null'];
    $migrate = new Process([PHP_BINARY, 'artisan', 'migrate', '--force'], base_path(), $env);
    $migrate->mustRun();

    return [$path, $env];
}

function insertSecret(string $path, int $maxViews, int $maxAttempts): array
{
    $proof = random_bytes(32);
    $id = Base64Url::encode(random_bytes(16));
    $pdo = new PDO('sqlite:'.$path);
    $pdo->prepare('INSERT INTO secrets (id, v, kdf_name, kdf_m, kdf_t, kdf_p, salt, iv, ciphertext, verifier, manage_hash, max_views, max_attempts, expires_at, created_at)
        VALUES (?, 1, "argon2id", 19456, 2, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
        $id, Base64Url::encode(random_bytes(16)), Base64Url::encode(random_bytes(12)), Base64Url::encode(random_bytes(1040)),
        Base64Url::encode(hash('sha256', $proof, true)), Base64Url::encode(random_bytes(32)), $maxViews, $maxAttempts,
        gmdate('Y-m-d H:i:s', time() + 3600), gmdate('Y-m-d H:i:s'),
    ]);

    return [$id, Base64Url::encode($proof)];
}

/**
 * Startet alle Arbeiter, lässt sie an einer gemeinsamen Startlinie warten und sammelt die Ergebnisse.
 *
 * @param  list<string>  $proofs  ein Proof je Prozess
 * @return array{counts: array<string, int>, row: array<string, mixed>}
 */
function race(string $path, array $env, string $id, array $proofs): array
{
    $start = microtime(true) + 6.0;
    $processes = array_map(function (string $proof) use ($env, $id, $start) {
        $p = new Process([PHP_BINARY, base_path('tests/Support/open-worker.php'), $id, (string) $start, $proof], base_path(), $env);
        $p->start();

        return $p;
    }, $proofs);
    $counts = [];
    foreach ($processes as $p) {
        $p->wait();
        expect($p->getExitCode(), $p->getErrorOutput())->toBe(0);
        $status = trim($p->getOutput());
        $counts[$status] = ($counts[$status] ?? 0) + 1;
    }
    $row = (new PDO('sqlite:'.$path))->query("SELECT * FROM secrets WHERE id = '{$id}'")->fetch(PDO::FETCH_ASSOC);

    return ['counts' => $counts, 'row' => $row];
}

afterEach(function () {
    foreach (glob(storage_path('framework/testing/concurrency-*')) as $f) {
        @unlink($f);
    }
});

it('50 parallele falsche Proofs überschreiten max_attempts nicht', function () {
    [$path, $env] = concurrencyDb();
    [$id] = insertSecret($path, maxViews: 5, maxAttempts: 3);

    $r = race($path, $env, $id, array_map(fn () => Base64Url::encode(random_bytes(32)), range(1, 50)));

    expect($r['counts']['invalid'] ?? 0)->toBe(3)
        ->and($r['counts']['unavailable'] ?? 0)->toBe(47)
        ->and($r['counts']['opened'] ?? 0)->toBe(0)
        ->and((int) $r['row']['failed_attempts'])->toBe(3)
        ->and($r['row']['ciphertext'])->toBeNull()
        ->and($r['row']['destroyed_reason'])->toBe('attempts');
})->skip(fn () => ! function_exists('proc_open'), 'proc_open fehlt');

it('50 parallele richtige Proofs bei max_views=1 liefern genau einmal aus', function () {
    [$path, $env] = concurrencyDb();
    [$id, $proof] = insertSecret($path, maxViews: 1, maxAttempts: 3);

    $r = race($path, $env, $id, array_fill(0, 50, $proof));

    expect($r['counts']['opened'] ?? 0)->toBe(1)
        ->and($r['counts']['unavailable'] ?? 0)->toBe(49)
        ->and((int) $r['row']['views_used'])->toBe(1)
        ->and($r['row']['ciphertext'])->toBeNull();
});

it('gemischte richtige und falsche Proofs überschreiten weder Abrufe noch Versuche', function () {
    [$path, $env] = concurrencyDb();
    [$id, $good] = insertSecret($path, maxViews: 2, maxAttempts: 3);
    $proofs = [];
    foreach (range(1, 25) as $_) {
        $proofs[] = $good;
        $proofs[] = Base64Url::encode(random_bytes(32));
    }

    $r = race($path, $env, $id, $proofs);

    expect($r['counts']['opened'] ?? 0)->toBeLessThanOrEqual(2)
        ->and($r['counts']['invalid'] ?? 0)->toBeLessThanOrEqual(3)
        ->and((int) $r['row']['views_used'])->toBeLessThanOrEqual(2)
        ->and((int) $r['row']['failed_attempts'])->toBeLessThanOrEqual(3);
});
