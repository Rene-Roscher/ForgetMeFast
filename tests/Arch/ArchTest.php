<?php

arch('app code uses no insecure or non-cryptographic functions')
    ->preset()->security();

arch('app code has no debug leftovers')
    ->expect(['dd', 'dump', 'ray', 'var_dump', 'print_r', 'error_log'])
    ->not->toBeUsed();

arch('controllers stay thin: no queries, no models, no logging')
    ->expect('App\Http\Controllers')
    ->not->toUse([
        'Illuminate\Support\Facades\DB',
        'Illuminate\Support\Facades\Log',
        'Illuminate\Database\Eloquent\Model',
    ]);

arch('actions are final and know nothing about HTTP')
    ->expect('App\Actions')
    ->toBeFinal()
    ->not->toUse(['Illuminate\Http\Request', 'Illuminate\Http\JsonResponse', 'Inertia\Inertia']);

arch('form requests live in App\Http\Requests and extend FormRequest')
    ->expect('App\Http\Requests')
    ->toExtend('Illuminate\Foundation\Http\FormRequest');

arch('only Secret may be a model')
    ->expect('App\Models')
    ->toOnlyBeUsedIn(['App\Actions', 'App\Http', 'App\Console', 'Database'])
    ->ignoring('App\Models\Secret');

arch('nothing logs request bodies or the whole request')
    ->expect('App')
    ->not->toUse(['Illuminate\Support\Facades\Log'])
    ->ignoring('App\Providers');
