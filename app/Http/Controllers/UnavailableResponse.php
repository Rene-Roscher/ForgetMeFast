<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/** Die eine Antwort für unbekannt, abgelaufen, vernichtet, verbraucht und falsches Verwaltungstoken. */
final class UnavailableResponse
{
    public static function make(): JsonResponse
    {
        return response()->json(['message' => 'unavailable'], 404);
    }
}
