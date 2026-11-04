<?php

namespace App\Console\Commands;

use App\Actions\PruneSecrets;
use Illuminate\Console\Command;

class PruneSecretsCommand extends Command
{
    protected $signature = 'secrets:prune';

    protected $description = 'Vernichtet abgelaufene Secrets und löscht vernichtete Zeilen';

    public function handle(PruneSecrets $prune): int
    {
        $result = $prune->handle();
        $this->info("expired={$result['expired']} deleted={$result['deleted']}");

        return self::SUCCESS;
    }
}
