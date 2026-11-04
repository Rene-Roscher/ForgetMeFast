# Sicherheit

ForgetMeFast ist ein **Demo-Projekt**, kein geprüftes Produkt. Es gab keine externe Prüfung der Kryptografie oder der
Anwendung. Wer es mit echten Geheimnissen betreiben will, sollte das Protokoll (`docs/SPEC.md`, `docs/CRYPTO-NOTES.md`) selbst
prüfen oder prüfen lassen. Die ehrlichen Grenzen stehen im README unter "Bekannte Grenzen".

## Eine Schwachstelle melden

Bitte **nicht** als öffentliches Issue. Über den Reiter "Security" des Repositories einen privaten Bericht ("Report a
vulnerability") anlegen. Hilfreich sind: betroffene Stelle (Datei oder Endpunkt), ein Ablauf zum Nachstellen und die
erwartete Auswirkung.

Rückmeldung nach Möglichkeit innerhalb von sieben Tagen. Es ist ein Projekt ohne Auftrag und ohne Bereitschaftsdienst:
Fristen und Behebungen sind ein Bemühen, kein Versprechen.

## Im Umfang

- Server: Zähler, Vernichtung, einheitliche Antworten, Throttling, Header, Logs (`docs/specs/api.md`, `docs/specs/privacy.md`).
- Browser: Krypto-Modul, Umgang mit dem URL-Fragment, CSP, lokaler Speicher (`docs/specs/crypto.md`).
- Container-Image und CI (`Dockerfile`, `.github/workflows/ci.yml`).

## Nicht im Umfang

- Ein kompromittierter Server, der manipuliertes JavaScript ausliefert (Grundproblem jeder verschlüsselten Webseite).
- Chat-Anbieter, die den ganzen Link sehen, und Erweiterungen im Browser des Nutzers.
- Fehlende Härtung der eigenen Umgebung (Reverse Proxy, HTTPS, Backups).
