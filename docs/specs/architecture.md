# Architektur

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: web-architecture, vue-inertia-frontend
Code: none yet
Checked against code: none

## Zweck
Eine einzige Laravel-App liefert die statische Inertia-Hülle und vier JSON-Endpunkte. Krypto läuft nur im Browser.

## Regeln
- Ein Deployable: Laravel. Keine zweite Seite, kein Admin-Panel, kein Worker außer dem Scheduler.
- Client-gerendertes Inertia/Vue, kein SSR. Inertia-Props enthalten nie Secret-Daten.
- Strikte CSP laut `docs/SPEC.md` (Server-Härtung). Akzeptanzkriterium: Inertia und Vite laufen darunter ohne
  Inline-Skripte.
- Keine Cookies: `StartSession`, CSRF und Cookie-Verschlüsselung entfallen (ADR 0003).
- Fonts selbst gehostet, keine CDN-Ressourcen.

## Schnittstellen
Siehe `docs/specs/api.md`.

## Tests, die es beweisen
CSP-Header-Test (Pest), Browser-Test ohne CSP-Verstöße in der Konsole (Playwright), Test auf fehlendes `Set-Cookie`.

## Offene Punkte
Keine.
