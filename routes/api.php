<?php

use App\Http\Controllers\CreateSecretController;
use App\Http\Controllers\DestroySecretController;
use App\Http\Controllers\OpenSecretController;
use App\Http\Controllers\ShowSecretParamsController;
use App\Http\Controllers\ShowSecretStatusController;
use App\Http\Throttling\RateLimits;
use Illuminate\Support\Facades\Route;

// id = 16 Zufallsbytes als base64url (22 Zeichen). Alles andere ist dieselbe 404 wie ein unbekanntes Secret.
$id = '[A-Za-z0-9_-]{22}';

// Größenlimits der Bodies (siehe LimitBodySize): Anlegen bis 96 KiB, alles andere nur wenige KiB.
Route::post('/secrets', CreateSecretController::class)->middleware(['body.max:98304', 'throttle:'.RateLimits::CREATE]);
Route::get('/secrets/{id}/params', ShowSecretParamsController::class)->where('id', $id)->middleware('throttle:'.RateLimits::PARAMS);
Route::post('/secrets/{id}/open', OpenSecretController::class)->where('id', $id)->middleware(['body.max:2048', 'throttle:'.RateLimits::OPEN]);
Route::get('/secrets/{id}/status', ShowSecretStatusController::class)->where('id', $id)->middleware('throttle:'.RateLimits::STATUS);
Route::delete('/secrets/{id}', DestroySecretController::class)->where('id', $id)->middleware(['body.max:2048', 'throttle:'.RateLimits::DESTROY]);
