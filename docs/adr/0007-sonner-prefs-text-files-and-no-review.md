# 0007. Meldungen mit vue-sonner, gemerkte Regeln, Textdateien und kein "Prüfen vor dem Senden"

Status: Accepted
Date: 2026-11-04
Supersedes: Teil von ADR 0005 (eigener Toast-Baustein, "Prüfen vor dem Senden")

## Context
Der Maintainer wünscht saubere Meldungen mit der gängigen Bibliothek, dass die zuletzt gewählten Regeln erhalten bleiben,
einen Schalter "Einmalig", das Laden einer Textdatei und hält "Vor dem Senden prüfen" für überflüssig.

## Decision
1. **vue-sonner 2.0.9** (MIT, keine Laufzeit-Abhängigkeiten) für Meldungen, unstyled und mit unseren Tokens gestaltet
   (`components/Toaster.vue`, `toast.ts` als dünne Hülle). Die Verträglichkeit mit der strikten CSP belegt der E2E-Test
   (kein Verstoß). Der eigene Reka-Toast entfällt.
2. **Gemerkte Regeln** in `localStorage` (`fmf-prefs`): Ablauf, Abrufe, Fehlversuche, Einmalig, Art des Passworts. Nie ein
   Passwort oder Secret; jeder Wert wird streng geprüft, sonst gelten die Standardwerte (Test belegt das).
3. **Einmalig** (Standard an) bedeutet genau einen Abruf und blendet die Abrufe-Auswahl aus.
4. **Textdatei laden** (Auswahl oder Ablegen): nur reiner Text bis zum Limit von 65.532 Byte, gelesen im Browser. Es ist
   kein Upload und kein Anhang: Der Inhalt steht danach im Secret-Feld und läuft durch das unveränderte Protokoll. Das
   Protokoll bleibt unberührt (`CLAUDE.md`: keine Dateien als Anhang, hier nur Text im Feld).
5. **"Vor dem Senden prüfen" entfällt** samt Dialog. Die Aussage "kein Klartext, kein Passwort, kein Link-Key im Request"
   belegt weiter der E2E-Test am echten Request.
6. **Stärke** in vier Stufen (Schwellen 36, 50, 64 Bit; ein erzeugtes Passwort mit 64 Bit oder mehr gilt als stark) mit Wort und Farbe; die Farbe ist nur Zugabe.

## Consequences
- Eine neue Abhängigkeit (`npm audit`: 0 Funde). Bei Updates ist die Verträglichkeit mit der CSP erneut zu prüfen (E2E).
- `localStorage` enthält `fmf-theme`, `fmf-prefs`, `fmf-history`.
- Die Stärke eines getippten Passworts ist weiterhin nur eine obere Schätzung (Länge mal Zeichenvorrat) und so beschriftet.
- Weitere Ergänzungen am selben Tag: laufende Beispiel-Platzhalter (`examples.ts`, offensichtlich unechte Werte), Strg+S
  erstellt das Secret, eigene Scrollleisten, der Viewer zeigt viel Inhalt links und die Übersicht rechts.
