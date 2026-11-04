# ForgetMeFast: Produkt- und Technik-Spec

Arbeitsname **ForgetMeFast**. Eine Self-Hosted-Webapp zum Teilen von Secrets. Der Browser verschlüsselt, der Server speichert nur Ciphertext und vernichtet ihn nach Ablauf, zu vielen Abrufen oder zu vielen Fehlversuchen.

**Ziel:** Klein, aber so sicher wie realistisch möglich. Jede Krypto-Entscheidung hat eine Quelle und ist dokumentiert.
**Regeln:** Keine eigenen Krypto-Primitive, nur Web Crypto API plus eine geprüfte Argon2id-Bibliothek. Keine Accounts, kein Tracking, keine Drittanbieter-Ressourcen.

## Stack
Laravel (aktuell, **ohne Starter Kit**: das Vue Starter Kit bringt Auth, Users, Dashboard und Settings mit, hier gibt es aber keine Accounts), **Inertia** mit Vue 3 + TypeScript, Tailwind v4 mit den Design-Tokens aus `tokens.css` (als `:root`-Variablen, per `@theme` gemappt), SQLite. Inertia wird nach der offiziellen Anleitung manuell eingerichtet. Inertia-Seiten tragen **keine Secrets als Props**, Krypto und API-Aufrufe laufen im Browser per `fetch` gegen die JSON-Endpunkte. Abnahme: Inertia und Vite laufen unter der strikten CSP ohne Inline-Skripte. Pest, Vitest, Playwright, Pint. Fonts selbst gehostet. Design: `tokens.css` (Design-Tokens, liegt im Repo).

## Sicherheitsziele und Grenzen (gehört wörtlich ins README)
| Angreifer hat | Ergebnis |
|---|---|
| Datenbank oder Server-Logs (neugieriger Betreiber) | Nur Ciphertext und Verifier. Ohne den Link-Key nicht lesbar, Offline-Angriff aufs Passwort scheitert am 256-Bit-Key. |
| Nur den Link (z. B. aus einem Chatverlauf) | Kein Offline-Angriff möglich, weil der Server den Ciphertext erst nach dem Nachweis herausgibt. Online nur `max_attempts` Versuche. |
| Link **und** Serverdaten | Offline-Angriff aufs Passwort. Argon2id bremst, die Passwortstärke entscheidet. |
| Nur das Passwort | Nutzlos ohne Link. |
| Kompromittierter Server liefert manipuliertes JavaScript | **Nicht abgedeckt.** Das Grundproblem von Web-E2EE. Gemildert durch strikte CSP, minimale Abhängigkeiten, Open Source. |
| Wer den Link hat, will nur zerstören | Möglich (3 Fehlversuche). Vertraulichkeit geht vor Verfügbarkeit. |

Weitere ehrliche Grenzen: Chat-Anbieter sehen den **kompletten Link** (er ist Nachrichtentext), deshalb muss das Passwort über einen anderen Kanal gehen. Der Server sieht Metadaten (Zeitpunkt, IP-Hash im Throttling, Größen-Bucket). Browser-Verlauf und Erweiterungen sehen das Fragment. Keine externe Prüfung der Krypto. Sicherheitseigenschaften beim richtigen Namen nennen: Vertraulichkeit gegenüber dem Server, Integrität durch AEAD, keine Aussage zu Forward Secrecy.

## Protokoll v1
**Erstellen (nur im Browser):**
1. `id` = 16 Zufallsbytes (base64url), `K_link` = 32 Zufallsbytes, `salt` = 16 Zufallsbytes, alles über `crypto.getRandomValues`.
2. `pwKey` = Argon2id(Passwort, NFKC-normalisiert, UTF-8; `salt`; Parameter mindestens m=19 MiB, t=2, p=1). Die Parameter stehen im Header und sind versioniert.
3. `ikm` = `K_link` ‖ `pwKey`. `K_enc` = HKDF-SHA-256(ikm, salt, info=`fmf/v1/enc`, 32 Byte). `K_auth` = HKDF-SHA-256(ikm, salt, info=`fmf/v1/auth`, 32 Byte). Getrennte `info`-Labels sorgen für Schlüsseltrennung.
4. Klartext mit 4-Byte-Länge davor auf einen Bucket auffüllen (1, 4, 16, 64 KiB). Dann AES-256-GCM mit zufälligem 96-Bit-IV. AAD = kanonisch kodierter Header (`v`, `id`, KDF-Name und -Parameter, `salt`), damit Austausch und Downgrade auffallen.
5. `verifier` = SHA-256(`K_auth`). `manage_token` = 32 Zufallsbytes, der Server speichert nur dessen SHA-256.
6. Der Browser sendet `id`, Header, `iv`, `ciphertext`, `verifier`, `manage_hash` und die Einstellungen. Link = `/s/{id}#{base64url(K_link)}`.

**Öffnen:**
1. `GET /s/{id}` liefert nur die statische App, **ändert keinen Zustand** (Link-Vorschauen und Bots verbrennen nichts).
2. Die App liest das Fragment und entfernt es sofort per `history.replaceState`. Fehlt es, kommt die Meldung "Link unvollständig".
3. `GET /api/secrets/{id}/params` liefert Header, `salt` und `max_attempts` oder die einheitliche 404.
4. Der Browser leitet `K_auth` und `K_enc` ab und sendet `K_auth` als `proof`.
5. Der Server **reserviert zuerst atomar einen Versuch** (`failed_attempts + 1`, nur solange `< max_attempts`) und vergleicht erst dann `hash_equals(verifier, sha256(proof))`. Reservieren vor dem Vergleich ist Pflicht, sonst umgehen parallele Requests das Limit. Falscher Proof: Der Versuch bleibt gezählt, beim Erreichen von `max_attempts` wird alles vernichtet. Richtiger Proof: Der Versuch wird zurückgegeben, der Abruf wird atomar gezählt (nur solange `views_used < max_views`), und der Server liefert `iv` und `ciphertext`. Beim letzten erlaubten Abruf wird der Ciphertext im selben Schritt gelöscht.
6. Der Browser entschlüsselt, prüft das GCM-Tag, entfernt das Padding und zeigt das Secret.

## Optionen für den Ersteller
- **Passwort:** Pflicht, mindestens 10 Zeichen. Der Generator (Standard) erzeugt 5 Wörter aus der EFF-Wortliste (ca. 64 Bit) oder 16 zufällige Zeichen, mit Rejection Sampling ohne Modulo-Bias. Die Stärke wird in Bit angezeigt (generiert exakt, getippt als Schätzung, so beschriftet). Hinweis: Passwort getrennt vom Link senden.
- **Ablauf:** 5 Minuten, 1 Stunde, 24 Stunden, 7 Tage. Der Server rechnet `expires_at` selbst aus, der Server-Maximalwert ist per Config begrenzt.
- **Max. Abrufe:** 1 bis 10, Standard 1.
- **Max. Fehlversuche:** 1 bis 10, Standard 3, danach wird das Secret vernichtet.
- **Jetzt vernichten** auf der Ergebnisseite (mit dem `manage_token` im Speicher).
- Die Farbe ist **keine** Sicherheitsfunktion (ca. 3,6 Bit) und gehört nicht in den MVP. Wenn überhaupt, als rein kosmetische Markierung im Stretch.

## UI (modern, einfach, zentriert)
- **Aufbau:** Seitenleiste links (Marke, Vertrauensaussagen, Verlauf, "So funktioniert es", "Wie weit reicht der Schutz?"), rechts die Bühne.
  Karten sind verschachtelt: eine äußere, etwas gedämpfte Karte trägt Titel und Fuß, die innere hellere den Inhalt. Hell und Dunkel
  per Icon oben rechts. Am Handy gibt es keine Seitenleiste; Verlauf steht als Icon in der Kopfzeile, die Erklärungen am Seitenende.
- **Ersteller `/`:** Links die große Karte für das Secret (Textfeld als innere Karte, wächst mit dem Inhalt, Textdatei laden oder
  ablegen, Beispiel-Platzhalter, Strg+S), daneben die Karte für das Passwort (beim Laden erzeugt und sichtbar, Wörter oder Zeichen,
  Stärke in vier Stufen, eine Zeile). Unten eine schwebende Leiste: Ablauf, "Einmalig" (genau ein Abruf, blendet die Abrufe aus),
  Abrufe, Fehlversuche und "Verschlüsseln & Link erstellen". Die zuletzt gewählten Regeln bleiben im Browser (ADR 0007).
- **Gesendeter Body:** Der Playwright-Test prüft den tatsächlich gesendeten Request: genau die erwarteten Felder, kein Klartext,
  kein Passwort, kein Link-Key. Einen Prüfen-Dialog vor dem Senden gibt es nicht mehr (ADR 0007).
- **Ergebnis:** Chips mit den Regeln auf der äußeren Karte, darin **Link** und **Passwort** je mit Kopieren und dem Hinweis, sie auf zwei
  getrennten Wegen zu schicken. Unten "Jetzt vernichten" (danach ein klarer Endzustand) und "Neues Secret".
- **Verlauf:** Eigene Secrets in diesem Browser (Link mit Schlüssel und Verwaltungstoken, nie Passwort oder Klartext), Abrufe und
  Status vom Server über das Verwaltungstoken (ADR 0006).
- **Viewer `/s/{id}`:** Schmale zentrierte Karte mit Schloss, "Geschütztes Secret", Passwortfeld, "Entschlüsseln". Bei Fehlern
  "Falsches Passwort, noch n Versuche". Bei Erfolg liegt das Secret unscharf hinter "Anzeigen" (Auto-Hide nach 60 s), mit Kopieren,
  Restabrufen und Ablauf-Countdown. Bei viel Inhalt steht der Text links und die Übersicht rechts.
- **Endzustände:** "Nicht verfügbar" ist für unbekannt, abgelaufen, vernichtet und verbraucht **identisch** (gleicher Status, gleicher Body).
- Hell und dunkel, kein Flackern beim Laden, Tastatur und Screenreader bedienbar.

## API
`POST /api/secrets` · `GET /api/secrets/{id}/params` · `POST /api/secrets/{id}/open` · `DELETE /api/secrets/{id}` (mit `manage_token` im Header) · `GET /api/secrets/{id}/status` (mit `manage_token`, für den Verlauf des Erstellers, ADR 0006). Strikte Validierung: Wertebereiche, Größen (Ciphertext höchstens 64 KiB plus Overhead), strikte base64url-Prüfung, unbekannte Felder abweisen. Der Server nimmt nie absolute Zeiten vom Client an.

## Datenmodell
`secrets`: `id` (PK), `v`, `kdf` (Name, m, t, p), `salt`, `iv`, `ciphertext` (nullable nach Vernichtung), `verifier`, `manage_hash`, `max_views`, `views_used`, `max_attempts`, `failed_attempts`, `expires_at`, `destroyed_at`, `destroyed_reason`, `created_at`. Kein Klartext-Feld und keine IP-Spalte.

## Server-Härtung
- **Header** auf allen Antworten: strikte CSP (`default-src 'none'`, Skripte nur `'self'`, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`), `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex`, `Permissions-Policy` restriktiv.
- Konditionale `UPDATE`s statt Lesen-Ändern-Schreiben für Abrufe und Fehlversuche (SQLite hat keine Zeilensperren).
- Throttling je IP-Hash (mit `APP_KEY` gesalzen): Erstellen 20/h, Params 60/min, Öffnen 30/min, Löschen 30/min. Keine Roh-IPs und keine Request-Bodies in Logs, `APP_DEBUG=false` in der Doku.
- Scheduler `secrets:prune` jede Minute. SQLite mit `secure_delete`. Im README ehrlich: Löschen heißt nicht physisches Überschreiben, harmlos, weil nur Ciphertext.
- Abhängigkeiten minimal, Lockfiles, `composer audit` und `npm audit` in der CI.

## Tests
- **Vitest (Krypto-Modul, ohne Netzwerk):** HKDF-Testvektoren aus RFC 5869 Anhang A, Argon2id-Testvektor aus RFC 9106 Abschnitt 5, Round-Trip, falscher Schlüssel schlägt fehl, ein geflipptes Bit in Ciphertext, IV, AAD oder Header schlägt fehl, IVs sind eindeutig, Padding-Buckets, Generator ohne Modulo-Bias (Statistiktest).
- **Pest:** Validierung (Bereiche, Größen, base64url, unbekannte Felder). Atomares Öffnen (zweiter Abruf bei `max_views=1` scheitert). Fehlversuche zählen und vernichten, **viele parallele falsche Proofs überschreiten `max_attempts` nicht** (Test der Reservierungslogik), ein richtiger Proof gibt den Versuch zurück. Einheitliche 404 (unbekannt, abgelaufen, vernichtet, verbraucht, identisch). `GET /s/{id}` ändert nichts. Ablauf an der Grenze (`Carbon::setTestNow`). Löschen mit richtigem und falschem Token. Header-Test. Throttle 429. Prune-Job. Schema-Test: keine Klartext- oder IP-Spalten.
- **Playwright (E2E):** Erstellen, in zweitem Browser-Kontext öffnen, Secret stimmt. Falsches Passwort dreimal, danach ist es vernichtet. **Klartext-Scan:** Nach dem Anlegen werden DB-Datei, Log-Dateien und Server-Access-Log nach Secret, Passwort **und** `K_link` durchsucht, es darf keinen Treffer geben.

## README (Pflichtteile)
1. **Idee** in 3 bis 4 Sätzen. 2. **Start:** `composer install`, `npm install`, `.env`, `php artisan migrate`, Scheduler, Tests. 3. **Eingesetzte KI-Werkzeuge** und Vorgehen (was der Agent gebaut hat, was der Maintainer geprüft und entschieden hat). 4. **Architekturentscheidungen** (Protokoll v1 mit je einem Satz Begründung und Quelle). 5. **Qualitätssicherung** (Tests, Testvektoren, Klartext-Scan, CI). 6. **Bekannte Grenzen** (Tabelle oben, unverändert ehrlich).

## Quellen (im README verlinken, Zahlen vor Einbau selbst prüfen)
- [MDN: URI fragment](https://developer.mozilla.org/docs/Web/URI/Fragment): "The fragment is not sent to the server when the URI is requested." Dazu RFC 3986 §3.5.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): Argon2id steht an erster Stelle, mindestens m=19 MiB, t=2, p=1. PBKDF2-HMAC-SHA256 mit 600.000 Iterationen nur, wenn FIPS gefordert ist.
- RFC 5869 (HKDF), RFC 9106 (Argon2), NIST SP 800-38D (GCM), W3C Web Cryptography API.
- Argon2id-Bibliothek (WASM): Auswahl mit Begründung ins README (Wartungsstand, Lizenz, Größe, Audit-Lage). Noch nicht geprüft. Fallback bei Problemen: PBKDF2-SHA-256 mit mindestens 600.000 Iterationen über Web Crypto, KDF-Name steht im Header.
- EFF-Wortliste: Lizenz vor Einbau prüfen und Namensnennung ins README.

## Bewusst nicht enthalten
Dateien und Anhänge, Accounts, E-Mail-Versand, Browser-Erweiterung oder CLI, Mehrsprachigkeit (UI nur Deutsch), Ersatz für einen Passwortmanager.

## Stretch (in dieser Reihenfolge streichen)
Status-Seite für den Ersteller ("ungeöffnet, geöffnet, vernichtet"), CLI-Client als Beweis, dass das Protokoll dokumentiert und portabel ist, Docker Compose, kosmetische Farbmarkierung.

## Arbeitsweise und Zeitplan
Reihenfolge: Krypto-Modul mit Tests zuerst, dann Laravel-API mit Tests, dann UI, dann Härtung und E2E, dann README. Kleine Commits, jede Agent-Änderung lesen, nichts committen, was nicht erklärt und belegt ist. Vor dem Veröffentlichen: frische Installation nach README, Tests grün, kein Secret im Repo.
Richtwert: Krypto-Modul 1,5 h · API 1,5 h · UI 2 h · Härtung und E2E 1 h · README 1 h, **gesamt ca. 7 h**.
