# Krypto-Modul

Status: Implemented
Owner: Maintainer (Rene Roscher)
Skills: evidence-before-claims, maintainable-code
Code: resources/js/crypto, scripts/gen-protocol-vector.mjs
Checked against code: 2026-11-04

## Zweck
Setzt Protokoll v1 im Browser um: nur Web Crypto plus `@noble/hashes` für Argon2id (ADR 0002). Keine UI, kein Netzwerk,
keine Speicherung.

## Rules
- Bytes und Formate: `docs/CRYPTO-NOTES.md`. Entscheidungen: ADR 0004. Plan: `docs/plans/2026-11-04-crypto-module.md`.
- Öffentliche Schnittstelle nur `resources/js/crypto/index.ts` (Exportliste per Test fixiert).
- Öffnen ist zweigeteilt: `prepareOpen` leitet ab und liefert den Proof, `finish` entschlüsselt nach akzeptiertem Proof.
- Zufall nur über `crypto.getRandomValues`; Passwort-Generator mit Rejection Sampling.
- Argon2id läuft im Browser in einem Web Worker aus einer eigenen Datei (`kdf.worker.ts`), unter der unveränderten CSP.
- Kein Schlüsselmaterial in Fehlertexten, `console`, Speicher, Adresse oder Netzwerk (statische Prüfung per Test).

## Tests, die es beweisen
RFC 5869 A.1 bis A.3, RFC 9106 §5.3, ein unabhängig erzeugter Protokollvektor (Node `crypto`, OpenSSL-Argon2id), AAD-Test je
Feld, Bit-Flips, Padding-Grenzen, Generator ohne Bias mit eingespeister Bytequelle, statische Prüfung, Abdeckung 95 % als
Schwelle. Jede Schutzmaßnahme wurde einmal gegen eine absichtliche Verletzung rot gesehen.

## Open points
Laufzeit auf einem Mobilgerät nicht gemessen. Der Argon2-Teil von `@noble/hashes` ist nicht auditiert.
