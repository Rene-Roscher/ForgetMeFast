# 0006. Lokaler Verlauf der eigenen Secrets und neutrale Palette

Status: Accepted
Date: 2026-11-04
Supersedes: Punkt 3 (Palette) und Punkt 6 (nur eine Einstellung im Speicher) von ADR 0005

## Context
Der Ersteller soll unter "Verlauf" seine eigenen Secrets mit Abrufen und Ablauf sehen, ohne Konto. Außerdem soll das
Design näher an Vercel (Geist) liegen: neutrale Flächen, Teal nur als Akzent, weiche Fokusringe statt Browser-Outline.

## Decision
1. **Verlauf im Browser** (`localStorage`, Schlüssel `fmf-history`, `resources/js/history.ts`). Gespeichert werden pro Eintrag
   `id`, `link` (mit Link-Key), `manageToken`, `createdAt`, `expiresAt`, `ttl`, `maxViews`. **Nie** Passwort oder Klartext;
   ein E2E-Test prüft den Speicherinhalt auf beide. Höchstens 20 Einträge, abgelaufene fallen 24 Stunden nach Ablauf heraus,
   unlesbare Einträge werden verworfen.
2. **Bewusste Abweichung von einer Invariante (Produktentscheidung des Maintainers):** `CLAUDE.md` sagt, das Fragment werde
   "nie gespeichert". Der Verlauf speichert den Link samt Fragment lokal. Das ist nur auf dem Gerät des Erstellers lesbar
   (gleiche Reichweite wie der Browser-Verlauf, den die Doku ohnehin als Grenze nennt), erreicht den Server nie und lässt sich
   per "Verlauf leeren" löschen. Der Server erhält weiterhin nie Link-Key, Passwort oder Klartext.
3. **Statusabfrage** `GET /api/secrets/{id}/status` mit Header `X-Manage-Token`: liefert Abrufe und Zustand. Falsches Token,
   unbekannt, abgelaufen und vernichtet antworten identisch mit 404 `{"message":"unavailable"}`. Throttle 60/min je IP-Hash.
   Der Aufruf verändert nichts.
4. **Palette:** neutrale Grautöne wie bei Geist (hell Hintergrund `#fff`, Text `#171717`; dunkel `#0a0a0a` mit `#111`-Karten,
   Rand `#2e2e2e`), Primärschaltfläche neutral, Teal (`#0f766e` hell, `#2dd4bf` dunkel) als Marken- und Fokusfarbe.
   `tokens.css` wurde angepasst. Kontraste sind im Design-Test gemessen (Text 4,5:1, Eingaberänder 3:1).
5. **Fokus:** ein globaler weicher Ring aus `box-shadow` (2 px Lücke, 2 px Ring). Der Design-Test misst Breite und Kontrast.

## Consequences
- `localStorage` enthält jetzt `fmf-theme` und `fmf-history`. README und Datenschutzspezifikation sagen das.
- Wer Zugriff auf das Gerät und den Browserprofil hat, kann gespeicherte Links samt Schlüssel lesen. Das Passwort fehlt, ohne
  es lässt sich nichts entschlüsseln.
- Neuer Endpunkt, neuer Pfad im Throttle; Pest-Tests belegen die einheitliche 404 (mit Mutationsprobe).
- `SECRETS_CREATE_PER_HOUR` (Standard 20) macht das Anlege-Limit konfigurierbar, damit ein E2E-Lauf mit mehr als 20 Secrets
  nicht ins Limit läuft; die Pest-Tests prüfen den Standard.
