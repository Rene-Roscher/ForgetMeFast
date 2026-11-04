# Datenschutz

Status: Approved
Owner: Maintainer (Rene Roscher)
Skills: none installed, area checklist used
Code: none yet
Checked against code: none

## Zweck
Der Server hält nur Ciphertext und Metadaten. Entwurf, kein Rechtsrat.

## Inventar
| Kategorie | Zweck | Aufbewahrung |
|---|---|---|
| Ciphertext, Header, Verifier | Auslieferung des Secrets | bis Ablauf oder Vernichtung, Ciphertext danach `NULL` |
| Metadaten (Zeiten, Zähler, Größen-Bucket) | Limits | bis zum Prune |
| IP-Hash im Throttling | Missbrauchsschutz | Cache-Lebensdauer des Limits |

Keine Roh-IPs, keine Bodies, keine Secrets in Logs. Keine Auftragsverarbeiter, keine Drittlandübertragung,
keine Analytics.

## Tests, die es beweisen
Klartext-Scan (Playwright) über DB-Datei, Logs und Access-Log nach Secret, Passwort und `K_link`.

## Offene Punkte
Keine.
