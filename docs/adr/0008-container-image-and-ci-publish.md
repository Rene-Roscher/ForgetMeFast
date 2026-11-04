# 0008. Container-Image und Veröffentlichung über CI

Status: Accepted
Date: 2026-11-04
Supersedes: Teil von ADR 0003 ("Docker Compose bleibt Stretch")

## Context
Die App soll sich ohne lokale PHP- und Node-Installation betreiben lassen, und die Auslieferung soll genauso nachvollziehbar
sein wie der Code: gebaut, getestet und veröffentlicht in der CI, mit minimalen Rechten.

## Decision
1. **Image:** `Dockerfile` in drei Stufen (Oberfläche mit Node, PHP-Abhängigkeiten ohne Dev-Pakete, Laufzeit). Basis ist
   FrankenPHP (Caddy mit PHP 8.3, Alpine); Basis-Images sind auf einen Digest festgenagelt, Dependabot hebt sie an. Node und
   Composer sind nicht im fertigen Image. `apk upgrade` beim Bauen schließt bekannte Lücken der Basis (Trivy meldete sonst
   ein HIGH in `curl`).
2. **Laufzeit:** Benutzer `www-data`, Port 8080, `tini` als Init. Der Einstieg (`docker/entrypoint.sh`) legt die SQLite-Datei in
   `/data` an, migriert, baut Config-, Route- und View-Cache und startet den Aufräumjob (`schedule:run` jede Minute) neben dem
   Webserver. `APP_KEY` kommt aus der Umgebung und steht nie im Image.
3. **Webserver** (`docker/Caddyfile`): kein Zugriffsprotokoll, `Server`-Header entfernt, dieselben Schutz-Header wie die App auch für
   statische Dateien (die Lücke, die das README vorher nannte), Quelltext, Dotfiles und Konfiguration liefert er nie aus. HTTPS
   beendet ein Reverse Proxy davor.
4. **CI** (`.github/workflows/ci.yml`): Job `docker` baut das Image (ohne Push), führt einen Rauchtest aus (Health, Header der Seite
   und einer statischen Datei, gesperrte Pfade, kein Root) und scannt mit Trivy (CRITICAL bricht ab). Job `publish` läuft nur auf `main`
   und auf `v*`-Tags nach allen anderen Jobs, hat als einziger `packages: write` und schiebt das Image mit Provenienz (`mode=max`) und
   SBOM nach GHCR. Alle Actions sind auf Commit-SHAs festgenagelt; `zizmor` und `actionlint` prüfen die Workflows.
5. **Compose-Beispiel** (`docker-compose.yml`): schreibgeschütztes Dateisystem, tmpfs für Laufzeitverzeichnisse, ohne Capabilities,
   `no-new-privileges`, nur an `127.0.0.1` gebunden.

## Consequences
- Das Image ist etwa 390 MB groß (FrankenPHP ist der größte Teil).
- `apk upgrade` macht den Bau nicht bitgleich reproduzierbar; dafür kommen Sicherheitskorrekturen der Basis ohne Wartezeit an.
- Das Image wurde lokal gebaut, gestartet und mit einem echten Ablauf (anlegen, öffnen, danach weg) im Browser geprüft, auch mit
  dem gehärteten Compose-Profil. Die CI-Jobs selbst liefen noch nicht auf GitHub.
- `laravel/tinker` liegt jetzt in `require-dev` und ist nicht im Image.
