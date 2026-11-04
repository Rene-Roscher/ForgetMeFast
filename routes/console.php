<?php

use Illuminate\Support\Facades\Schedule;

// Aufräumen jede Minute (docs/SPEC.md). Öffnen prüft den Ablauf selbst; der Job entfernt nur Reste.
Schedule::command('secrets:prune')->everyMinute()->withoutOverlapping();
