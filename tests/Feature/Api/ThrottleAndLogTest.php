<?php

use Illuminate\Support\Facades\File;

it('drosselt jeden Endpunkt je IP-Hash (429)', function (string $method, string $uri, int $limit) {
    $send = fn () => match ($method) {
        'POST' => $this->postJson($uri, str_contains($uri, 'open') ? ['proof' => wrongProof()] : newSecret()['body']),
        'DELETE' => $this->deleteJson($uri, [], ['X-Manage-Token' => wrongProof()]),
        default => $this->getJson($uri),
    };

    foreach (range(1, $limit) as $i) {
        expect($send()->getStatusCode())->not->toBe(429);
    }
    $send()->assertStatus(429);
})->with(function () {
    $id = str_repeat('a', 22);

    return [
        'create 20/h' => ['POST', '/api/secrets', 20],
        'params 60/min' => ['GET', "/api/secrets/{$id}/params", 60],
        'open 30/min' => ['POST', "/api/secrets/{$id}/open", 30],
        'destroy 30/min' => ['DELETE', "/api/secrets/{$id}", 30],
        'status 60/min' => ['GET', "/api/secrets/{$id}/status", 60],
    ];
});

it('schreibt weder Klartext-Marker noch Proofs noch Tokens noch Bodies in die Logs', function () {
    $logs = storage_path('logs');
    File::ensureDirectoryExists($logs);
    foreach (File::glob("{$logs}/*.log") as $f) {
        File::delete($f);
    }
    $marker = 'GEHEIM-MARKER-'.bin2hex(random_bytes(8));
    $s = newSecret();
    $s['body']['unknown_'.$marker] = $marker; // erzeugt eine 422 mit dem Marker im Body

    $this->postJson('/api/secrets', $s['body'])->assertUnprocessable();
    $good = storeSecret();
    $this->postJson("/api/secrets/{$good['id']}/open", ['proof' => wrongProof()])->assertForbidden();
    $this->postJson("/api/secrets/{$good['id']}/open", ['proof' => $good['proof'], 'x' => $marker])->assertUnprocessable();
    $this->deleteJson("/api/secrets/{$good['id']}", [], ['X-Manage-Token' => $good['token']])->assertNoContent();

    $all = collect(File::glob("{$logs}/*"))->map(fn ($f) => File::get($f))->implode("\n");
    foreach ([$marker, $good['proof'], $good['token'], $good['body']['ciphertext'], $good['body']['verifier']] as $needle) {
        expect($all)->not->toContain($needle);
    }
    expect($all)->not->toMatch('/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/'); // keine Roh-IP
});
