<?php

namespace App\Providers;

use App\Http\Throttling\RateLimits;
use Illuminate\Foundation\DevCommands;
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

        // Never depend on a local .env for these: DevTools records requests to disk, SSR would send page data
        // to a Node process. Both stay off (docs/specs/architecture.md).
        config(['inertia.devtools.enabled' => false, 'inertia.ssr.enabled' => false]);

        // composer dev: app server, Vite and the scheduler (secrets:prune runs every minute).
        // The starter's queue worker and log tail are not needed: there are no queued jobs.
        DevCommands::except('queue', 'logs');
        DevCommands::artisan('schedule:work', 'scheduler');
    }
}
