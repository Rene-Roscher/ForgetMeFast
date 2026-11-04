# Auslieferung

Status: Draft
Owner: Maintainer (Rene Roscher)
Skills: github-actions-hardening, safe-actions
Code: none yet
Checked against code: none

## Zweck
CI prüft jede Änderung mit denselben Befehlen wie lokal und läuft mit minimalen Rechten.

## Regeln
- GitHub Actions auf volle Commit-SHAs gepinnt, `permissions: contents: read`, kein `pull_request_target`,
  Eingaben nie direkt in `run:` interpoliert, `zizmor` als Prüfung.
- CI-Gates: `composer check`, `npm run check`, `npm run e2e`.
- Lockfiles committed (`composer.lock`, `package-lock.json`). `.env` nie.
- Dev-Stack nativ über `composer dev` (ADR 0003). Docker Compose bleibt Stretch.
- Freigabe des Maintainers nötig für: `git push`, Release, alles gegen Fremdsysteme.

## Tests, die es beweisen
`zizmor` ohne Funde, grüne CI auf einem Pull Request.

## Offene Punkte
Keine.
