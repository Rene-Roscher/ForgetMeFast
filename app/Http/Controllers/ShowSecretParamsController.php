<?php

namespace App\Http\Controllers;

use App\Actions\GetSecretParams;
use Illuminate\Http\JsonResponse;

class ShowSecretParamsController
{
    public function __invoke(string $id, GetSecretParams $params): JsonResponse
    {
        $result = $params->handle($id);

        return $result === null ? UnavailableResponse::make() : response()->json($result);
    }
}
