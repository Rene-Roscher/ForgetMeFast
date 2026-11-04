<?php

use App\Actions\OpenSecret;
use App\Rules\Base64Url;
use Illuminate\Contracts\Console\Kernel;

// Arbeiter für ConcurrencyTest: bootet die App, wartet an der Startlinie und ruft OpenSecret genau einmal auf.
// Aufruf: php open-worker.php <id> <startMicrotime> <proof base64url>
require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[, $id, $start, $proof] = $argv;
while (microtime(true) < (float) $start) {
    usleep(200);
}

$result = $app->make(OpenSecret::class)->handle($id, Base64Url::decode($proof));
echo $result->status, PHP_EOL;
