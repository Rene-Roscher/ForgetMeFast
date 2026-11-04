# Auslieferung

Status: Approved
Owner: Maintainer (Rene Roscher)
Skills: github-actions-hardening, safe-actions
Code: .github, composer.json, package.json
Checked against code: 2026-11-04

## Zweck
CI prüft jede Änderung mit denselben Befehlen wie lokal und läuft mit minimalen Rechten.

## Regeln
- GitHub Actions auf volle Commit-SHAs gepinnt, `permissions: contents: read`, kein `pull_request_target`,
  Eingaben nie direkt in `run:` interpoliert, `zizmor` als Prüfung.
- CI-Gates: `composer check`, `npm run check`, `npm run e2e`, Container-Image (Build, Rauchtest, Trivy ohne CRITICAL). Auf `main` und
  Versions-Tags schiebt `publish` das Image nach GHCR (Provenienz und SBOM); nur dieser Job hat `packages: write` (ADR 0008).
- Lockfiles committed (`composer.lock`, `package-lock.json`). `.env` nie.
- Dev-Stack nativ über `composer dev` (ADR 0003). Für den Betrieb gibt es ein Container-Image (`Dockerfile`, ADR 0008).
- Freigabe des Maintainers nötig für: `git push`, Release, alles gegen Fremdsysteme.

## Tests, die es beweisen
`zizmor` ohne Funde, grüne CI auf einem Pull Request.

## Offene Punkte
Keine.
