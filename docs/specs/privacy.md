# Datenschutz

Status: Implemented
Owner: Maintainer (Rene Roscher)
Skills: none installed, area checklist used
Code: app/Actions/PruneSecrets.php, routes/console.php, config/database.php
Checked against code: 2026-11-04

## Zweck
Der Server hält nur Ciphertext und Metadaten. Entwurf, kein Rechtsrat.

## Inventar
| Kategorie | Zweck | Aufbewahrung |
|---|---|---|
| Ciphertext, Header, Verifier | Auslieferung des Secrets | bis Ablauf oder Vernichtung, Ciphertext danach `NULL` |
| Metadaten (Zeiten, Zähler, Größen-Bucket) | Limits | bis zum Prune |
| IP-Hash im Throttling | Missbrauchsschutz | Cache-Lebensdauer des Limits |
| Verlauf im Browser des Erstellers (`localStorage` `fmf-history`: Link mit Schlüssel, Verwaltungstoken, Zeiten) | eigene Secrets wiederfinden | nur auf dem Gerät, höchstens 20 Einträge, 24 Stunden nach Ablauf entfernt, per "Verlauf leeren" löschbar; nie Passwort oder Klartext, erreicht den Server nie (ADR 0006) |

Keine Roh-IPs, keine Bodies, keine Secrets in Logs.
Aufbewahrung: Der Aufräumjob `secrets:prune` (jede Minute) setzt abgelaufene Secrets auf vernichtet (Ciphertext `NULL`) und
löscht alle vernichteten Zeilen sofort. SQLite läuft mit `secure_delete`. Das überschreibt gelöschte Seiten in der Datei,
bedeutet aber kein garantiertes physisches Überschreiben auf dem Datenträger (Dateisystem, Snapshots). Harmlos, weil nur
Ciphertext und Metadaten dort liegen.
 Keine Auftragsverarbeiter, keine Drittlandübertragung,
keine Analytics.

## Tests, die es beweisen
Klartext-Scan (Playwright) über DB-Datei, Logs und Access-Log nach Secret, Passwort und `K_link`.

## Offene Punkte
Keine.
