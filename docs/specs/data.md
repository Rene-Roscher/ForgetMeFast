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
- Das User-Model samt `users`, `password_reset_tokens` und `sessions` entfällt (ADR 0003). Ebenso die Queue-Tabellen (`jobs`, `job_batches`,
  `failed_jobs`) und die Konfigurationen für Mail, Queue, Sessions, Dateisystem und Dienste: Es gibt keine Konten, keine Mails, keine
  Jobs und keine Dateien. Übrig sind `secrets` und die Cache-Tabellen (`cache`, `cache_locks`): Die Zähler des Throttlings brauchen einen
  Speicher, der Anfragen und Neustarts überlebt (`CACHE_STORE=database`; dort liegen nur gesalzene Hashes, keine Adressen).

## Tests, die es beweisen
Schema-Test auf verbotene Spalten und auf die Menge der Tabellen (nur `secrets`, `cache`, `cache_locks`), Nebenläufigkeitstest der Versuchsreservierung (siehe `docs/SPEC.md`, Tests).

## Offene Punkte
Keine.
