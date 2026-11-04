# Laufzeit (Laravel)

Status: Implemented
Owner: Maintainer (Rene Roscher)
Skills: laravel-architecture, laravel-production-runtime
Code: app/Http, app/Providers, app/Actions, app/Console, bootstrap/app.php, tests/Arch
Checked against code: 2026-11-04

## Zweck
Wo welcher Code liegt und wie Grenzen getestet werden.

## Regeln
- Struktur laut `CLAUDE.md` (Actions, dünne Controller, strikte FormRequests, Middleware).
- Ein Schreibpfad pro Anwendungsfall, in `app/Actions/`.
- Pest-Architekturtests: Controller enthalten keine Abfragen, Models nur `Secret`.
- Abweichung von der Skill-Regel „öffentliche ID neben bigint-Schlüssel“: `id` ist zugleich Primär- und
  öffentlicher Schlüssel, weil sie 128 Bit Zufall ist (ADR 0003).
- PHP-Version aus `composer.json` (`config.platform.php`), nicht aus dem lokalen Binary.
- Throttling: benannte Limiter in `App\Http\Throttling\RateLimits`, Schlüssel ist ein HMAC der IP unter `APP_KEY`.
- `composer dev` startet Server, Vite und `schedule:work` (`AppServiceProvider`).
- Composer-Befehle laufen ohne `COMPOSER_IGNORE_PLATFORM_REQS` (siehe `docs/PROJECT-FACTS.md`).

## Tests, die es beweisen
`tests/Arch`-Tests, Header-Test, Cookie-Test.

## Offene Punkte
Keine.
