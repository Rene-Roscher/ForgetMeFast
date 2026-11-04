# API

Status: Implemented
Owner: Maintainer (Rene Roscher)
Skills: api-contract
Code: app/Http/Controllers, app/Http/Requests, app/Rules, app/Actions, routes/api.php, config/secrets.php
Checked against code: 2026-11-04

## Zweck
Vier JSON-Endpunkte, die die Browser-App nutzt. Kein öffentliches API-Produkt.

## Regeln
- Endpunkte und Validierung laut `docs/SPEC.md` (API). Unbekannte Felder abweisen, Größen begrenzen.
- Unbekannt, abgelaufen, vernichtet und verbraucht liefern identische Antworten (Status und Body).
- Der Satz gilt für die vier "nicht verfügbar"-Zustände. Ein falscher Proof auf ein verfügbares Secret antwortet bewusst anders (403 mit
  `attempts_left`): Das Protokoll braucht die Rückmeldung, und wer die id kennt, kann so erfahren, dass das Secret lebt. Jede solche
  Probe verbraucht einen Fehlversuch.
- Falsche Methoden und unbekannte Pfade unter `/api` antworten wie "nicht verfügbar" (404, kein Framework-Text).
- Größenlimits der Bodies: Anlegen 96 KiB, Öffnen und Löschen 2 KiB (`LimitBodySize`, Antwort 413 `too_large`).
- Hinter einem Reverse Proxy gilt `X-Forwarded-For` nur von Adressen in `TRUSTED_PROXIES` (`TrustedProxies`).
- Fehler als einheitliches JSON ohne Hinweis auf den Zustand. Body fest `{"message":"unavailable"}`; kein RFC 9457.
- Keine Versionierung im Pfad im MVP, Protokollversion steht im Header (`v`).
- Throttling je IP-Hash laut `docs/SPEC.md`. Keine Idempotency-Keys, keine Tokens, keine Pagination.

## Tests, die es beweisen
Pest-Tests laut `docs/SPEC.md`.

## Offene Punkte
Keine.
