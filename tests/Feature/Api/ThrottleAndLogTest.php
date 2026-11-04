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
    // Eigene Log-Datei im Temp-Verzeichnis: das Log des Entwicklers bleibt unberührt.
    $dir = sys_get_temp_dir().'/fmf-log-'.bin2hex(random_bytes(6));
    File::ensureDirectoryExists($dir);
    config(['logging.default' => 'single', 'logging.channels.single.path' => $dir.'/test.log', 'logging.channels.single.level' => 'debug']);
    app('log')->forgetChannel('single');

    $marker = 'GEHEIM-MARKER-'.bin2hex(random_bytes(8));
    $s = newSecret();
    $s['body']['unknown_'.$marker] = $marker; // erzeugt eine 422 mit dem Marker im Body

    $this->postJson('/api/secrets', $s['body'])->assertUnprocessable();
    $good = storeSecret();
    $this->postJson("/api/secrets/{$good['id']}/open", ['proof' => wrongProof()])->assertForbidden();
    $this->postJson("/api/secrets/{$good['id']}/open", ['proof' => $good['proof'], 'x' => $marker])->assertUnprocessable();
    $this->postJson('/api/secrets', ['p' => str_repeat($marker, 20_000)])->assertStatus(413);
    $this->deleteJson("/api/secrets/{$good['id']}", [], ['X-Manage-Token' => $good['token']])->assertNoContent();

    // Positivkontrolle: Diese Konfiguration fängt Logzeilen tatsächlich ein, sonst bewiese das Ausbleiben nichts.
    $control = 'KONTROLLE-'.bin2hex(random_bytes(4));
    app('log')->info($control);
    $all = collect(File::glob("{$dir}/*"))->map(fn ($f) => File::get($f))->implode("\n");
    expect($all)->toContain($control);

    foreach ([$marker, $good['proof'], $good['token'], $good['body']['ciphertext'], $good['body']['verifier']] as $needle) {
        expect($all)->not->toContain($needle);
    }
    expect($all)->not->toMatch('/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/'); // keine Roh-IP

    File::deleteDirectory($dir);
});
