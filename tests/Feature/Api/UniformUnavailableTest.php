<?php

use App\Models\Secret;
use Illuminate\Support\Carbon;

/** Alles an der Antwort, was nicht pro Anfrage zufällig ist (Datum, CSP-Nonce, Limiter-Zähler). */
function shape($response): array
{
    $headers = $response->headers->all();
    unset($headers['date'], $headers['content-security-policy'], $headers['x-ratelimit-remaining'], $headers['x-ratelimit-limit'], $headers['retry-after'], $headers['x-ratelimit-reset']);
    ksort($headers);

    return [$response->getStatusCode(), $response->getContent(), $headers];
}

it('liefert für unbekannt, abgelaufen, vernichtet, verbraucht, falsches Token und kaputte id dieselbe Antwort', function () {
    $unknown = newSecret();

    Carbon::setTestNow('2026-11-04 12:00:00');
    $expired = storeSecret(['ttl' => 300]);
    $destroyed = storeSecret(['max_attempts' => 1]);
    $consumed = storeSecret(['max_views' => 1]);
    $manual = storeSecret();

    $this->postJson("/api/secrets/{$destroyed['id']}/open", ['proof' => wrongProof()])->assertForbidden();
    $this->postJson("/api/secrets/{$consumed['id']}/open", ['proof' => $consumed['proof']])->assertOk();
    $this->deleteJson("/api/secrets/{$manual['id']}", [], ['X-Manage-Token' => $manual['token']])->assertNoContent();
    Carbon::setTestNow('2026-11-04 12:10:00'); // $expired ist jetzt abgelaufen

    $victims = ['unknown' => $unknown['id'], 'expired' => $expired['id'], 'destroyed' => $destroyed['id'], 'consumed' => $consumed['id'], 'manual' => $manual['id'], 'malformed' => 'kurz'];

    $params = $open = $destroy = $status = [];
    foreach ($victims as $name => $id) {
        $params[$name] = shape($this->getJson("/api/secrets/{$id}/params"));
        $open[$name] = shape($this->postJson("/api/secrets/{$id}/open", ['proof' => wrongProof()]));
        $destroy[$name] = shape($this->deleteJson("/api/secrets/{$id}", [], ['X-Manage-Token' => wrongProof()]));
        $status[$name] = shape($this->getJson("/api/secrets/{$id}/status", ['X-Manage-Token' => wrongProof()]));
    }
    // Ein lebendes Secret mit falschem Verwaltungstoken muss dasselbe zeigen wie ein unbekanntes.
    $alive = storeSecret();
    $destroy['alive-wrong-token'] = shape($this->deleteJson("/api/secrets/{$alive['id']}", [], ['X-Manage-Token' => wrongProof()]));

    $status['alive-wrong-token'] = shape($this->getJson("/api/secrets/{$alive['id']}/status", ['X-Manage-Token' => wrongProof()]));

    foreach ([$params, $open, $destroy, $status] as $set) {
        expect(count(array_unique(array_map('serialize', $set))))->toBe(1, json_encode(array_map(fn ($v) => $v[0].' '.$v[1], $set)));
    }
    expect($params['unknown'][0])->toBe(404)->and($params['unknown'][1])->toBe('{"message":"unavailable"}');
    expect(Secret::query()->find($alive['id']))->not->toBeNull();
});

it('unbekannte Pfade unter /api sehen genauso aus', function () {
    $this->getJson('/api/nichts')->assertNotFound()->assertExactJson(['message' => 'unavailable']);
    $this->getJson('/api/secrets/'.str_repeat('a', 30).'/params')->assertNotFound()->assertExactJson(['message' => 'unavailable']);
});
