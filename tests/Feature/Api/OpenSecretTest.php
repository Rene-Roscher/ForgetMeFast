<?php

use App\Models\Secret;
use Illuminate\Support\Carbon;

function openSecret(string $id, string $proof)
{
    return test()->postJson("/api/secrets/{$id}/open", ['proof' => $proof]);
}

it('gibt iv und ciphertext bei richtigem Proof heraus', function () {
    $s = storeSecret(['max_views' => 3]);

    openSecret($s['id'], $s['proof'])->assertOk()->assertExactJson([
        'iv' => $s['body']['iv'],
        'ciphertext' => $s['body']['ciphertext'],
        'views_left' => 2,
        'expires_at' => Secret::query()->find($s['id'])->expires_at->toIso8601String(),
    ]);
});

it('verbraucht bei max_views=1 beim ersten Abruf und löscht den Ciphertext im selben Schritt', function () {
    $s = storeSecret(['max_views' => 1]);

    openSecret($s['id'], $s['proof'])->assertOk()->assertJsonPath('views_left', 0);

    $row = Secret::query()->find($s['id']);
    expect($row->ciphertext)->toBeNull()->and($row->destroyed_reason)->toBe('consumed')->and($row->views_used)->toBe(1);
    openSecret($s['id'], $s['proof'])->assertNotFound();
});

it('zählt mehrere Abrufe bis zum Limit', function () {
    $s = storeSecret(['max_views' => 3]);

    foreach ([2, 1, 0] as $left) {
        openSecret($s['id'], $s['proof'])->assertOk()->assertJsonPath('views_left', $left);
    }
    openSecret($s['id'], $s['proof'])->assertNotFound();
});

it('zählt falsche Proofs, nennt die Restversuche und vernichtet beim Limit', function () {
    $s = storeSecret(['max_attempts' => 3]);

    openSecret($s['id'], wrongProof())->assertForbidden()->assertExactJson(['message' => 'invalid', 'attempts_left' => 2]);
    openSecret($s['id'], wrongProof())->assertForbidden()->assertJsonPath('attempts_left', 1);
    openSecret($s['id'], wrongProof())->assertForbidden()->assertJsonPath('attempts_left', 0);

    $row = Secret::query()->find($s['id']);
    expect($row->ciphertext)->toBeNull()->and($row->destroyed_reason)->toBe('attempts')->and($row->failed_attempts)->toBe(3);
    // Auch der richtige Proof nützt jetzt nichts mehr.
    openSecret($s['id'], $s['proof'])->assertNotFound();
});

it('bei max_attempts=1 vernichtet schon der erste falsche Proof', function () {
    $s = storeSecret(['max_attempts' => 1]);

    openSecret($s['id'], wrongProof())->assertForbidden()->assertJsonPath('attempts_left', 0);
    openSecret($s['id'], $s['proof'])->assertNotFound();
});

it('gibt bei richtigem Proof den für diese Anfrage reservierten Versuch zurück', function () {
    $s = storeSecret(['max_attempts' => 3, 'max_views' => 5]);

    openSecret($s['id'], wrongProof())->assertForbidden();
    openSecret($s['id'], wrongProof())->assertForbidden();
    expect(Secret::query()->find($s['id'])->failed_attempts)->toBe(2);

    openSecret($s['id'], $s['proof'])->assertOk();
    // Reservieren (3), Vergleich ok, Rückgabe (2): der richtige Proof kostet keinen Versuch.
    expect(Secret::query()->find($s['id'])->failed_attempts)->toBe(2);

    // Ohne die Rückgabe stünde der Zähler auf 3 und dieser Aufruf wäre schon 404. So ist es der letzte Versuch (403).
    openSecret($s['id'], wrongProof())->assertForbidden()->assertJsonPath('attempts_left', 0);
    openSecret($s['id'], $s['proof'])->assertNotFound(); // jetzt vernichtet
});

it('reserviert den Versuch vor dem Vergleich: ein Vergleich ohne freien Versuch wird nie ausgeführt', function () {
    $s = storeSecret(['max_attempts' => 1, 'max_views' => 5]);
    Secret::query()->whereKey($s['id'])->update(['failed_attempts' => 1]); // Limit bereits erreicht

    // Selbst der RICHTIGE Proof bekommt nichts, weil kein Versuch mehr zu reservieren ist.
    openSecret($s['id'], $s['proof'])->assertNotFound();
    expect(Secret::query()->find($s['id'])->views_used)->toBe(0);
});

it('lehnt ungültige Proofs mit 422 ab, bevor die Datenbank gefragt wird, und zählt nichts', function (mixed $proof) {
    $s = storeSecret();

    $this->postJson("/api/secrets/{$s['id']}/open", ['proof' => $proof])->assertUnprocessable();
    expect(Secret::query()->find($s['id'])->failed_attempts)->toBe(0);
})->with(['leer' => [''], 'kurz' => ['abc'], 'Padding' => [str_repeat('A', 43).'='], 'Zahl' => [123], 'nicht kanonisch' => [str_repeat('A', 42).'B']]);

it('lehnt fremde Felder im Open-Body ab', function () {
    $s = storeSecret();
    $this->postJson("/api/secrets/{$s['id']}/open", ['proof' => $s['proof'], 'extra' => 1])->assertUnprocessable();
});

it('lässt ein abgelaufenes Secret an der Grenze nicht mehr öffnen', function () {
    Carbon::setTestNow('2026-11-04 12:00:00');
    $s = storeSecret(['ttl' => 300]); // läuft ab um 12:05:00

    Carbon::setTestNow('2026-11-04 12:04:59');
    openSecret($s['id'], $s['proof'])->assertOk();

    $t = storeSecret(['ttl' => 300]);
    Carbon::setTestNow('2026-11-04 12:09:59'); // 12:04:59 + 300 s = 12:09:59: genau die Grenze
    openSecret($t['id'], $t['proof'])->assertNotFound();
});

it('GET /s/{id} und GET params ändern keinen Zustand', function () {
    $s = storeSecret(['max_views' => 1, 'max_attempts' => 2]);
    $before = Secret::query()->find($s['id'])->only(['views_used', 'failed_attempts', 'ciphertext', 'destroyed_at']);

    $this->get("/s/{$s['id']}")->assertOk();
    $this->get("/s/{$s['id']}")->assertOk();
    $this->getJson("/api/secrets/{$s['id']}/params")->assertOk();
    $this->get('/s/unbekannt')->assertOk();

    expect(Secret::query()->find($s['id'])->only(['views_used', 'failed_attempts', 'ciphertext', 'destroyed_at']))->toBe($before);
    openSecret($s['id'], $s['proof'])->assertOk(); // der Abruf ist noch da
});
