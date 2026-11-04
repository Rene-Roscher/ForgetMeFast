# Laufzeit (Laravel)

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: laravel-architecture, laravel-production-runtime
Code: none yet
Checked against code: none

## Zweck
Wo welcher Code liegt und wie Grenzen getestet werden.

## Regeln
- Struktur laut `CLAUDE.md` (Actions, dünne Controller, strikte FormRequests, Middleware).
- Ein Schreibpfad pro Anwendungsfall, in `app/Actions/`.
- Pest-Architekturtests: Controller enthalten keine Abfragen, Models nur `Secret`.
- Abweichung von der Skill-Regel „öffentliche ID neben bigint-Schlüssel“: `id` ist zugleich Primär- und
  öffentlicher Schlüssel, weil sie 128 Bit Zufall ist (ADR 0003).
- PHP-Version aus `composer.json` (`config.platform.php`), nicht aus dem lokalen Binary.

## Tests, die es beweisen
`tests/Arch`-Tests, Header-Test, Cookie-Test.

## Offene Punkte
Keine.
