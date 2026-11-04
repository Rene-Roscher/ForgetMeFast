<?php

namespace App\Providers;

use App\Http\Throttling\RateLimits;
use Illuminate\Database\Events\ConnectionEstablished;
use Illuminate\Foundation\DevCommands;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimits::register();

        // In der Testumgebung (Pest, Playwright gegen das Build) nie den Vite-Dev-Server benutzen. So stört ein Testlauf
        // einen parallel laufenden `composer dev` nicht, und er muss public/hot weder lesen noch löschen.
        if ($this->app->environment('testing')) {
            Vite::useHotFile(storage_path('framework/testing/no-vite-hot'));
        } elseif (env('VITE_HOT_FILE')) {
            Vite::useHotFile((string) env('VITE_HOT_FILE')); // isolierter Dev-E2E-Lauf, siehe playwright.config.ts
        }

        // Gelöschte Seiten werden überschrieben (docs/SPEC.md: SQLite mit secure_delete). Löschen heißt nicht
        // physisches Überschreiben auf dem Datenträger; harmlos, weil nur Ciphertext (steht im README).
        Event::listen(ConnectionEstablished::class, function (ConnectionEstablished $event): void {
            if ($event->connection->getDriverName() === 'sqlite') {
                $event->connection->statement('PRAGMA secure_delete = ON');
            }
        });

        // Never depend on a local .env for these: DevTools records requests to disk, SSR would send page data
        // to a Node process. Both stay off (docs/specs/architecture.md).
        config(['inertia.devtools.enabled' => false, 'inertia.ssr.enabled' => false]);

        // composer dev: app server, Vite and the scheduler (secrets:prune runs every minute).
        // The starter's queue worker and log tail are not needed: there are no queued jobs.
        DevCommands::except('queue', 'logs');
        DevCommands::artisan('schedule:work', 'scheduler');
    }
}
