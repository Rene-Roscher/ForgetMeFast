<?php

// Grenzen und Erlaubnislisten (docs/SPEC.md, docs/CRYPTO-NOTES.md, ADR 0004). Spiegel im Browser:
// resources/js/crypto/constants.ts, ein Test vergleicht beide.
return [
    'ttl_options' => [300, 3600, 86400, 604800],
    'max_ttl' => (int) env('SECRETS_MAX_TTL', 604800),
    'max_count' => 10,
    'kdf' => ['name' => 'argon2id', 'm_min' => 19456, 'm_max' => 65536, 't_min' => 2, 't_max' => 6, 'p' => 1],
    'buckets' => [1024, 4096, 16384, 65536],
    'tag_bytes' => 16,
    // Anlegevorgänge je IP-Hash und Stunde (SPEC: 20). Nur die e2e-Läufe setzen mehr, weil sie in einer Stunde mehr als 20 Secrets anlegen.
    'create_per_hour' => (int) env('SECRETS_CREATE_PER_HOUR', 20),
];
