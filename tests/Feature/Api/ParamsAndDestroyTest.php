<?php

use App\Models\Secret;

it('liefert Header-Felder und max_attempts, sonst nichts', function () {
    $s = storeSecret(['max_attempts' => 5, 'kdf' => ['m' => 30000, 't' => 3]]);

    $this->getJson("/api/secrets/{$s['id']}/params")->assertOk()->assertExactJson([
        'v' => 1,
        'kdf' => ['name' => 'argon2id', 'm' => 30000, 't' => 3, 'p' => 1],
        'salt' => $s['body']['salt'],
        'max_attempts' => 5,
    ]);
});

it('zeigt dem Ersteller mit dem Verwaltungstoken den Zustand und zählt dabei nichts', function () {
    $s = storeSecret(['max_views' => 3, 'max_attempts' => 4]);
    $this->postJson("/api/secrets/{$s['id']}/open", ['proof' => $s['proof']])->assertOk();
    $this->postJson("/api/secrets/{$s['id']}/open", ['proof' => wrongProof()])->assertForbidden();

    $before = Secret::query()->find($s['id'])->only(['views_used', 'failed_attempts']);
    $this->getJson("/api/secrets/{$s['id']}/status", ['X-Manage-Token' => $s['token']])->assertOk()->assertJson([
        'views_used' => 1, 'max_views' => 3, 'failed_attempts' => 1, 'max_attempts' => 4,
    ])->assertJsonStructure(['expires_at']);
    expect(Secret::query()->find($s['id'])->only(['views_used', 'failed_attempts']))->toBe($before);
});

it('verweigert den Zustand ohne oder mit falschem Token genauso wie bei unbekannt', function (?string $token) {
    $s = storeSecret();
    $headers = $token === null ? [] : ['X-Manage-Token' => $token];

    $this->getJson("/api/secrets/{$s['id']}/status", $headers)->assertNotFound()->assertExactJson(['message' => 'unavailable']);
})->with(['falsch' => [fn () => wrongProof()], 'fehlt' => [null], 'kaputt' => ['!!!'], 'Proof statt Token' => [fn () => storeSecret()['proof']]]);

it('liefert für ein vernichtetes oder abgelaufenes Secret keinen Zustand mehr', function () {
    $s = storeSecret();
    $this->deleteJson("/api/secrets/{$s['id']}", [], ['X-Manage-Token' => $s['token']])->assertNoContent();

    $this->getJson("/api/secrets/{$s['id']}/status", ['X-Manage-Token' => $s['token']])->assertNotFound();
});

it('vernichtet mit dem richtigen Verwaltungstoken und löscht den Ciphertext', function () {
    $s = storeSecret();

    $this->deleteJson("/api/secrets/{$s['id']}", [], ['X-Manage-Token' => $s['token']])->assertNoContent();

    $row = Secret::query()->find($s['id']);
    expect($row->ciphertext)->toBeNull()->and($row->destroyed_reason)->toBe('manual');
    $this->getJson("/api/secrets/{$s['id']}/params")->assertNotFound();
    $this->deleteJson("/api/secrets/{$s['id']}", [], ['X-Manage-Token' => $s['token']])->assertNotFound(); // nicht zweimal
});

it('vernichtet mit falschem, fehlendem oder kaputtem Token nichts', function (?string $token) {
    $s = storeSecret();
    $headers = $token === null ? [] : ['X-Manage-Token' => $token];

    $this->deleteJson("/api/secrets/{$s['id']}", [], $headers)->assertNotFound();
    expect(Secret::query()->find($s['id'])->ciphertext)->not->toBeNull();
})->with(['falsch' => [fn () => wrongProof()], 'fehlt' => [null], 'kaputt' => ['!!!'], 'Proof statt Token' => ['AAAA']]);

it('das Verwaltungstoken ist nicht der Proof und umgekehrt', function () {
    $s = storeSecret();
    $this->deleteJson("/api/secrets/{$s['id']}", [], ['X-Manage-Token' => $s['proof']])->assertNotFound();
    $this->postJson("/api/secrets/{$s['id']}/open", ['proof' => $s['token']])->assertForbidden();
});
