# 0003. Setup-Entscheidungen: ohne Accounts, ohne Cookies, nativ, unsigniert

Status: Accepted
Date: 2026-11-04
Supersedes: none

## Context
Das Laravel-Grundgerüst bringt User-Model, Session und CSRF-Cookie mit. Die Spec (`docs/SPEC.md`) kennt keine
Accounts und verbietet Cookies für Funktionen. Der Skill `core:project-scaffold` erlaubt das Entfernen von
Starter-Funktionen nur per ADR. Der Skill `delivery:local-dev-stack` beschreibt einen Compose-Stack, die Spec führt
Compose als Stretch. `core:commit-hygiene` empfiehlt signierte Commits. Im Repo ist kein Signierschlüssel
eingerichtet. Entschieden vom Maintainer am 2026-11-04.

## Decision
1. Der erste Commit ist die unveränderte Starter-Ausgabe. Danach entfernt ein eigener Commit `User`-Model,
   Factory sowie die Migrationen für `users`, `password_reset_tokens` und `sessions`.
2. Die `web`-Gruppe verzichtet auf `StartSession`, CSRF-Prüfung und Cookie-Verschlüsselung, `SESSION_DRIVER=array`.
   Ein Pest-Test stellt sicher, dass keine Antwort `Set-Cookie` enthält. Begründung: Die Endpunkte sind
   zustandslos und ohne Authentifizierung, ein Cookie könnte CSRF nur gegen einen Zustand schützen, den es nicht gibt.
3. `secrets.id` (128 Bit Zufall) ist Primär- und öffentlicher Schlüssel. Abweichung von der Regel „öffentliche ID
   neben bigint-Schlüssel“ in `laravel:laravel-architecture`, weil die ID nicht erratbar ist und es keine
   Mandanten gibt.
4. Lokale Entwicklung nativ mit `composer dev`. (Ein Container-Image für den Betrieb kam später: ADR 0008.)
5. Commits bleiben vorerst unsigniert und werden nicht gepusht, bis der Maintainer Signing einrichtet.
   Abweichung vom [default] in `commit-hygiene`.
6. `laravel-boost` bleibt als Plugin aktiv, weil `laravel` es voraussetzt. Das Composer-Paket wird nicht installiert.

## Consequences
Weniger Angriffsfläche und kein toter Account-Code. Dafür weicht die App vom Laravel-Standard ab, das müssen
Tests und `docs/specs/runtime.md` absichern. Unsignierte Commits sind nicht als von der Person stammend belegt.
Ein später aktivierter Cookie- oder Session-Bedarf braucht eine neue ADR.

## Sources
- `docs/SPEC.md`, Abschnitt Stack und Server-Härtung.
- `core:project-scaffold` und `core:commit-hygiene`, gelesen 2026-11-04.
