<?php

it('liefert die Erstellen-Seite als Inertia-Hülle ohne Props', function () {
    $response = $this->get('/')->assertOk()->assertSee('"component":"Create"', escape: false);

    preg_match('/<script data-page="app" type="application\/json">(.*?)<\/script>/s', $response->getContent(), $m);
    expect(json_decode($m[1], true)['props'])->toBe(['errors' => []]);
});

it('liefert den Viewer für jede id gleich, ohne Props und ohne Datenbankzugriff', function () {
    $s = storeSecret();
    DB::enableQueryLog();

    $known = $this->get("/s/{$s['id']}");
    $unknown = $this->get('/s/gibt-es-nicht');

    expect(DB::getQueryLog())->toBe([]); // GET /s/{id} fragt nichts ab, ist also kein Existenz-Orakel
    foreach ([$known, $unknown] as $r) {
        $r->assertOk()->assertSee('"component":"View"', escape: false);
    }
    preg_match('/<script data-page="app" type="application\/json">(.*?)<\/script>/s', $known->getContent(), $a);
    preg_match('/<script data-page="app" type="application\/json">(.*?)<\/script>/s', $unknown->getContent(), $b);
    expect(json_decode($a[1], true)['props'])->toBe(['errors' => []])
        ->and(json_decode($a[1], true)['component'])->toBe(json_decode($b[1], true)['component']);
});
