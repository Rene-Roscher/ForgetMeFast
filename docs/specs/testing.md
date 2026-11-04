# Tests

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: verify-before-done, browser-verification, feature-delivery
Code: none yet
Checked against code: none

## Zweck
Testumfang und Definition von „fertig“. Einzelne Testfälle stehen in `docs/SPEC.md` (Tests).

## Regeln
- Spuren: Pest (Server, SQLite wie in Produktion), Vitest (Krypto-Modul, ohne Netzwerk), Playwright (E2E inklusive
  Klartext-Scan).
- Tests zuerst bei Krypto-Modul sowie Abruf- und Versuchslogik. Jeder Test wird einmal rot gesehen.
- Krypto-Testvektoren aus RFC 5869 und RFC 9106, nicht aus Gedächtnis.
- Fertig heißt: `composer check`, `npm run check`, `npm run e2e` grün und die Änderung im laufenden Programm gezeigt.

## Tests, die es beweisen
CI-Lauf mit allen drei Befehlen.

## Offene Punkte
Keine.
