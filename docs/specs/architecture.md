# Architektur

Status: Approved
Owner: Maintainer (Rene Roscher)
Skills: web-architecture, vue-inertia-frontend
Code: app/Http/Middleware/SecurityHeaders.php, resources/js/app.ts, resources/views/app.blade.php, vite.config.ts, e2e/csp.spec.ts
Checked against code: 2026-11-04

## Zweck
Eine einzige Laravel-App liefert die statische Inertia-Hülle und vier JSON-Endpunkte. Krypto läuft nur im Browser.

## Regeln
- Ein Deployable: Laravel. Keine zweite Seite, kein Admin-Panel, kein Worker außer dem Scheduler.
- Client-gerendertes Inertia/Vue, kein SSR. Inertia-Props enthalten nie Secret-Daten.
- Strikte CSP laut `docs/SPEC.md` (Server-Härtung). Akzeptanzkriterium: Inertia und Vite laufen darunter ohne
  Inline-Skripte.
- Keine Cookies: `StartSession`, CSRF und Cookie-Verschlüsselung entfallen (ADR 0003).
- Fonts selbst gehostet, keine CDN-Ressourcen.
- Schriften (OFL-1.1) kommen aus `@fontsource-variable/*` und werden von der App ausgeliefert. Vite inlined keine Assets
  (`assetsInlineLimit: 0`), weil die CSP `data:` nicht erlaubt.
- Dunkelmodus: `public/theme-init.js` (externes, blockierendes Skript) setzt die Klasse `dark` aus der Systemeinstellung,
  ohne Inline-Skript und ohne Speicherung.
- Inline-Styles von Inertia tragen eine Nonce pro Request (`<meta name="csp-nonce">`, `SecurityHeaders`).
- SSR ist aus (`inertia({ ssr: false })`, `INERTIA_SSR_ENABLED=false`). Inertia DevTools ist aus, weil es Requests auf
  Platte aufzeichnet.
- Vite-Dev-Server: `vite.config.ts` bindet ihn an `127.0.0.1:5173`. Browser lehnen IPv6-Adressen wie `[::1]` als
  CSP-Quelle ab (in Chromium gesehen), deshalb erlaubt `SecurityHeaders` für IPv6-Hosts nichts.
- Statische Dateien unter `public/` liefert der Webserver, nicht Laravel. Die Header aus `SecurityHeaders` müssen dort
  im Webserver nachgebaut werden (noch nicht geprüft, siehe README).

## Schnittstellen
Siehe `docs/specs/api.md`.

## Tests, die es beweisen
CSP-Header-Test (Pest), Browser-Test ohne CSP-Verstöße in der Konsole (Playwright), Test auf fehlendes `Set-Cookie`.

## Offene Punkte
Keine.
