<?php

namespace App\Actions;

use App\Models\Secret;
use App\Rules\Base64Url;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Öffnen nach docs/SPEC.md, Protokoll v1, Öffnen 5:
 *  1. Einen Versuch ATOMAR RESERVIEREN (bedingtes UPDATE, nie lesen-ändern-schreiben), und zwar VOR dem Vergleich.
 *     Sonst umgehen parallele Anfragen das Limit.
 *  2. Erst danach hash_equals(verifier, sha256(proof)).
 *  3. Falsch: Der Versuch bleibt gezählt; beim Erreichen von max_attempts wird alles vernichtet.
 *  4. Richtig: Der Versuch wird zurückgegeben, der Abruf bedingt gezählt (nur solange views_used < max_views).
 *     Beim letzten erlaubten Abruf wird der Ciphertext im selben Schritt gelöscht.
 * Alles läuft in einer IMMEDIATE-Transaktion (config/database.php); die bedingten UPDATEs bleiben trotzdem die Regel.
 */
final class OpenSecret
{
    public function handle(string $id, string $proof): OpenResult
    {
        $now = CarbonImmutable::now();

        return DB::transaction(function () use ($id, $proof, $now): OpenResult {
            $reserved = Secret::query()->whereKey($id)->availableAt($now)
                ->whereColumn('failed_attempts', '<', 'max_attempts')
                ->whereColumn('views_used', '<', 'max_views')
                ->update(['failed_attempts' => DB::raw('failed_attempts + 1')]);

            if ($reserved !== 1) {
                return OpenResult::unavailable();
            }

            $row = Secret::query()->whereKey($id)->first(['verifier', 'iv', 'ciphertext', 'failed_attempts', 'max_attempts', 'max_views', 'views_used', 'expires_at']);
            if ($row === null || $row->ciphertext === null) {
                return OpenResult::unavailable();
            }

            $expected = Base64Url::encode(hash('sha256', $proof, true));
            if (! hash_equals($row->verifier, $expected)) {
                $left = (int) $row->max_attempts - (int) $row->failed_attempts;
                if ($left <= 0) {
                    $this->destroy($id, $now, 'attempts', fn ($q) => $q->whereColumn('failed_attempts', '>=', 'max_attempts'));
                }

                return OpenResult::invalid(max(0, $left));
            }

            Secret::query()->whereKey($id)->where('failed_attempts', '>', 0)
                ->update(['failed_attempts' => DB::raw('failed_attempts - 1')]);

            $counted = Secret::query()->whereKey($id)->availableAt($now)
                ->whereColumn('views_used', '<', 'max_views')
                ->update(['views_used' => DB::raw('views_used + 1')]);
            if ($counted !== 1) {
                return OpenResult::unavailable();
            }

            $viewsLeft = (int) $row->max_views - ((int) $row->views_used + 1);
            if ($viewsLeft <= 0) {
                $this->destroy($id, $now, 'consumed', fn ($q) => $q->whereColumn('views_used', '>=', 'max_views'));
            }

            return OpenResult::opened($row->iv, $row->ciphertext, max(0, $viewsLeft), CarbonImmutable::instance($row->expires_at));
        });
    }

    private function destroy(string $id, CarbonImmutable $now, string $reason, callable $condition): void
    {
        $query = Secret::query()->whereKey($id)->whereNull('destroyed_at');
        $condition($query);
        $query->update(['ciphertext' => null, 'destroyed_at' => $now, 'destroyed_reason' => $reason]);
    }
}
