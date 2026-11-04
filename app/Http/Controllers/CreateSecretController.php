<?php

namespace App\Http\Controllers;

use App\Actions\CreateSecret;
use App\Http\Requests\CreateSecretRequest;
use Illuminate\Http\JsonResponse;

class CreateSecretController
{
    public function __invoke(CreateSecretRequest $request, CreateSecret $create): JsonResponse
    {
        $expiresAt = $create->handle($request->validated());

        return $expiresAt === null
            ? response()->json(['message' => 'conflict'], 409)
            : response()->json(['expires_at' => $expiresAt->toIso8601String()], 201);
    }
}
