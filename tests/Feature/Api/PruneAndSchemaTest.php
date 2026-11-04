<?php

use App\Models\Secret;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

it('räumt Abgelaufene und Vernichtete auf und ist idempotent', function () {
    Carbon::setTestNow('2026-11-04 12:00:00');
    $expired = storeSecret(['ttl' => 300]);
    $alive = storeSecret(['ttl' => 3600]);
    $destroyed = storeSecret(['max_attempts' => 1]);
    $this->postJson("/api/secrets/{$destroyed['id']}/open", ['proof' => wrongProof()])->assertForbidden();

    Carbon::setTestNow('2026-11-04 12:06:00');
    $this->artisan('secrets:prune')->expectsOutput('expired=1 deleted=2')->assertSuccessful();

    expect(Secret::query()->pluck('id')->all())->toBe([$alive['id']]);
    $this->artisan('secrets:prune')->expectsOutput('expired=0 deleted=0')->assertSuccessful();
    expect(Secret::query()->count())->toBe(1);
});

it('der Aufräumjob steht jede Minute im Scheduler', function () {
    $this->artisan('schedule:list')->expectsOutputToContain('secrets:prune')->assertSuccessful();
});

it('das Schema hat genau die Spalten der Spec: kein Klartext, keine IP', function () {
    $columns = Schema::getColumnListing('secrets');
    sort($columns);

    expect($columns)->toBe([
        'ciphertext', 'created_at', 'destroyed_at', 'destroyed_reason', 'expires_at', 'failed_attempts', 'id', 'iv',
        'kdf_m', 'kdf_name', 'kdf_p', 'kdf_t', 'manage_hash', 'max_attempts', 'max_views', 'salt', 'v', 'verifier', 'views_used',
    ]);
    foreach (['plaintext', 'secret', 'password', 'passwort', 'ip', 'ip_address', 'user_agent', 'token', 'manage_token', 'proof', 'link_key', 'key'] as $forbidden) {
        expect($columns)->not->toContain($forbidden);
    }
    expect(Schema::hasTable('users'))->toBeFalse();
});

it('SQLite überschreibt gelöschte Seiten (secure_delete)', function () {
    expect(DB::selectOne('PRAGMA secure_delete')->secure_delete)->toBe(1);
});

it('die Datenbank enthält genau die Tabellen, die das Projekt braucht: keine Konten, Sessions oder Jobs', function () {
    $tables = collect(Schema::getTables())->pluck('name')->reject(fn ($t) => $t === 'migrations')->sort()->values()->all();

    expect($tables)->toBe(['cache', 'cache_locks', 'secrets']);
});
