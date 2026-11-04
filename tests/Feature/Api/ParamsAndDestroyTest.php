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
