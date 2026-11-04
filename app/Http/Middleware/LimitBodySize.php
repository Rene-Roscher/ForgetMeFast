<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lehnt zu große Request-Bodies ab, bevor sie als JSON gelesen und validiert werden.
 *
 * Ohne Grenze würde ein sehr großer Body vollständig geparst (Speicher und Rechenzeit), bevor die Validierung ihn mit 422
 * ablehnt. Das Limit steht als Routenparameter: `body.max:98304` für das Anlegen (Ciphertext bis 64 KiB plus Base64 und
 * Felder), wenige KiB für alles andere. Die Antwort verrät nichts über ein Secret und gilt für jeden Pfad gleich.
 */
final class LimitBodySize
{
    public function handle(Request $request, Closure $next, string $maxBytes): Response
    {
        $declared = $request->headers->get('Content-Length');
        $length = $declared !== null ? (int) $declared : strlen($request->getContent());

        if ($length > (int) $maxBytes) {
            return response()->json(['message' => 'too_large'], 413);
        }

        return $next($request);
    }
}
