# Daten

Status: Implemented
Owner: Maintainer (Rene Roscher)
Skills: none installed, area checklist used
Code: database/migrations, app/Models/Secret.php, config/secrets.php
Checked against code: 2026-11-04

## Zweck
Eine Tabelle `secrets` nach `docs/SPEC.md` (Datenmodell). Kein Klartext-Feld, keine IP-Spalte.

## Regeln
- Datenbank: SQLite (Produktion und Tests, dieselbe Engine). `secure_delete` an.
- Öffentliche ID ist die `id` (16 Zufallsbytes, base64url) als Primärschlüssel, kein zweiter interner Schlüssel.
- Abruf- und Versuchszähler nur über bedingte `UPDATE`s.
- Zeiten serverseitig berechnet, UTC.
- Das User-Model samt `users`, `password_reset_tokens` und `sessions` entfällt (ADR 0003).

## Tests, die es beweisen
Schema-Test auf verbotene Spalten, Nebenläufigkeitstest der Versuchsreservierung (siehe `docs/SPEC.md`, Tests).

## Offene Punkte
Keine.
