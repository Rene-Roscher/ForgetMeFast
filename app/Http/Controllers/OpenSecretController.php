<?php

namespace App\Http\Controllers;

use App\Actions\OpenSecret;
use App\Http\Requests\OpenSecretRequest;
use App\Rules\Base64Url;
use Illuminate\Http\JsonResponse;

class OpenSecretController
{
    public function __invoke(string $id, OpenSecretRequest $request, OpenSecret $open): JsonResponse
    {
        $result = $open->handle($id, (string) Base64Url::decode($request->validated('proof')));

        return match ($result->status) {
            'opened' => response()->json([
                'iv' => $result->iv,
                'ciphertext' => $result->ciphertext,
                'views_left' => $result->viewsLeft,
                'expires_at' => $result->expiresAt?->toIso8601String(),
            ]),
            'invalid' => response()->json(['message' => 'invalid', 'attempts_left' => $result->attemptsLeft], 403),
            default => UnavailableResponse::make(),
        };
    }
}
