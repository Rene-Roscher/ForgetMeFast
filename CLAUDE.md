@AGENTS.md

# ForgetMeFast (FMF)

## Was das Projekt ist
ForgetMeFast ist eine Self-Hosted-Webapp, mit der man Secrets (Passwörter, API-Keys, Zugangsdaten, Konfigurationsschnipsel) **einmalig und Ende-zu-Ende-verschlüsselt** teilt. Der Ersteller tippt das Secret ein, wählt ein Passwort und Limits und bekommt einen Link. Der Empfänger öffnet den Link, gibt das Passwort ein und liest das Secret. Danach ist es nach seinen Regeln (Abrufe, Ablauf, Fehlversuche) vernichtet.

Die Verschlüsselung passiert im Browser. Der Server speichert nur Ciphertext und Metadaten und kennt weder Klartext noch Passwort noch den Schlüssel im Link.

## Wofür man es braucht
- Zugangsdaten an Kunden oder Kollegen übergeben, ohne dass sie im Chat- oder Mailverlauf liegen bleiben.
- API-Keys, Tokens, Recovery-Codes einmalig weitergeben.
- Sensible Notizen mit Ablaufdatum teilen.

Nicht gedacht für: Passwortmanager-Ersatz, Langzeitablage, Dateitransfer, Accounts oder Teams.

## So funktioniert es (Kurzform, Details in `docs/SPEC.md`)
- **Ersteller (`/`):** Browser erzeugt einen zufälligen Link-Key, leitet aus Link-Key und Passwort (Argon2id, HKDF) zwei getrennte Schlüssel ab (Verschlüsselung und Zugangsnachweis), verschlüsselt mit AES-256-GCM und sendet nur Ciphertext, Header, Verifier und Einstellungen. Link = `/s/{id}#{link-key}`.
- **Empfänger (`/s/{id}`):** Die App liest den Key aus dem URL-Fragment (das nie an einen Server gesendet wird), fragt das Passwort ab, sendet nur den Zugangsnachweis, bekommt bei Erfolg den Ciphertext und entschlüsselt lokal.
- **Server:** Zählt Abrufe und Fehlversuche, löscht bei Ablauf, zu vielen Abrufen oder Fehlversuchen und antwortet auf "nicht verfügbar" immer gleich.

## Sicherheitsmodell
Verbindlich ist der Abschnitt "Sicherheitsziele und Grenzen" sowie "Protokoll v1" in `docs/SPEC.md`. Kurz: Vertraulichkeit gegenüber dem Server und Datenbank-Leaks, Integrität durch AEAD. **Nicht** abgedeckt: ein kompromittierter Server, der manipuliertes JavaScript ausliefert, und Chat-Anbieter, die den ganzen Link sehen. Das steht ehrlich im README.

## Invarianten (keine Abweichung ohne ADR und Freigabe des Maintainers)
- `[invariant]` Der Server erhält **nie** Klartext, Passwort, Link-Key oder Verschlüsselungsschlüssel.
- `[invariant]` Krypto nur über Web Crypto API plus die per ADR gewählte Argon2id-Bibliothek. Keine eigenen Primitive, keine Protokolländerung ohne Freigabe.
- `[invariant]` Das Fragment wird nur im Browser gelesen, danach per `history.replaceState` entfernt und nie geloggt, gespeichert oder gesendet.
- `[invariant]` `GET /s/{id}` ändert keinen Zustand. Nur `POST .../open` verbraucht Abrufe.
- `[invariant]` Fehlversuche werden **vor** dem Vergleich atomar reserviert, Abrufe und Versuche zählen über bedingte `UPDATE`s, nie per Lesen-Ändern-Schreiben.
- `[invariant]` Unbekannt, abgelaufen, vernichtet und verbraucht liefern identische Antworten.
- `[invariant]` Keine Roh-IPs, keine Request-Bodies, keine Secrets in Logs. Throttling über gesalzene IP-Hashes.
- `[invariant]` Strikte CSP, keine Inline-Skripte, keine Drittanbieter-Ressourcen, kein Tracking, keine Accounts.
- `[default]` Argon2id mindestens m=19 MiB, t=2, p=1 (OWASP). Abweichung nur mit ADR.

## Stack und Struktur
Laravel (aktuell, ohne Starter Kit), Inertia mit Vue 3 + TypeScript, Tailwind v4 mit Design-Tokens aus `tokens.css`, SQLite. Tests mit Pest, Vitest und Playwright. Formatierung mit Pint.

```
app/Actions/         Atomare Geschäftslogik (Anlegen, Öffnen, Vernichten, Prune)
app/Http/            Controller (dünn), Requests (strikte Validierung), Middleware (CSP, Header, Throttle)
app/Models/Secret.php
resources/js/crypto/ Krypto-Modul (rein, ohne Framework, ohne Netzwerk, vollständig getestet)
resources/js/pages/  Inertia-Seiten (Ersteller, Viewer)
resources/js/locales/ Alle UI-Texte (Deutsch, vue-i18n)
docs/                SPEC.md, adr/, CRYPTO-NOTES.md
```

## Befehle
- `composer dev` startet App und Scheduler lokal
- `composer check` führt Pint, Pest und `composer audit` aus
- `npm run check` führt Typecheck, Vitest, Build und `npm audit` aus
- `npm run e2e` führt Playwright aus (inklusive Klartext-Scan)

## Konventionen
- Code und Bezeichner Englisch, UI-Texte und Doku Deutsch.
- Kleine, sprechende Commits (siehe Skill `commit-hygiene`), ein Schritt pro Commit.
- Entscheidungen mit Nachwirkung als ADR in `docs/adr/` (Kontext, Entscheidung, Folgen, Quelle).
- Jede Krypto-Funktion trägt einen kurzen **Warum-Block** mit Quelle (RFC, Spezifikation, OWASP). In `docs/CRYPTO-NOTES.md` steht zusätzlich eine laienverständliche Erklärung pro Baustein.

## Arbeitsweise
- Jede Aussage über Sicherheit oder Korrektheit ist belegt (Quelle oder Test), nicht behauptet.
- Tests zuerst bei Krypto-Modul, Abruf- und Versuchslogik. Testvektoren aus RFC 5869 und RFC 9106.
- Nach jedem Schritt: drei Sätze, was entschieden wurde und warum. Bei Unsicherheit stoppen und fragen, besonders bei allem, was das Protokoll berührt.
- "Fertig" gilt erst, wenn `composer check`, `npm run check` und `npm run e2e` grün sind und die Änderung nachgewiesen ist.

## Skills (Marketplace `rene-roscher-skills`, Projekt-Scope)
Installiert: `core`, `laravel`, `web`, `delivery`, `api`. Nicht installiert: `saas` (kein Multi-Tenant, keine Accounts). Regeln mit `[invariant]` gelten ausnahmslos, `[default]` nur mit ADR zu überschreiben.
- Planung und Lieferung: `core:feature-planning`, `core:feature-delivery`, `core:test-strategy`, `core:commit-hygiene`
- Nachweis: `core:evidence-before-claims`, `core:verify-before-done`, `core:safe-actions`
- Backend und Frontend: `laravel:laravel-architecture`, `web:vue-inertia-frontend`, `web:design-quality`, `web:browser-verification`
- Lieferkette und CI: `delivery:github-actions-hardening`, `delivery:release-supply-chain`
- API-Form: `api:api-contract`

## Nicht tun
- Keine Accounts, kein Login, keine Cookies für Funktionen, keine Analytics, keine CDN-Ressourcen.
- Keine Dateien oder Anhänge, kein E-Mail-Versand, keine Mehrsprachigkeit. (Ausnahme per ADR 0007: eine Textdatei darf im Browser in das Secret-Feld geladen werden. Sie ist dann nur Text im Feld, es gibt keinen Upload und kein Dateiformat im Protokoll.)
- Keine Protokolländerung, keine neue Krypto-Bibliothek und keine Absenkung von Parametern ohne ADR.
- Keine Secrets, Keys oder echten Passwörter im Repo, in Fixtures oder in Logs.
