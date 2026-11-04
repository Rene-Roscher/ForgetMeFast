# Projektfakten

Fakten, keine Regeln. Versionen stehen nach dem Scaffold nur noch aus den Lockfiles, nicht aus dieser Datei.

## Werkzeuge auf dem Entwicklungsrechner (gelesen 2026-11-04)
- PHP 8.3.10 (`php -v`), Composer, Node 24.11.1 (`node -v`), npm.
- Globaler Laravel-Installer 5.24.4 (`composer global show laravel/installer`). Vor dem Scaffold gegen Packagist prüfen
  und aktualisieren.
- Packagist am 2026-11-04: `laravel/laravel` v13.11.0 (verlangt PHP ^8.3), `laravel/framework` v13.40.0,
  `inertiajs/inertia-laravel` v3.7.0.

## Scaffold-Tabelle
| Komponente | Verzeichnis | Starter | Version | Flags |
|---|---|---|---|---|
| Laravel-App | `.` (Repo-Wurzel) | `laravel new`, ohne Starter Kit | wird vor dem Scaffold nachgeschlagen | `--no-interaction`, Pest, SQLite, ohne Boost, Flags aus `--help` |

Es gibt genau eine Komponente.

## Befehle
- `composer dev` startet App und Scheduler lokal.
- `composer check` führt Pint, Pest und `composer audit` aus.
- `npm run check` führt Typecheck, Vitest, Build und `npm audit` aus.
- `npm run e2e` führt Playwright aus.

## Anbieter und Testmodus
Keine. Kein Mail, keine Zahlung, keine externen Dienste.

## Freigabeliste (Maintainer fragen)
`git push`, Releases, alle Netzwerkzugriffe außer Paketregistern und Dokumentation, jede Änderung an Protokoll v1,
neue Krypto-Bibliothek, Absenkung von Parametern.

## Git
Branch `main`, Commits direkt darauf, unsigniert (Ausnahme: ADR 0003), kein Push ohne Freigabe.
Kein Agent-Trailer in Commits (`core:commit-hygiene`).

## Agent-Plugins
Marketplace `rene-roscher-skills`, Projekt-Scope: `core`, `laravel`, `web`, `delivery`, `api`, `guardrails`.
Nicht installiert: `saas`. `laravel-boost@claude-plugins-official` bleibt aktiviert, weil `laravel` es voraussetzt;
das Composer-Paket `laravel/boost` wird nicht installiert, der MCP-Server des Plugins startet deshalb nicht.
Einmalig pro Person: `claude plugin install <name>@rene-roscher-skills --scope project`.
