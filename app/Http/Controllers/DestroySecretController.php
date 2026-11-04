<?php

namespace App\Http\Controllers;

use App\Actions\DestroySecret;
use App\Rules\Base64Url;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DestroySecretController
{
    public function __invoke(string $id, Request $request, DestroySecret $destroy): Response|JsonResponse
    {
        $token = Base64Url::decode($request->header('X-Manage-Token'));

        return $token !== null && strlen($token) === 32 && $destroy->handle($id, $token)
            ? response()->noContent()
            : UnavailableResponse::make();
    }
}
