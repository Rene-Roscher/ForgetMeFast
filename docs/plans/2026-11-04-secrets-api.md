# Plan: Secrets-API und Aufräumjob

Status: Approved
Approved-by: Rene Roscher, 2026-11-04 (pauschal: "mache jetzt einfach alles autonom fertig")
Date: 2026-11-04
Issue: none
Multi-tenant: no

## 1. Problem
- Problem: Der Server muss verschlüsselte Secrets speichern, genau nach den Regeln des Erstellers ausliefern und danach vernichten, ohne je Klartext, Passwort oder Schlüssel zu kennen. Zähler dürfen auch bei vielen parallelen Anfragen nicht überschritten werden.
- Personas: Ersteller (legt an, vernichtet vorzeitig); Empfänger (liest einmal); Angreifer mit Link (rät Passwörter); neugieriger Betreiber (liest die Datenbank).
- Today: Es gibt nur das Krypto-Modul im Browser und keine Serverseite.
- Success moment: Anlegen, Parameter holen, Öffnen und Vernichten funktionieren; 50 parallele falsche Proofs überschreiten `max_attempts` nicht; unbekannt, abgelaufen, vernichtet und verbraucht liefern dieselbe Antwort.
- Success metric: Alle API-Fälle aus `docs/SPEC.md` (Abschnitt Tests, Pest) sind als Pest-Tests grün, jeder einmal rot gesehen; `composer check` grün.
- Non-goals: UI, Krypto, Konten, Statusseite für den Ersteller (Stretch), Mail.
- Stress moment: Ein Angreifer schickt Dutzende parallele Öffnen-Anfragen mit geratenen Proofs. Der Server muss die Versuche atomar reservieren, bevor er vergleicht.

## 2. Prior art
none found in `docs/plans/`, `docs/adr/` und im Code (`app/Actions/` ist leer). Grundlage ist `docs/SPEC.md` (API, Datenmodell, Server-Härtung) und ADR 0003.

## 3. Market comparison (optional)
Nicht erhoben.

## 4. UX and states
Kein UI in diesem Plan. API-Antworten: 201 angelegt; 200 Parameter oder Secret; 403 falscher Proof mit Restversuchen; 404 nicht verfügbar (einheitlich); 422 ungültige Eingabe; 429 gedrosselt.

| State | What the user sees |
|---|---|
| Empty | N/A: es gibt keine Listen |
| Loading | N/A: kein UI in diesem Plan |
| Error | 404 `{"message":"unavailable"}`, 422 mit Feldfehlern, 429 von Laravel, 403 `{"message":"invalid","attempts_left":n}` |
| Partial data | Unvollständige oder falsch kodierte Felder: 422, nichts wird gespeichert |
| No permission | Falscher `X-Manage-Token`: dieselbe 404 wie bei unbekannt |
| Limit reached | Fehlversuche aufgebraucht oder Abrufe verbraucht: 404, das Secret ist vernichtet |

- Large case: höchstens 65.552 Byte Chiffretext je Secret; kein Limit der Anzahl Secrets im MVP außer 20 Erstellungen je Stunde und IP-Hash.
- Mobile, keyboard and screen reader: N/A: keine Oberfläche.
- Localisation: N/A: Antworten tragen Codes, keine übersetzten Texte.
- Destructive actions and their confirmation text: Vernichten per `DELETE` ist endgültig; die Bestätigung gehört in den UI-Plan.
- Existing components reused: none.

## 5. Data model
| Change | Existing data shapes and the behaviour for each | Index and the query it serves | Evidence |
|---|---|---|---|
| Neue Tabelle `secrets` mit `id`, `v`, `kdf_name`, `kdf_m`, `kdf_t`, `kdf_p`, `salt`, `iv`, `ciphertext` (nullable), `verifier`, `manage_hash`, `max_views`, `views_used`, `max_attempts`, `failed_attempts`, `expires_at`, `destroyed_at`, `destroyed_reason`, `created_at` | N/A: Tabelle ist neu, es gibt keine bestehenden Daten | Primärschlüssel `id` für alle Abfragen; Index auf `expires_at` und auf `destroyed_at` für den Aufräumjob | verified: `database/migrations` enthält keine solche Tabelle; Spalten laut `docs/SPEC.md` (Datenmodell) |

- Backfill and its rollback: N/A: neue Tabelle, Rückbau per `migrate:rollback`.

## 6. Reuse
- Existing mechanism extended: benannte Limiter aus `App\Http\Throttling\RateLimits`, `SecurityHeaders`, Pest-Architekturtests, Scheduler aus `composer dev`.
- Where the default lives: Grenzen und Erlaubnislisten (Ablaufzeiten, KDF-Grenzen, 1 bis 10) in `config/secrets.php`, die Spiegel im Browser stehen in `resources/js/crypto/constants.ts` (Test vergleicht beide).

## 7. API and automation
- Endpoints: `POST /api/secrets` (Body wie `CreateBody` des Krypto-Moduls), `GET /api/secrets/{id}/params`, `POST /api/secrets/{id}/open` mit `{"proof": "<base64url 32 Byte>"}`, `DELETE /api/secrets/{id}` mit Header `X-Manage-Token`.
- Error codes: 404 einheitlich `{"message":"unavailable"}` für unbekannt, abgelaufen, vernichtet, verbraucht und falsches Verwaltungstoken; 403 `{"message":"invalid","attempts_left":n}` nur bei falschem Proof eines verfügbaren Secrets; 422 bei ungültiger Eingabe; 409 `{"message":"conflict"}` bei schon vergebener `id`.
- Pagination and filters: N/A: die API liefert keine Listen und fragt keine ab.
- IaC resource: N/A: das Projekt hat keine Infrastrukturressource und keinen Provider.
- Read-after-write: N/A: Secrets sind nicht lesbar ohne Link-Key und Passwort; es gibt keinen Lese-Endpunkt außer Öffnen.
- Plan gating: N/A: es gibt keine Tarife.

## 8. Events, jobs and caching
- Events and realtime channels: N/A: die API sendet und empfängt keine Events.
- Jobs and queues: Scheduler `secrets:prune` jede Minute, idempotent (nur bedingte Updates und Löschen), keine Queue.
- Cache keys and invalidation: nur die Limiter-Schlüssel (HMAC der IP). Kein Cache von Secrets.

## 9. Permissions, limits and audit
- Permissions: Wer `id` und Proof kennt, öffnet; wer das Verwaltungstoken kennt, vernichtet. Keine Konten.
- Limits: Ablauf 5 Minuten bis 7 Tage (Serverkonfiguration begrenzt nach oben), Abrufe 1 bis 10, Fehlversuche 1 bis 10, Chiffretext genau Bucket plus 16 Byte, Throttling 20/h, 60/min, 30/min, 30/min je IP-Hash.
- Audit entries: N/A: es wird nichts protokolliert. Keine Roh-IPs, keine Bodies, keine Secrets in Logs; ein Test sucht nach Sentinel-Werten in `storage/logs`.

## 10. Tenant isolation
| Surface | How tenant A is kept out of tenant B's data |
|---|---|
| Alle | N/A: Single-Tenant ohne Mandanten und Konten (siehe Inception-Datensatz) |

## 11. Data protection
- New personal-data category: no
- New processor or sub-processor: no
- New retention period: yes
- Third-country transfer: no
- Special-category data: no
- Handed to: `docs/specs/privacy.md`: Aufbewahrung nur bis Ablauf oder Vernichtung, Ciphertext danach `NULL`, Metadatenzeilen höchstens 24 Stunden nach Vernichtung (Aufräumjob). Das sind keine personenbezogenen Daten, der Datenschutzentwurf wird trotzdem aktualisiert.

## 12. Dependencies
| Dependency | What the plan relies on | Evidence |
|---|---|---|
| SQLite (PHP `pdo_sqlite`) | bedingte `UPDATE`s sind atomar; ein Schreiber zur Zeit; `transaction_mode` `IMMEDIATE` verfügbar | reported: SQLite-Dokumentation zu Sperren, wird per Paralleltest belegt (Schritt 8) |
| Laravel 13.40.0 | `RateLimiter`, `FormRequest`, Scheduler | verified: `composer.lock`, `php artisan about` |
| `docs/SPEC.md` | Öffnen-Reihenfolge (reservieren, vergleichen, Abruf zählen) | verified: gelesen, Abschnitt Protokoll v1, Öffnen 5 |

## 13. Performance budget
- Volume: höchstens 20 Erstellungen je Stunde und IP-Hash; Öffnen höchstens 30/min je IP-Hash.
- Queries per request and p95 target: Öffnen höchstens 5 Anweisungen (Reservieren, Lesen, Zählen, Löschen, Rückgabe); Ziel p95 unter 50 ms ohne Last (gemessen im Test, nicht behauptet).
- Analytical or search scan scope: Aufräumjob prüft `expires_at` per Index, höchstens die abgelaufenen Zeilen.
- Queue load: N/A: keine Queue, der Scheduler läuft einmal pro Minute.
- Payload sizes: Request bis etwa 90 KB, Antwort beim Öffnen bis etwa 90 KB.

## 14. Failure modes
| Failure | Impact | Detection | Reaction |
|---|---|---|---|
| Viele parallele falsche Proofs | Versuchslimit könnte überschritten werden | Paralleltest mit 50 Prozessen | Reservieren per bedingtem `UPDATE` vor dem Vergleich; nur `max_attempts` Anfragen kommen durch |
| Zwei parallele richtige Öffnen beim letzten Abruf | Doppelte Auslieferung | Paralleltest | Abruf wird bedingt gezählt; nur ein Aufrufer gewinnt, der andere bekommt 404 |
| SQLite meldet "database is locked" | Anfrage scheitert | Ausnahme `QueryException` | Wartezeit (`busy_timeout`) und `IMMEDIATE`-Transaktionen; bleibt es dabei, 503 ohne Zustandsänderung |
| Aufräumjob läuft doppelt oder bricht ab | Abgelaufene Secrets bleiben länger liegen | Test auf Idempotenz | Öffnen prüft `expires_at` selbst, der Job ist nur Aufräumen |
| Client sendet kaputte Kodierung oder Überlänge | Speicher wird belegt | Validierung | 422, nichts gespeichert; Chiffretextlänge muss genau einer Bucketgröße plus 16 entsprechen |
| Zufällig doppelte `id` | Überschreiben fremder Daten | Primärschlüssel | 409, nie überschreiben |

- Irreversible: Vernichten und Verbrauchen sind endgültig; falsche Proofs zählen auch bei einem Angreifer, der nur zerstören will (bekannte Grenze in `docs/SPEC.md`).
- Costs money or reaches people if it fires wrongly: nichts.

## 15. Test plan
- Unit and feature tests (Pest): Validierung (Bereiche, Größen, base64url, unbekannte Felder, falsche Bucketlänge); atomares Öffnen bei `max_views` 1; Fehlversuche zählen und vernichten beim Limit; richtiger Proof gibt den Versuch zurück; Antworten für unbekannt, abgelaufen, vernichtet, verbraucht und falsches Token sind byte-gleich; `GET /s/{id}` ändert nichts; Ablauf an der Grenze mit `Carbon::setTestNow`; Löschen mit richtigem und falschem Token; Header-Test; Throttle 429 je Endpunkt; Aufräumjob; Schema-Test auf verbotene Spalten (Klartext, IP); Log-Test mit Sentinel-Werten.
- Paralleltest: 50 echte PHP-Prozesse gegen eine SQLite-Datei mit falschen Proofs; die Summe aller Fehlversuche überschreitet `max_attempts` nicht, und es kommt genau ein Vernichten vor.
- Cross-tenant test per new resource: N/A: Single-Tenant, keine Mandanten.
- Failure-mode tests: je Zeile aus Abschnitt 14, soweit simulierbar.
- Browser check: N/A in diesem Plan; die Ende-zu-Ende-Prüfung kommt mit der UI.

## 16. Rollout and rollback
- Rollout: Migration zuerst, dann Code. Kein Flag nötig, weil es noch keinen Verbraucher gibt (das UI folgt).
- Rollback: Code zurücknehmen und `php artisan migrate:rollback`. Gespeichert sind nur Ciphertext und Metadaten kurzlebiger Secrets, die nach Rückbau verloren gehen; vor einer Veröffentlichung gibt es keine Nutzdaten.
- Irreversible steps: Das Verwerfen der Tabelle verwirft alle noch nicht abgerufenen Secrets endgültig.

## 17. Implementation steps
| Step | Location | Done criterion | Depends on |
|---|---|---|---|
| 1. Migration, Modell, Konfiguration | `database/migrations`, `app/Models/Secret.php`, `config/secrets.php` | Schema-Test ohne Klartext- und IP-Spalten grün | Freigabe |
| 2. Strikte Anfragen | `app/Http/Requests/*` | Validierungstests inklusive unbekannter Felder und Bucketlänge grün | 1 |
| 3. Anlegen und Parameter | `app/Actions/CreateSecret.php`, `GetSecretParams.php`, Controller | Anlegen 201, Parameter 200, einheitliche 404 | 2 |
| 4. Öffnen mit Reservierung | `app/Actions/OpenSecret.php` | Zähler- und Vernichtungstests grün | 3 |
| 5. Vernichten und Aufräumen | `DestroySecret.php`, `PruneSecrets.php`, Befehl `secrets:prune`, Scheduler | Token-Tests und Aufräumtests grün | 4 |
| 6. Routen, Fehlerformat, Throttling, Seiten | `routes/api.php`, `routes/web.php`, `bootstrap/app.php` | 429 je Endpunkt, `GET /s/{id}` ändert nichts, einheitliche Fehler | 5 |
| 7. Härtung | `config/database.php`, `AppServiceProvider` | `secure_delete` an, `busy_timeout`, `IMMEDIATE`; Log-Test grün | 6 |
| 8. Paralleltest | `tests/Feature/ConcurrencyTest.php` | 50 Prozesse überschreiten das Limit nicht; Mutation (Reservieren nach Vergleichen) lässt ihn scheitern | 7 |

## 18. Self-review
1. Datenmodell bei Spitzenlast: höchstens 20 Zeilen je Stunde und IP-Hash; Zugriffe über den Primärschlüssel `id`; Aufräumen über Index auf `expires_at`.
2. Sichtbare Fehler: Zeilen in Abschnitt 14, jede mit Test.
3. Mandanten: N/A, Single-Tenant (Abschnitt 10).
4. Kosten je Operation: Öffnen höchstens 5 Anweisungen, 0 Jobs, 0 Nachrichten.
5. Rückbau: `migrate:rollback` und Codezurücknahme.
6. Kundenwissen: Die Erklärung gehört in README und UI.
7. Lebenszyklus: anlegen, öffnen, vernichten; Wiederholung des Anlegens mit gleicher `id` ergibt 409, kein Duplikat.
8. Nicht verifiziert: SQLite-Sperrverhalten (wird durch den Paralleltest belegt), p95 (gemessen, nicht angenommen).
9. Zweiter Mechanismus: nein, bestehende Limiter und Header werden wiederverwendet.
10. Vergleich mit anderen Produkten: keiner im Plan.

Adversarial review: Für diesen Plan nicht eingeholt. Der Skill verlangt genau eine Prüfung bei Geld, Anmeldung, Mandanten und Nebenläufigkeit; hier steckt Nebenläufigkeit drin. Ich begegne dem mit dem Paralleltest gegen echte Prozesse und einer Mutationsprüfung der Reservierungsreihenfolge, und halte das als Abweichung fest.

## 19. Open decisions
1. Soll ein Aufruf von `GET /api/secrets/{id}/params` die Zahl der Fehlversuche verraten?
   - Options: A, nur `max_attempts`; B, zusätzlich die verbleibenden Versuche.
   - Trade-offs: B hilft dem Empfänger vor dem ersten Versuch, verrät aber jedem mit der `id` den Stand und lässt ihn Secrets unterscheiden.
   - Recommendation: A, weil `docs/SPEC.md` nur `max_attempts` nennt; die Restversuche kommen mit der Antwort auf einen falschen Proof.
   - Answer: A, entschieden nach der Spec ohne Rückfrage, weil sie eindeutig ist.
2. Wie lange bleibt die Metadatenzeile nach Vernichtung?
   - Options: A, sofort löschen; B, 24 Stunden behalten.
   - Trade-offs: A macht "vernichtet" und "unbekannt" trivial gleich, B hält die Zeile für Fehlersuche, trägt aber nichts Geheimes.
   - Recommendation: A, weil es keine Fehlersuche an Metadaten braucht und die Antworten ohnehin identisch sind.
   - Answer: A, gesetzt nach Empfehlung: Aufräumjob löscht vernichtete und abgelaufene Zeilen sofort; die Spalten `destroyed_*` bleiben bis dahin für den Fall, dass ein Aufruf zwischen Vernichten und Aufräumen kommt.
