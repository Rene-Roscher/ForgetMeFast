<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in('Feature');

use App\Rules\Base64Url;

/**
 * Ein gültiger Body für POST /api/secrets plus die geheimen Werte, die nur der Test kennt.
 *
 * @param  array<string, mixed>  $overrides
 * @return array{body: array<string, mixed>, id: string, proof: string, token: string}
 */
function newSecret(array $overrides = []): array
{
    $proof = random_bytes(32);
    $token = random_bytes(32);
    $body = array_replace_recursive([
        'id' => Base64Url::encode(random_bytes(16)),
        'v' => 1,
        'kdf' => ['name' => 'argon2id', 'm' => 19456, 't' => 2, 'p' => 1],
        'salt' => Base64Url::encode(random_bytes(16)),
        'iv' => Base64Url::encode(random_bytes(12)),
        'ciphertext' => Base64Url::encode(random_bytes(1024 + 16)),
        'verifier' => Base64Url::encode(hash('sha256', $proof, true)),
        'manage_hash' => Base64Url::encode(hash('sha256', $token, true)),
        'ttl' => 3600,
        'max_views' => 1,
        'max_attempts' => 3,
    ], $overrides);

    return ['body' => $body, 'id' => $body['id'], 'proof' => Base64Url::encode($proof), 'token' => Base64Url::encode($token)];
}

/** Legt ein Secret über die API an und gibt die Testwerte zurück. */
function storeSecret(array $overrides = []): array
{
    $secret = newSecret($overrides);
    test()->postJson('/api/secrets', $secret['body'])->assertCreated();

    return $secret;
}

function wrongProof(): string
{
    return Base64Url::encode(random_bytes(32));
}
