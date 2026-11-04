# 0001. Architekturentscheidungen als ADR festhalten

Status: Accepted
Date: 2026-11-04
Supersedes: none

## Context
Das Projekt hat Entscheidungen mit Nachwirkung (Krypto-Bibliothek, Protokoll, Sicherheitsheader). Sie müssen
nachvollziehbar bleiben, auch für Leser ohne Gesprächsverlauf.

## Decision
Jede solche Entscheidung steht als ADR in `docs/adr/NNNN-slug.md` mit Kontext, Entscheidung, Folgen und Quellen,
nach Nygard. Nummern laufen fortlaufend und werden nie wiederverwendet. Eine überholte ADR wird als
`Superseded by` markiert, nicht gelöscht.

## Consequences
Ein Dateiaufwand pro Entscheidung, dafür ein prüfbares Entscheidungsprotokoll. Quelle:
https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
