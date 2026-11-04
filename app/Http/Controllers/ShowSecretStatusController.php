<?php

namespace App\Http\Controllers;

use App\Actions\GetSecretStatus;
use App\Rules\Base64Url;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowSecretStatusController
{
    public function __invoke(string $id, Request $request, GetSecretStatus $status): JsonResponse
    {
        $token = Base64Url::decode($request->header('X-Manage-Token'));
        $result = $token !== null && strlen($token) === 32 ? $status->handle($id, $token) : null;

        return $result === null ? UnavailableResponse::make() : response()->json($result);
    }
}
