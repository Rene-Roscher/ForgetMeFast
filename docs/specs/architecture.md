# Architektur

Status: Implemented
Owner: Maintainer (Rene Roscher)
Skills: web-architecture, vue-inertia-frontend
Code: app/Http/Middleware/SecurityHeaders.php, resources/js/app.ts, resources/js/fragment.ts, resources/js/pages, resources/js/components, resources/css, resources/views/app.blade.php, vite.config.ts
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
- Statische Dateien unter- Layout: `components/AppShell.vue`. Links ein Seitenpanel in Tailwind teal-950 mit den belegten Vertrauensaussagen und der
  Grenzen-Aussage, rechts die Bühne mit äußeren und inneren Karten. Beim Erstellen: Inhalt als große Karte, Einstellungen als eigene
  Karte daneben, die Aktion "Verschlüsseln & Link erstellen" in einer schwebenden Leiste unten (`data-testid="dock"`). Ergebnis und
  Viewer sind schmalere Boxen, die sich dem Inhalt anpassen. Radien 8 bis 16 px, keine Pillen.
- Bausteine: Reka UI 2 (ToggleGroup, NumberField, Switch, Dialog, Tooltip, Collapsible) in `components/ui/`, siehe ADR 0005.
  Nativ bleiben nur Eingabefelder. Dialoge: Titel als Name, Beschreibung verknüpft, Fokus hinein und mit Esc zurück (E2E-Test).
- Texte: vue-i18n mit `resources/js/locales/de.json`, nur Deutsch, vorkompiliert. Tests: Syntax, Parität, Nutzung.
- Verlauf: Link "Verlauf" unten links in der Seitenleiste (am Handy Icon in der Kopfzeile) öffnet ein Fach von rechts
  (`HistoryDrawer.vue`, `SecretHistory.vue`); "Wie weit reicht der Schutz?" steht ganz unten in der Seitenleiste (am Handy am Seitenende).
  Ergebnis und Viewer sind waagerecht und senkrecht zentriert. Fehler erscheinen als Toast oben mittig (`Toaster.vue`).
- Design umschalten: Icon-Button oben rechts (`ThemeToggle.vue`). Die Wahl `light` oder `dark` steht in `localStorage`
  (Schlüssel `fmf-theme`), sonst nichts, kein Cookie. `public/theme-init.js` setzt die Klasse vor dem ersten Zeichnen.
- Icons: `lucide-vue-next` (ISC) über `components/Icon.vue`; Logo `components/LogoMark.vue` (Schloss mit Handschlag) und
  `public/favicon.svg`. Keine Emojis, keine Symbolzeichen (Test `ui-guard.test.ts`).
- Vertrauensaussagen in der Seitenleiste sind nur solche, die das Projekt belegt: E2E-Test, Klartext-Scan, Cookie-Test,
  Krypto-Tests. "Zero Knowledge" meint die Eigenschaft, dass der Server weder Klartext noch Passwort noch Schlüssel kennt,
  keinen Zero-Knowledge-Beweis.
- `resources/js/fragment.ts` liest das URL-Fragment einmal und leert die Adresse, bevor Inertia startet. Inertia stellte das
  Fragment sonst wieder her (im E2E-Test gesehen).
- Statische Dateien unter `public/` liefert der Webserver, nicht Laravel. Die Header aus `SecurityHeaders` müssen dort
  im Webserver nachgebaut werden (noch nicht geprüft, siehe README).

## Schnittstellen
Siehe `docs/specs/api.md`.

## Tests, die es beweisen
CSP-Header-Test (Pest), Browser-Test ohne CSP-Verstöße in der Konsole (Playwright), Test auf fehlendes `Set-Cookie`.

## Offene Punkte
Keine.
