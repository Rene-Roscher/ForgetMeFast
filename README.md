# ForgetMeFast

Secrets einmalig und Ende-zu-Ende-verschlüsselt teilen. Self-Hosted, ohne Accounts.

> Status: Setup-Gerüst. Es gibt noch keine Funktion. Die Abschnitte unten werden mit dem Projekt gefüllt.

## Idee

ForgetMeFast ist eine selbst gehostete Webapp, mit der man Passwörter, API-Keys und Zugangsdaten einmalig weitergibt.
Der Browser verschlüsselt, der Server speichert nur Ciphertext und Metadaten und vernichtet das Secret nach Ablauf,
zu vielen Abrufen oder zu vielen Fehlversuchen. Es gibt keine Accounts, kein Tracking und keine
Drittanbieter-Ressourcen. Die Details stehen in [`docs/SPEC.md`](docs/SPEC.md).

## Start

Voraussetzungen: PHP 8.3 mit `sqlite3`, `pdo_sqlite`, `mbstring`, `intl`; Composer; Node (siehe `.nvmrc`).

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
composer dev        # App, Vite und Scheduler
```

Danach läuft die App unter http://127.0.0.1:8000 (Vite auf Port 5173).

Prüfen (nicht gleichzeitig mit `composer dev`: `npm run e2e` löscht `public/hot` und `e2e:dev` braucht Port 5173):

```bash
composer check      # Pint, Pest, composer audit
npm run check       # Typecheck, Vitest, Build, npm audit
npm run e2e         # Playwright gegen das Build (einmalig: npx playwright install chromium)
npm run e2e:dev     # derselbe Test gegen den Vite-Dev-Server
```

Hinweis: Ist `COMPOSER_IGNORE_PLATFORM_REQS` gesetzt, kann Composer Pakete installieren, die eine neuere PHP-Version
verlangen. Für dieses Projekt vor Composer-Befehlen zurücksetzen (siehe [`docs/PROJECT-FACTS.md`](docs/PROJECT-FACTS.md)).

In Produktion: `APP_ENV=production`, `APP_DEBUG=false`. Der Webserver muss die Sicherheits-Header auch für statische
Dateien setzen (noch nicht geprüft).

## Eingesetzte KI-Werkzeuge und Vorgehen

*(wird gefüllt)* Gebaut wird mit Claude Code und den Skills aus dem Marketplace `Rene-Roscher/skills`
(`core`, `laravel`, `web`, `delivery`, `api`, `guardrails`). Der Agent schreibt Code und Tests, der Maintainer prüft jede
Änderung und entscheidet über alles, was Protokoll v1 berührt. Entscheidungen stehen als ADR in [`docs/adr/`](docs/adr/).

## Architekturentscheidungen

*(wird mit je einem Satz Begründung und Quelle pro Baustein von Protokoll v1 gefüllt)*

- [ADR 0001](docs/adr/0001-record-architecture-decisions.md): Entscheidungen als ADR festhalten.
- [ADR 0002](docs/adr/0002-argon2id-library.md): Argon2id-Bibliothek (Vorschlag, noch nicht freigegeben).
- [ADR 0003](docs/adr/0003-setup-decisions.md): ohne Accounts, ohne Cookies, nativer Dev-Stack, unsignierte Commits.

## Qualitätssicherung

*(wird gefüllt)* Heute vorhanden: Pest (Header, Cookies, Throttling, Architekturregeln), Vitest (Platzhalter),
Playwright (Inertia und Vite unter der strikten CSP, ohne Cookies, Schriften vom eigenen Ursprung), CI mit auf SHAs
gepinnten Actions und zizmor. Noch offen: Krypto-Testvektoren (RFC 5869, RFC 9106), Klartext-Scan.

## Bekannte Grenzen

| Angreifer hat | Ergebnis |
|---|---|
| Datenbank oder Server-Logs (neugieriger Betreiber) | Nur Ciphertext und Verifier. Ohne den Link-Key nicht lesbar, Offline-Angriff aufs Passwort scheitert am 256-Bit-Key. |
| Nur den Link (z. B. aus einem Chatverlauf) | Kein Offline-Angriff möglich, weil der Server den Ciphertext erst nach dem Nachweis herausgibt. Online nur `max_attempts` Versuche. |
| Link **und** Serverdaten | Offline-Angriff aufs Passwort. Argon2id bremst, die Passwortstärke entscheidet. |
| Nur das Passwort | Nutzlos ohne Link. |
| Kompromittierter Server liefert manipuliertes JavaScript | **Nicht abgedeckt.** Das Grundproblem von Web-E2EE. Gemildert durch strikte CSP, minimale Abhängigkeiten, Open Source. |
| Wer den Link hat, will nur zerstören | Möglich (3 Fehlversuche). Vertraulichkeit geht vor Verfügbarkeit. |

Weitere ehrliche Grenzen: Chat-Anbieter sehen den **kompletten Link** (er ist Nachrichtentext), deshalb muss das Passwort über einen anderen Kanal gehen. Der Server sieht Metadaten (Zeitpunkt, IP-Hash im Throttling, Größen-Bucket). Browser-Verlauf und Erweiterungen sehen das Fragment. Keine externe Prüfung der Krypto. Sicherheitseigenschaften beim richtigen Namen nennen: Vertraulichkeit gegenüber dem Server, Integrität durch AEAD, keine Aussage zu Forward Secrecy.

Dazu kommt (Stand Setup):

- Die gewählte Argon2-Implementierung ist nach heutigem Stand nicht auditiert (siehe ADR 0002).
- Die CI lief noch nicht auf GitHub, weil nichts gepusht wurde.
- Commits sind nicht signiert (siehe ADR 0003).

## Lizenzen und Quellen

- Schriften Plus Jakarta Sans und Geist Mono: SIL Open Font License 1.1 (über `@fontsource-variable/*`).
- Die Quellenliste aus [`docs/SPEC.md`](docs/SPEC.md) wird hier verlinkt, sobald die Zahlen geprüft sind.
