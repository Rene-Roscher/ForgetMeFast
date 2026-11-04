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
| Laravel-App | `.` (Repo-Wurzel) | `composer create-project laravel/laravel`, ohne Starter Kit | laravel/laravel v13.11.0, framework v13.40.0 | `--no-interaction --prefer-dist` |

Es gibt genau eine Komponente.

## Umgebung
`~/.zshrc:9` setzt `COMPOSER_IGNORE_PLATFORM_REQS=1`. Damit installierte Composer am 2026-11-04 `symfony/http-foundation`
8.1 (verlangt PHP ≥ 8.4.1) unter PHP 8.3.10, die App brach mit einem Syntaxfehler ab. Composer-Befehle laufen mit
`env -u COMPOSER_IGNORE_PLATFORM_REQS`; die CI setzt die Variable nicht.

## Befehle
- `composer dev` startet App und Scheduler lokal.
- `composer check` führt Pint, Pest und `composer audit` aus.
- `npm run check` führt Typecheck, Vitest, Build und `npm audit` aus.
- `npm run e2e` baut und führt Playwright gegen das Build aus (eigene Datenbank `database/e2e.sqlite`, Server per `php -S`).
- `npm run e2e:dev` dasselbe gegen den Vite-Dev-Server; nicht gleichzeitig mit `composer dev` (Port 5173, `public/hot`).

## Anbieter und Testmodus
Keine. Kein Mail, keine Zahlung, keine externen Dienste.

## Ports
`composer dev`: App `127.0.0.1:8000`, Vite `127.0.0.1:5173`. `npm run e2e`: `127.0.0.1:8765`.

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
Der Marketplace-Eintrag in `.claude/settings.json` ist nicht auf einen Release-Tag gepinnt, weil das Repo
`Rene-Roscher/skills` am 2026-11-04 keine Tags hat (`git ls-remote --tags`). Sobald es Tags gibt, `ref` setzen.
Einmalig pro Person: `claude plugin install <name>@rene-roscher-skills --scope project`.
