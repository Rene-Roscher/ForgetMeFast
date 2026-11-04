<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Beide Seiten sind statische Hüllen ohne Props. GET /s/{id} liest nichts und ändert nichts (Link-Vorschauen und
// Bots verbrennen kein Secret). Die id wertet nur das JavaScript im Browser aus.
Route::get('/', fn () => Inertia::render('Create'));
Route::get('/s/{id}', fn () => Inertia::render('View'));
