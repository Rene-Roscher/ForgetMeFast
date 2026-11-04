<?php

namespace App\Actions;

use App\Models\Secret;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class PruneSecrets
{
    /**
     * Idempotent: markiert Abgelaufene als vernichtet (Ciphertext NULL) und löscht dann alle vernichteten Zeilen.
     * Öffnen prüft expires_at selbst; der Job räumt nur auf.
     *
     * @return array{expired: int, deleted: int}
     */
    public function handle(): array
    {
        $now = CarbonImmutable::now();
        $expired = Secret::query()->whereNull('destroyed_at')->where('expires_at', '<=', $now)
            ->update(['ciphertext' => null, 'destroyed_at' => $now, 'destroyed_reason' => 'expired']);
        $deleted = Secret::query()->whereNotNull('destroyed_at')->delete();

        // Im WAL-Modus liegen alte Seitenabbilder (auch von gelöschtem Ciphertext) im -wal, bis ein Checkpoint sie zurückschreibt.
        // TRUNCATE leert die Datei danach. Nur SQLite, nur außerhalb einer Transaktion; ein Checkpoint, der gerade nicht geht
        // (andere Verbindung hält eine Sperre), darf das Aufräumen nicht scheitern lassen, der nächste Lauf holt ihn nach.
        if (DB::connection()->getDriverName() === 'sqlite' && DB::transactionLevel() === 0) {
            try {
                DB::select('PRAGMA wal_checkpoint(TRUNCATE)');
            } catch (QueryException) {
                // nächster Lauf
            }
        }

        return ['expired' => $expired, 'deleted' => $deleted];
    }
}
