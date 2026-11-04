# Produktbrief

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: none installed, area checklist used
Code: none yet
Checked against code: none

## Problem
Zugangsdaten und Tokens landen im Chat- oder Mailverlauf und bleiben dort liegen.

## Nutzer
Entwickler, Admins und Dienstleister, die ein Secret einmalig an eine andere Person übergeben. Der Betreiber hostet
die App selbst. Es gibt keine Accounts.

## Heute
Chat, Mail oder Ticket. Das Secret bleibt dauerhaft lesbar bei Dritten.

## Markt
Es gibt Dienste für einmalig abrufbare Secrets. Marktaussagen sind für das Setup nicht nötig und werden nicht
gemacht (inferred, ungeprüft).

## Nicht-Ziele
Passwortmanager-Ersatz, Langzeitablage, Dateitransfer, Accounts, Teams, E-Mail-Versand, Mehrsprachigkeit.

## Erfolgsmaß
Alle Tests und der Klartext-Scan aus `docs/SPEC.md` sind grün und das README nennt die Grenzen ehrlich.
Eine Zahl mit Termin legt der Maintainer fest (siehe offene Entscheidung 5 im Inception-Datensatz).

## Moment höchster Belastung
Der Empfänger öffnet den Link mit kaputtem Passwort unter Zeitdruck. Die Fehlermeldung nennt die Restversuche
und verrät nichts über den Zustand anderer Secrets.
