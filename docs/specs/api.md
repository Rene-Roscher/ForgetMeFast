# API

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: api-contract
Code: none yet
Checked against code: none

## Zweck
Vier JSON-Endpunkte, die die Browser-App nutzt. Kein öffentliches API-Produkt.

## Regeln
- Endpunkte und Validierung laut `docs/SPEC.md` (API). Unbekannte Felder abweisen, Größen begrenzen.
- Unbekannt, abgelaufen, vernichtet und verbraucht liefern identische Antworten (Status und Body).
- Fehler als einheitliches JSON ohne Hinweis auf den Zustand. Ob RFC 9457 dafür passt, ist offene Entscheidung 6.
- Keine Versionierung im Pfad im MVP, Protokollversion steht im Header (`v`).
- Throttling je IP-Hash laut `docs/SPEC.md`. Keine Idempotency-Keys, keine Tokens, keine Pagination.

## Tests, die es beweisen
Pest-Tests laut `docs/SPEC.md`.

## Offene Punkte
Siehe Inception-Datensatz, Punkt 6.
