# Geschäftsmodell

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: none installed, area checklist used
Code: none yet
Checked against code: none

## Käufer und Markt
Kein Verkauf. Open-Source-Projekt zum Selbst-Hosten, Oberfläche nur Deutsch.

## Preismodell
N/A: es gibt keinen Preis, keine Zahlung, keine Konten.

## Kosten pro Kunde
Ein kleiner PHP-Server mit SQLite. Keine bezahlten Nachrichten, keine Drittanbieter.

## Build or Buy
| Fähigkeit | Build/Buy | Paket | Ausstiegspfad |
|---|---|---|---|
| Argon2id im Browser | Buy (Bibliothek) | per ADR 0002 | PBKDF2-SHA-256 ≥ 600.000 über Web Crypto, KDF-Name im Header |
| Alles andere Krypto | Buy | Web Crypto API | keiner nötig |

## Rechtlicher Rahmen
Keine personenbezogenen Daten im Klartext, keine Accounts, keine Cookies für Funktionen. Details in
`docs/specs/privacy.md`. Kein Rechtsrat.
