# Plan: Krypto-Modul (Protokoll v1, Browser)

Status: Approved
Approved-by: Rene Roscher, 2026-11-04
Date: 2026-11-04
Issue: none
Multi-tenant: no

## 1. Problem
- Problem: Ein Secret darf den Browser nur verschlüsselt verlassen. Der Server darf weder Klartext noch Passwort, Link-Key oder Schlüssel sehen. Ohne ein geprüftes, vom UI getrenntes Modul, das Protokoll v1 aus `docs/SPEC.md` exakt umsetzt, hängt jede Sicherheitsaussage der App an unbelegtem Code.
- Personas: Ersteller (gibt Passwort und Secret ein, erwartet einen Link); Empfänger (öffnet Link, gibt Passwort ein, erwartet das Secret oder eine klare Fehlermeldung); Maintainer (muss jede Krypto-Entscheidung mit Quelle nachvollziehen können und darf nichts Unerklärtes committen).
- Today: Kein Code. Menschen schicken Zugangsdaten im Chat oder per Mail (siehe `docs/product/brief.md`).
- Success moment: Ein Test erzeugt mit dem Modul ein Secret, die zwei Öffnen-Schritte liefern mit Link-Key und Passwort den Klartext, und jede Manipulation an Ciphertext, IV, Header oder Schlüssel schlägt fehl. Die RFC-Testvektoren (5869, 9106) und ein unabhängig erzeugter Protokoll-Testvektor laufen grün.
- Success metric: 100 % der in `docs/SPEC.md` (Abschnitt Tests, Vitest) genannten Fälle sind als Vitest-Tests vorhanden und grün; jeder Test wurde einmal rot gesehen (Mutation); Zeilenabdeckung von `resources/js/crypto/` mindestens 95 %, als Schwelle in `vitest.config.ts` und in `npm run check` erzwungen.
- Non-goals: Keine UI, keine Netzwerkaufrufe, keine API-Aufrufe, kein Server-Code. Kein Speichern von Schlüsseln. Keine eigenen Primitive. Keine Dateien. Keine Protokolländerung gegenüber `docs/SPEC.md`.
- Stress moment: Der Empfänger öffnet den Link unter Zeitdruck auf einem schwachen Mobilgerät mit falsch getipptem Passwort. Die Ableitung (Argon2id, 19 MiB) darf die Seite nicht einfrieren lassen, und jeder Fehlversuch zählt serverseitig. Ein falsches Passwort erkennt allein der Server am Proof, nicht das Modul. Das Modul trennt deshalb zwei Schritte und unterscheidet Fehlerarten (ungültiger Link, nicht unterstützte Version, Parameter außerhalb der Grenzen, kein sicherer Kontext, Entschlüsselung nach akzeptiertem Proof fehlgeschlagen) und darf dabei nichts über Schlüssel preisgeben.

## 2. Prior art
none found in `docs/plans/`, `docs/adr/` (ADR 0002 legt nur die Argon2id-Bibliothek fest, `@noble/hashes`), `docs/SPEC.md` (Protokoll v1) und im Code (`resources/js/crypto/` enthält nur `smoke.test.ts`). Es gibt keine abgebrochenen Vorgänger.

## 3. Market comparison (optional)
Nicht erhoben (inferred: vergleichbare Dienste existieren, nichts davon wird hier behauptet).

## 4. UX and states
Das Modul hat keine Oberfläche. Es liefert typisierte Ergebnisse und Fehler, die das spätere UI in `resources/js/lang/de.ts` übersetzt.

| State | What the user sees |
|---|---|
| Empty | N/A: das Modul rendert nichts, leere Eingaben liefert es als Fehler `EmptySecret` zurück |
| Loading | N/A: kein UI. Das Modul stellt `deriveKeys` als `Promise` bereit; das UI zeigt "Wird verschlüsselt" (Plan der UI-Funktion) |
| Error | typisierte Fehler: `InsecureContext`, `InvalidLink`, `InvalidPayload`, `UnsupportedVersion`, `KdfParamsOutOfBounds`, `KdfFailed`, `InvalidPassword` (zu kurz oder ungültig), `EmptySecret`, `SecretTooLarge`, `DecryptFailed` (nur nach akzeptiertem Proof). Die Texte folgen im UI-Plan |
| Partial data | Header oder Ciphertext abgeschnitten oder nicht base64url: `InvalidPayload`, kein Teilergebnis |
| No permission | N/A: es gibt keine Rechte, kein Login |
| Limit reached | Secret größer als 64 KiB minus 4 Byte: `SecretTooLarge` |

- Schnittstelle fürs Öffnen (zwei Schritte, weil dazwischen ein Server-Aufruf liegt): `prepareOpen(link, password, params) → { proof, finish }` leitet `K_auth` und `K_enc` ab und hält `K_enc` nur im Speicher der Schließung `finish`; `finish(openResponse) → Klartext` entschlüsselt erst nach akzeptiertem Proof. Ein falsches Passwort erkennt der Server am Proof. Dort zählt der Versuch (siehe `docs/SPEC.md`, Öffnen 5). Das Modul kann ein falsches Passwort nicht erkennen.
- Large case: Höchstgröße 65.532 Byte Klartext (Bucket 64 KiB minus 4 Byte Länge); Ciphertext höchstens 65.536 plus 16 Byte Tag.
- Mobile, keyboard and screen reader: N/A: kein UI. Die Laufzeit auf Mobilgeräten ist Teil der Messung in Schritt 12.
- Localisation: N/A: das Modul gibt Fehlercodes zurück, keine Texte (UI-Texte nur Deutsch, in `resources/js/lang/`).
- Destructive actions and their confirmation text: N/A: das Modul vernichtet nichts.
- Existing components reused: none (es gibt noch keine Komponenten).

## 5. Data model
| Change | Existing data shapes and the behaviour for each | Index and the query it serves | Evidence |
|---|---|---|---|
| Keine Datenbankänderung. Das Modul erzeugt den Request-Body für `POST /api/secrets` als reines Objekt | N/A: es gibt keine bestehenden Daten (Tabelle `secrets` existiert noch nicht) | N/A: keine Abfrage, keine Persistenz | verified: `database/migrations` enthält nur `cache` und `jobs` |

- Backfill and its rollback: N/A: keine Daten, keine Migration.

## 6. Reuse
- Existing mechanism extended: Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`) für HKDF, AES-GCM, SHA-256 und Zufall; `@noble/hashes/argon2.js` nur für Argon2id (ADR 0002). Test-Spur Vitest aus `vitest.config.ts`.
- Die `id` für die AAD kommt beim Öffnen aus der URL, nie aus der Antwort von `/params`, sonst könnte ein Server unbemerkt eine andere `id` unterschieben.
- Where the default lives: Argon2id-Parameter (m, t, p), Bucketgrößen, Schlüssellängen und `info`-Labels stehen an genau einer Stelle, `resources/js/crypto/constants.ts`. Header, Tests und späteres UI importieren sie von dort.

## 7. API and automation
- Endpoints: N/A: das Modul macht keine Netzwerkaufrufe. Es liefert den Body für `POST /api/secrets` (Felder laut `docs/SPEC.md`) und nimmt die Antwort von `POST /api/secrets/{id}/open` entgegen. Die Endpunkte plant ein eigener Plan.
- Error codes: Modul-Fehlercodes siehe Abschnitt 4. HTTP-Fehler sind nicht Teil dieses Plans.
- Pagination and filters: N/A: das Modul liefert keine Listen und fragt keine ab.
- IaC resource: N/A: es gibt keine Infrastrukturressource.
- Read-after-write: N/A: nichts wird gespeichert. Secrets sind per Design nicht lesbar ohne Link-Key und Passwort.
- Plan gating: N/A: es gibt keine Tarife.

## 8. Events, jobs and caching
- Events and realtime channels: N/A: das Modul sendet und empfängt keine Events.
- Jobs and queues: N/A: läuft synchron im Browser.
- Cache keys and invalidation: N/A: das Modul cacht nichts. Schlüssel liegen nur in lokalen Variablen und werden nicht in `localStorage`, `sessionStorage`, Cookies oder die URL geschrieben.

## 9. Permissions, limits and audit
- Permissions: N/A: es gibt keine Rechte und keine Accounts.
- Limits: Passwort mindestens 10 Unicode-Codepoints nach NFKC, ohne einzelne Surrogate (Entscheidung 7); Secret höchstens 65.532 Byte; KDF-Name nur `argon2id`; KDF-Parameter innerhalb der Grenzen aus Entscheidung 3; `id` 16, `salt` 16, `iv` 12 Byte, Ciphertext höchstens Bucket plus 16 Byte; unbekannte oder doppelte Header-Felder werden abgelehnt.
- Audit entries: N/A: das Modul loggt nichts. Es ruft kein `console.*` auf, ein Test prüft das (Spion auf `console`).

## 10. Tenant isolation
| Surface | How tenant A is kept out of tenant B's data |
|---|---|
| Alle | N/A: Single-Tenant-App ohne Mandanten und Accounts (siehe `docs/plans/2026-11-04-inception.md`) |

## 11. Data protection
- New personal-data category: no
- New processor or sub-processor: no
- New retention period: no
- Third-country transfer: no
- Special-category data: no
- Handed to: N/A: das Modul speichert und überträgt nichts; die Datenschutzlage steht in `docs/specs/privacy.md`.

## 12. Dependencies
| Dependency | What the plan relies on | Evidence |
|---|---|---|
| `@noble/hashes` 2.4.0, Import `@noble/hashes/argon2.js` | Argon2id; stimmt mit dem RFC-9106-§5.3-Vektor überein; rund 100 ms für m=19456, t=2, p=1 in Chromium; 5,5 kB gzip; Argon2-Teil nicht auditiert | verified: ADR 0002 und Messung vom 2026-11-04 (noch nicht im Repo installiert, Einbau in Schritt 5) |
| Web Crypto API (`SubtleCrypto`: HKDF, AES-GCM, SHA-256; `getRandomValues`) | nur in sicheren Kontexten verfügbar (HTTPS oder localhost) | verified: MDN `SubtleCrypto` trägt den Header `SecureContext_header` (gelesen 2026-11-04) |
| Node 24.11.1 `globalThis.crypto.subtle` in Vitest | Tests laufen ohne Browser gegen dieselbe Web-Crypto-Schnittstelle | verified: `resources/js/crypto/smoke.test.ts` läuft grün |
| EFF Large Wordlist (7.776 Wörter) | 5 Wörter ≈ 64,6 Bit (5 × log2 7776); Lizenz nennt "CC BY" | reported: Hinweis auf der EFF-Seite gelesen, genaue Lizenzversion und Namensnennung noch nicht geprüft (Schritt 11, Entscheidung 6) |
| RFC 5869 Anhang A (HKDF-SHA-256, Testfälle 1 bis 3) | Referenzwerte für `hkdf.test.ts` | reported: aus dem RFC-Text zu lesen in Schritt 4, nicht aus dem Gedächtnis |
| RFC 9106 §5.3 (Argon2id-Vektor) | Tag `0d640df5…e659` mit Secret und Associated Data | verified: aus `rfc9106.txt` gelesen und mit `@noble/hashes` reproduziert (2026-11-04) |

## 13. Performance budget
- Volume: eine Ableitung pro Erstellen und eine pro Öffnen und Fehlversuch (höchstens 10 Fehlversuche je Secret laut `docs/SPEC.md`).
- Queries per request and p95 target: N/A: keine Datenbankabfragen. Ziel Argon2id: höchstens 500 ms auf einem Desktop; gemessen: rund 95 bis 111 ms (Chromium 156, Desktop). Mobilgerät: nicht gemessen, offen in Schritt 12.
- Analytical or search scan scope: N/A: das Modul durchsucht keine Daten.
- Queue load: N/A: das Modul nutzt keine Warteschlange und erzeugt keine Jobs.
- Payload sizes: Argon2id belegt 19 MiB Speicher; Ciphertext höchstens 65.552 Byte (64 KiB plus 16 Byte Tag); Request-Body höchstens etwa 90 KB nach base64url (inferred: 65.552 × 4/3 plus Felder).

## 14. Failure modes
| Failure | Impact | Detection | Reaction |
|---|---|---|---|
| Web Crypto fehlt (Seite über HTTP, nicht localhost) | Verschlüsseln und Öffnen unmöglich | `globalThis.crypto?.subtle` ist `undefined` | Fehler `InsecureContext` vor jeder Eingabe, kein Fallback auf eigene Krypto |
| Falsches Passwort | Server lehnt den Proof ab, Versuch ist verbraucht | Antwort des Servers, nicht des Moduls | Sache des UI- und API-Plans; das Modul meldet nichts |
| Entschlüsselung scheitert nach akzeptiertem Proof (manipulierter Ciphertext, IV, Header oder AAD, oder Header-Serialisierung weicht ab) | Das Secret kann schon verbraucht sein, beim letzten Abruf ist der Ciphertext gelöscht, kein erneuter Versuch | GCM-Tag-Prüfung wirft | einheitlicher Fehler `DecryptFailed` ohne Unterscheidung nach Ursache. Vorbeugung: beim Erstellen prüft das Modul die AAD aus einem Header in der Form, wie der Server ihn später liefert (Selbstprüfung) |
| Server liefert KDF-Name oder -Parameter außerhalb der Erlaubnisliste (Downgrade oder absichtlich riesig), falsche Feldlängen oder unbekannte Felder | Schwacher Schutz, Speicherabsturz oder mehrdeutiger Header | Prüfung vor der Ableitung | `KdfParamsOutOfBounds`, `UnsupportedVersion` oder `InvalidPayload`, es wird nicht abgeleitet |
| Argon2id kann 19 MiB nicht allozieren (wenig Speicher) | Ableitung bricht ab | Ausnahme beim Allozieren | Fehler `KdfFailed`, Hinweis im UI-Plan, kein Absenken der Parameter |
| Fragment fehlt oder ist kein gültiges base64url (32 Byte) | Link unbrauchbar | strikte Dekodierung | `InvalidLink` ("Link unvollständig" im UI) |
| IV-Wiederverwendung unter demselben Schlüssel | bei GCM fatal (NIST SP 800-38D verlangt Eindeutigkeit des IV je Schlüssel) | Test, dass zwei `createSecret`-Aufrufe mit gleichem Passwort und Secret verschiedene `salt`, `K_enc` und IV liefern | Pro Secret entsteht ein neuer Schlüssel (frischer `K_link` und `salt`) und der IV wird nur einmal pro Schlüssel benutzt (inferred aus Protokoll v1, per Test belegt). Der Test "1.000 IVs verschieden" allein genügt nicht |
| Secret größer als Bucket | Padding unmöglich | Längenprüfung vor Verschlüsselung | `SecretTooLarge` |

- Irreversible: Das Format aus Protokoll v1 (Header, AAD, Schlüsselableitung) ist ab dem ersten gespeicherten Secret fest. Eine Änderung macht bestehende Links unlesbar. Das Feld `v` im Header erlaubt eine spätere Version v2 neben v1.
- Costs money or reaches people if it fires wrongly: nichts. Es gibt keine bezahlten Dienste und keine Nachrichten. Ein Fehler im Krypto-Modul könnte aber Vertraulichkeit verletzen, deshalb die Test- und Reviewpflicht.

## 15. Test plan
- Unit and feature tests (Vitest, ohne Netzwerk), jeder Test wird einmal rot gesehen (Mutation, im Commit-Text vermerkt):
  - HKDF-SHA-256 gegen die drei Vektoren aus RFC 5869 Anhang A (Schlüsselableitung mit Web Crypto). Dazu feste Prüfung der Strings `fmf/v1/enc` und `fmf/v1/auth` gegen `docs/SPEC.md`.
  - Argon2id gegen den Vektor aus RFC 9106 §5.3 (die Bibliothek direkt, m=32, t=3, p=4, mit Secret und AD) und **zusätzlich** gegen einen Vektor für die Produktionsparameter (m=19456, t=2, p=1, 32 Byte, NFKC und UTF-8), der offline mit einer zweiten Implementierung erzeugt und mit Herkunft eingecheckt wird. Nur so wird der Wrapper selbst gegen etwas Unabhängiges geprüft.
  - **Protokoll-Testvektor:** feste Eingaben (Link-Key, Salt, IV, Passwort, Klartext) ergeben feste Ausgaben (Header-Bytes, `K_enc`, `K_auth`, `verifier`, `iv`, `ciphertext`). Erzeugt von einem Skript, das das Modul nicht benutzt (Node `crypto`, Argon2id aus einer zweiten Bibliothek), vor dem Code (Schritt 0). Round-Trip-Tests allein reichen nicht, weil sie auch bei einem in sich stimmigen Fehler grün bleiben (etwa vertauschte Reihenfolge `pwKey‖K_link` oder vertauschte `info`-Labels).
  - Round-Trip über `prepareOpen` und `finish`, auch bei Umlauten, Emoji und NFKC-Varianten desselben Passworts.
  - Falscher Link-Key oder falsches Passwort: `finish` scheitert mit `DecryptFailed`, wenn man den Proof-Schritt überspringt. Das Modul gibt vorher keinen Klartext frei.
  - AAD-Test **auf AEAD-Ebene** mit den richtigen Schlüsseln und nur verändertem AAD: je ein Test für `v`, `id`, KDF-Name, m, t, p und `salt` (jeder muss mit `DecryptFailed` scheitern und nicht mit einem Grenzfehler). Dazu Bit-Flips in Ciphertext und IV. Test auf den genauen Fehlercode, damit er nicht aus dem falschen Grund grün wird.
  - Frische Schlüssel: zwei `createSecret`-Aufrufe mit gleichen Eingaben liefern verschiedene `salt`, `K_link`, `K_enc` und IV. Zusätzlich 1.000 IVs und 1.000 `K_link` paarweise verschieden.
  - Selbstprüfung beim Erstellen: Die AAD, neu aus dem Header in der Form der `/params`-Antwort gebaut, ist byte-gleich zur AAD beim Verschlüsseln. Die `id` stammt aus der URL, ein untergeschobenes `id` in `/params` lässt `finish` scheitern.
  - Schritt 5 des Protokolls: `verifier` ist SHA-256 über die **Bytes** von `K_auth` (nicht über die base64url-Zeichenkette), `manage_hash` ist SHA-256 über die Bytes von `manage_token`, der Body enthält nur `manage_hash` und nie das `manage_token`.
  - Passwortregeln: zehn Codepoints nach NFKC; `\uFDFA` (ein Zeichen, 18 Codepoints nach NFKC, in Node 24.11.1 gemessen) zählt nach der Normalisierung; einzelne Surrogate werden abgelehnt (`TextEncoder` ersetzt sie sonst still durch U+FFFD, gemessen); Emoji zählt als ein Codepoint.
  - Header-Prüfung beim Öffnen: nur `argon2id`, `v` muss 1 sein, Feldlängen, unbekannte und doppelte Felder, Parametergrenzen.
  - Padding: Buckets 1, 4, 16 und 64 KiB an den Grenzen (Länge plus 4 Byte), Klartext ab Bucketgröße minus 3 Byte springt in den nächsten Bucket, über 64 KiB minus 4 Byte scheitert; nichtnull Füllbytes und falsches Längenpräfix werden abgelehnt.
  - Strikte base64url-Dekodierung: abgelehnt werden Padding, Standard-Alphabet, Leerraum, falsche Länge, **von null verschiedene Restbits** im letzten Zeichen (43 Zeichen für 32 Byte lassen 2 Bit übrig, sonst führen mehrere Links zum selben Schlüssel), leeres Fragment und angehängte Satzzeichen wie `.` und `)`.
  - Schlüssel verlassen das Modul nicht: **statische Prüfung** der Importe und Bezeichner in `resources/js/crypto/` auf `localStorage`, `sessionStorage`, `document.cookie`, `fetch`, `XMLHttpRequest`, `console`, `location`, `history` und `Math.random`. Spione genügen nicht, weil in der Node-Umgebung von Vitest `localStorage` nicht existiert (gemessen) und Spione nur ausgeführte Pfade sehen. Dazu: Fehlermeldungen enthalten kein Schlüsselmaterial, und der Request-Body wird auf Klartext, Passwort, `K_link`, `K_enc`, `K_auth` und `manage_token` in Hex, Base64 und base64url durchsucht.
  - Generator ohne Modulo-Bias: **deterministische** Prüfung mit einer eingespeisten Bytequelle (Grenzwert 255 bei 62 Zeichen muss verworfen werden, Verteilung exakt über den vollen Byte-Bereich gezählt) statt Chi-Quadrat über echten Zufall, der flackern würde. Die Bytequelle ist eine Naht in der Schnittstelle. Wortgenerator zieht aus 7.776 Wörtern, Entropie in Bit exakt für generierte Passwörter.
- Abdeckung: `vitest.config.ts` erhält Schwellen (Zeilen 95 %) für `resources/js/crypto/`, und `npm run check` ruft die Abdeckung auf.
- Cross-tenant test per new resource: N/A: Single-Tenant, keine neue serverseitige Ressource.
- Failure-mode tests: je Zeile aus Abschnitt 14 ein Test, soweit simulierbar (`InsecureContext` mit entferntem `crypto.subtle`; `KdfFailed` über eine eingespeiste Ableitungsfunktion, die wirft, weil sich ein Speichermangel in Node nicht sauber nachstellen lässt).
- Browser check: Playwright misst Argon2id (m=19456, t=2, p=1) im echten Chromium und prüft, dass das Modul unter der strikten CSP läuft. Mobilgerät: manuelle Messung, Ergebnis kommt in `docs/CRYPTO-NOTES.md`.

## 16. Rollout and rollback
- Rollout: reine Bibliothek ohne Verbraucher. Sie wird erst vom UI-Plan benutzt. Kein Flag nötig, weil nichts ausgeliefert wird, was sie aufruft. Schema und Server sind nicht beteiligt.
- Rollback: `git revert` der Modul-Commits. Zwei Stunden nach Release sind keine Daten geschrieben, weil das Modul nichts speichert und noch keine Funktion es aufruft.
- Irreversible steps: keine im Rollout. Irreversibel wird das Format erst, wenn die erste produktive Instanz Secrets speichert (siehe Abschnitt 14).

## 17. Implementation steps
Reihenfolge: Spezifikation und Vektoren, dann je Schritt Test vor Code, ein Commit pro Schritt. Jede Krypto-Funktion trägt einen Warum-Block mit Quelle (RFC, Spezifikation, OWASP).

| Step | Location | Done criterion | Depends on |
|---|---|---|---|
| 0. Byte-Spezifikation und Protokoll-Testvektor | `docs/CRYPTO-NOTES.md` (Byte-Teil), `resources/js/crypto/vectors/protocol-v1.json`, Erzeuger-Skript unter `scripts/` | Bytefolge von Header, AAD, Padding und Schlüsselableitung ist beschrieben; der Vektor stammt aus einem Skript ohne Modulcode und trägt Herkunft; vom Maintainer gelesen | Freigabe, Entscheidungen 1 bis 4 und 7 |
| 1. Konstanten, Fehlertypen und Abdeckungsschwelle | `resources/js/crypto/constants.ts`, `errors.ts`, `vitest.config.ts`, `package.json` | Parameter, Labels, Bucketgrößen an einer Stelle; Schwelle 95 % aktiv und in `npm run check`; Test auf feste Werte | 0 |
| 2. Strikte base64url-Kodierung | `resources/js/crypto/base64url.ts` + Test | Round-Trip und alle Ablehnungen aus Abschnitt 15 getestet, Mutation rot gesehen | 1 |
| 3. Zufall, Rejection Sampling, Bytequelle als Naht | `resources/js/crypto/random.ts` + Test | deterministischer Bias-Test und Eindeutigkeit grün; keine `Math.random`-Verwendung (statische Prüfung) | 1 |
| 4. HKDF | `resources/js/crypto/hkdf.ts` + Test | RFC-5869-Vektoren 1 bis 3 grün; `info`-Strings gegen `docs/SPEC.md` fest geprüft; `K_enc` entsteht als nicht exportierbarer AES-GCM-Schlüssel | 1 |
| 5. Argon2id-Wrapper | `resources/js/crypto/kdf.ts` + Test, `@noble/hashes` exakt gepinnt | RFC-9106-Vektor und Produktionsvektor grün; Parametergrenzen und Passwortregeln getestet | 1, ADR 0002, Entscheidungen 3 und 7 |
| 6. Header, AAD und Header-Prüfung | `resources/js/crypto/header.ts` + Test | Kodierung byte-gleich zum Vektor aus Schritt 0; Erlaubnisliste, Feldlängen, unbekannte und doppelte Felder geprüft | 0, 1 |
| 7. Padding | `resources/js/crypto/padding.ts` + Test | Bucketgrenzen, Füllbytes und Längenpräfix geprüft | 0, 1 |
| 8. AES-256-GCM | `resources/js/crypto/aead.ts` + Test | AAD-Test je Feld auf AEAD-Ebene mit Fehlercode-Prüfung; Bit-Flips in Ciphertext und IV | 4, 6 |
| 9. Protokoll: erstellen, `prepareOpen`, `finish` | `resources/js/crypto/protocol.ts` + Test | Ausgabe entspricht dem Vektor aus Schritt 0; Selbstprüfung beim Erstellen; `verifier`, `manage_hash` korrekt; Body enthält keine geheimen Werte in Hex, Base64 und base64url | 2 bis 8 |
| 10. Öffentliche Schnittstelle | `resources/js/crypto/index.ts` | nur `createSecret`, `prepareOpen`, Generatoren und Fehlertypen exportiert; Test auf die Exportliste | 9 |
| 11. Passwort-Generator mit EFF-Wortliste | `resources/js/crypto/generator.ts`, `resources/js/crypto/eff-large-wordlist.ts` | 7.776 Wörter, Lizenz geprüft und im README genannt; Entropie in Bit stimmt; Alphabet der Zeichenvariante laut Entscheidung 8 | 3, Entscheidungen 6 und 8 |
| 12. Ableitung im Web Worker, Messung und CSP | `resources/js/crypto/kdf.worker.ts`, `e2e/crypto.spec.ts` | Worker ist eine eigene Datei vom eigenen Ursprung (kein `blob:`, kein Inline), läuft unter der unveränderten CSP; Argon2id-Zeit im Chromium gemessen und in `docs/CRYPTO-NOTES.md` festgehalten | 10, Entscheidung 5 |
| 13. Doku | `docs/CRYPTO-NOTES.md` (laienverständlicher Teil), `docs/specs/crypto.md` | Erklärung pro Baustein mit Quelle; Spec-Header mit `Code:` und Prüfdatum; `check_docs.py --strict` grün | 12 |

## 18. Self-review
1. Datenmodell bei Spitzenlast: keine Persistenz in diesem Plan; Zahlen: höchstens 65.552 Byte Ciphertext, 19 MiB Speicher je Ableitung, null Indizes.
2. Fehler sichtbar: siehe die sieben Zeilen in Abschnitt 14, jede mit eigenem Test in Abschnitt 15.
3. Mandantentrennung: N/A, Single-Tenant (Abschnitt 10). Geprüfte Flächen: alle Abschnitte, keine Mandanten im Code.
4. Kosten einer Operation: 0 Datenbankabfragen, 1 Argon2id-Lauf (rund 100 ms Desktop), 2 HKDF-Aufrufe, 1 AES-GCM-Aufruf, 0 Nachrichten.
5. Rückbau: `git revert`; keine geschriebenen Daten.
6. Kundenwissen: Der Nutzer muss lernen, dass der Link und das Passwort getrennt zu senden sind. Das gehört in den UI-Plan und ins README. In diesem Plan: `docs/CRYPTO-NOTES.md` erklärt das Protokoll laienverständlich (Schritt 13).
7. Lebenszyklus: erstellen und öffnen sind enthalten; "bearbeiten" gibt es nicht; vernichten liegt beim Server. Wiederholung erzeugt neue Zufallswerte und damit ein neues Secret, keine Duplikate unter gleicher `id` (die `id` ist 128 Bit Zufall).
8. Nicht verifizierte Fakten: (a) EFF-Lizenzversion (reported), (b) RFC-5869-Vektoren (werden gelesen in Schritt 4), (c) Laufzeit auf Mobilgeräten (nicht gemessen). Keine Entscheidung hängt allein daran; Entscheidung 6 hängt an (a).
9. Zweiter Mechanismus: nein. Es wird Web Crypto benutzt, wo es Primitive gibt; nur Argon2id kommt aus der Bibliothek (ADR 0002).
10. Vergleich mit anderen Produkten: kein Vergleich im Plan, kein Ergebnis zu prüfen.

Offene Lücken im Protokoll: `docs/SPEC.md` legt die Bytekodierung von Header und AAD, Länge und Byte-Reihenfolge des Längenpräfixes, die Grenzen für KDF-Parameter beim Öffnen und die Länge von `pwKey` nicht fest. Das sind Entscheidungen 1 bis 4. Sie berühren das Protokoll und gehören dem Maintainer.

Adversarial review (einmal, ein Prüfer, sah nur Plan, Spec, ADR und Repo): 12 Befunde, jeder von mir geprüft.
- Angenommen und eingearbeitet: (1) Öffnen ist über eine Server-Anfrage geteilt und ein falsches Passwort erkennt nur der Server, also `prepareOpen` und `finish`, `DecryptFailed` statt `WrongPasswordOrTampered`, Selbstprüfung beim Erstellen, `id` aus der URL. (2) Kein Protokoll-Testvektor, nur Round-Trips: jetzt Schritt 0 mit unabhängig erzeugtem Vektor vor dem Code. (3) Bit-Flip-Tests auf `salt` und KDF-Parameter hätten auch ohne AAD bestanden: jetzt AAD-Tests auf AEAD-Ebene mit Fehlercode; IV-Eindeutigkeit allein beweist nichts, jetzt Test auf frische Schlüssel. (4) RFC-9106-Vektor läuft nicht durch den Wrapper (andere Parameter): jetzt zusätzlich ein Vektor für die Produktionsparameter aus einer zweiten Implementierung. (5) `verifier`, `manage_token` und `manage_hash` fehlten: Tests ergänzt. (6) Passwortregeln: `U+FDFA` wird nach NFKC zu 18 Zeichen und einzelne Surrogate werden still zu U+FFFD (beides in Node gemessen), also Entscheidung 7. Die Abhängigkeit von der Unicode-Version der Laufzeit ist real (Node 24.11.1 meldet Unicode 16.0), konkrete Abweichungen habe ich nicht geprüft und halte sie als bekannte Grenze fest. (7) Header-Prüfung unvollständig: Erlaubnisliste, Feldlängen, unbekannte Felder; Entscheidung 3 senkt p auf 1. (9) Spione sind in Node leer (`localStorage` ist dort `undefined`, gemessen): statische Prüfung statt Spionen. (10) Chi-Quadrat über echten Zufall flackert: deterministische Bytequelle. (11) Nichtkanonische base64url-Zeichen: Rest-Bits werden geprüft. (12) Abdeckungsschwelle wird jetzt erzwungen, Byte-Spezifikation kommt vor dem Code (Schritt 0), Fehlernamen vereinheitlicht.
- Korrigiert gegenüber meiner ersten Fassung: (8) `worker-src` fällt laut MDN auf `child-src`, dann `script-src`, dann `default-src` zurück (gelesen 2026-11-04). Ein Worker aus einer Datei vom eigenen Ursprung braucht also keine CSP-Änderung. Meine Annahme, er brauche `worker-src 'self'`, war falsch; Entscheidung 5 ist neu gefasst. Dass Vite den Worker als eigene Datei und nicht als `blob:` ausgibt, ist inferred und wird in Schritt 12 per Test belegt.
- Nicht übernommen: nichts.

## 19. Open decisions
1. Wie lang ist `pwKey` (Ausgabe von Argon2id)?
   - Options: A, 32 Byte; B, 64 Byte.
   - Trade-offs: gleiche Kosten (Argon2 rechnet unabhängig von der Ausgabelänge denselben Speicher), A passt zur 256-Bit-Schlüsselbreite des Protokolls, B bringt keinen Sicherheitsgewinn, weil HKDF danach 32 Byte liefert. Nachträglich nicht änderbar ohne neue Protokollversion.
   - Recommendation: A, 32 Byte, weil `K_enc` und `K_auth` je 256 Bit haben und `docs/SPEC.md` keine größere Breite verlangt.
   - Answer: A (32 Byte), vom Maintainer am 2026-11-04.
2. Wie wird der Header für die AAD kanonisch kodiert (`v`, `id`, KDF-Name und -Parameter, `salt`)?
   - Options: A, UTF-8-JSON mit festgelegter Schlüsselreihenfolge ohne Leerraum, Zahlen als Ganzzahlen, Bytes als base64url; B, feste Binärstruktur (Version, Längenpräfixe, Felder in fester Reihenfolge).
   - Trade-offs: A ist lesbar und im späteren CLI-Client einfach nachzubauen, hat aber Fallen bei Zahlen und Escapes; B ist eindeutig und kompakt, aber schwerer zu lesen und zu debuggen. Beides ist nach dem ersten Secret nicht mehr änderbar.
   - Recommendation: B, weil eine Binärstruktur keine Mehrdeutigkeit bei der Kanonisierung zulässt und zu Protokoll v1 mit Längenpräfixen passt. Die genaue Byte-Spezifikation wird als Teil von `docs/CRYPTO-NOTES.md` und per Testvektor festgehalten, bevor Code entsteht.
   - Answer: B (feste Binärstruktur), vom Maintainer am 2026-11-04.
3. Welche KDF-Parameter akzeptiert der Browser beim Öffnen (Schutz vor Downgrade und vor Absturz durch riesige Werte)?
   - Options: A, genau die Parameter der Spec, also m=19456 KiB, t=2, p=1, alles andere wird abgelehnt; B, Untergrenzen aus der Spec und Obergrenzen m ≤ 65.536 KiB, t ≤ 6 und p = 1 fest.
   - Trade-offs: A ist starr, ändert sich erst mit einer neuen Protokollversion; B erlaubt spätere Erhöhung der Kosten ohne Versionswechsel, öffnet aber ein größeres Angriffsfenster für Rechenlast im Browser des Empfängers. p fest auf 1, weil `@noble/hashes` reines JS ist und mehrere Lanes vermutlich nacheinander rechnet, also die Zeit vervielfacht (unverified, wird in Schritt 5 gemessen).
   - Recommendation: B, weil `docs/SPEC.md` "mindestens" verlangt und die Parameter im Header stehen; die Obergrenzen verhindern Speicherabstürze und Zeitbomben.
   - Answer: B (Untergrenze aus der Spec, m ≤ 65.536 KiB, t ≤ 6, p = 1), vom Maintainer am 2026-11-04.
4. Wie ist die Auffüllung (Padding) genau kodiert?
   - Options: A, 4-Byte-Länge big-endian, danach Klartext, danach Nullbytes bis zur Bucketgröße; B, wie A, aber die Füllbytes sind zufällig.
   - Trade-offs: Die Füllbytes liegen im AEAD, beide Varianten sind vertraulich. A ist deterministisch und einfach zu testen; B hat keinen Vorteil bei Vertraulichkeit, kostet aber Zufall. Nachträglich nicht änderbar.
   - Recommendation: A, weil das Padding nur die Länge verbirgt und Nullbytes beim Entpacken eindeutig prüfbar sind (alle Füllbytes müssen 0 sein).
   - Answer: A (Länge big-endian, Nullbytes), vom Maintainer am 2026-11-04.
5. Wird Argon2id im Hauptthread oder in einem Web Worker ausgeführt?
   - Options: A, im Hauptthread; B, in einem Web Worker aus einer eigenen Datei vom eigenen Ursprung.
   - Trade-offs: A blockiert die Seite rund 100 ms auf dem Desktop und vermutlich länger auf Mobilgeräten (nicht gemessen); B hält die Oberfläche flüssig und braucht **keine** CSP-Änderung (`worker-src` fällt auf `script-src 'self'` zurück, MDN, verified), kostet aber eine Worker-Datei und Nachrichtenkanal. Ein von Vite eingebetteter `blob:`-Worker würde die CSP verletzen; das wird in Schritt 12 getestet (inferred, dass Vite eine eigene Datei ausgibt).
   - Recommendation: B, weil die Hauptlast (19 MiB) die Oberfläche beim Empfänger unter Zeitdruck sonst einfriert und die CSP unverändert bleibt.
   - Answer: B (Web Worker aus eigener Datei), vom Maintainer am 2026-11-04.
6. Wird die EFF Large Wordlist als Quelle der Passphrasen-Wörter aufgenommen?
   - Options: A, ja, nach Prüfung der Lizenz (CC BY, Namensnennung im README); B, nein, nur der Zeichen-Generator mit 16 Zufallszeichen.
   - Trade-offs: A liefert merkbare Passphrasen (rund 64,6 Bit) laut Spec; die Datei ist rund 7.776 Zeilen groß und braucht Attribution; B ist kleiner, aber schwerer zu tippen.
   - Recommendation: A, weil `docs/SPEC.md` den Wortgenerator als Standard nennt. Die Lizenz wird vor dem Einbau an der Quelle gelesen; findet sich kein klarer Lizenztext, stoppe ich und frage.
   - Answer: A (EFF-Liste, Lizenz vorher prüfen), vom Maintainer am 2026-11-04.
7. Welche Passwortregeln gelten vor der Ableitung?
   - Options: A, mindestens 10 Unicode-Codepoints **nach** NFKC, einzelne Surrogate werden abgelehnt (`InvalidPassword`); B, mindestens 10 Codepoints **vor** und nach NFKC, sonst wie A.
   - Trade-offs: A ist einfach, lässt aber Zeichen wie `U+FDFA` zu, die nach NFKC viele Zeichen ergeben und damit ein kurzes Passwort stärker aussehen lassen als es ist; B schließt das aus, kostet aber eine zweite Prüfung. Beide verhindern, dass verschiedene Passwörter durch U+FFFD auf denselben Schlüssel fallen. Eine zusätzliche Grenze: `String.prototype.normalize` hängt von der Unicode-Version der Laufzeit ab (gemessen: Node 24.11.1 hat 16.0); Browser mit anderer Version könnten bei seltenen Zeichen einen anderen Schlüssel ableiten (inferred, nicht gemessen).
   - Recommendation: B, weil die Stärke eines Passworts nicht von der Normalisierung vorgetäuscht werden soll. Die Versionsabhängigkeit kommt als bekannte Grenze ins README.
   - Answer: B (10 Codepoints vor und nach NFKC, einzelne Surrogate abgelehnt), vom Maintainer am 2026-11-04.
8. Welche Zeichen nutzt der Passwort-Generator in der Zeichenvariante (16 Zeichen)?
   - Options: A, a bis z, A bis Z, 0 bis 9 (62 Zeichen, 16 × log2 62 ≈ 95,3 Bit); B, zusätzlich Satzzeichen (94 druckbare ASCII-Zeichen, 16 × log2 94 ≈ 104,9 Bit).
   - Trade-offs: A lässt sich überall tippen und kopieren und passt in jedes Passwortfeld; B bringt etwa 9,6 Bit mehr, aber manche Zielsysteme lehnen Sonderzeichen ab. Beide sind weit über der Wortvariante (rund 64,6 Bit).
   - Recommendation: A, weil Zugangsdaten oft in Systeme eingetippt werden, die Sonderzeichen nicht mögen.
   - Answer: A (62 alphanumerische Zeichen), vom Maintainer am 2026-11-04.
