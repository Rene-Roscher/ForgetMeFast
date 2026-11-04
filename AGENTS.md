# ForgetMeFast: Einstieg für Agenten

Projektüberblick, Invarianten und Befehle stehen in `CLAUDE.md`. Das Protokoll steht in `docs/SPEC.md`.

## Read first

Lies das genannte Dokument, bevor du Code in dem Bereich änderst. Code schlägt Doku, melde Abweichungen.

| Task | Read first | Skill |
|---|---|---|
| Neues Feature oder Produktänderung | `docs/product/brief.md`, danach ein Plan in `docs/plans/` | `feature-planning` |
| Protokoll v1, Krypto, Abruflogik | `docs/SPEC.md` | `evidence-before-claims` |
| Migration, Model, Tabelle | `docs/specs/data.md` | `laravel-architecture` |
| Controller, Action, Middleware, Header | `docs/specs/runtime.md` | `laravel-architecture` |
| Seiten, Komponenten, Rendering, CSP | `docs/specs/architecture.md` | `vue-inertia-frontend` |
| Endpunkte und Validierung | `docs/specs/api.md` | `api-contract` |
| Logs, Metadaten, Aufbewahrung | `docs/specs/privacy.md` | `evidence-before-claims` |
| CI, Release, Abhängigkeiten | `docs/specs/delivery.md` | `github-actions-hardening` |
| Tests, Definition von fertig | `docs/specs/testing.md` | `test-strategy` |
| Befehle, Versionen, Freigabeliste | `docs/PROJECT-FACTS.md` | `safe-actions` |
| Neue Entscheidung mit Nachwirkung | `docs/adr/TEMPLATE.md` | `project-inception` |
| Business-Bereich | `docs/business/model.md` | `project-inception` |

## Plugins

Einmalig pro Person nach dem Klonen:
`claude plugin marketplace add Rene-Roscher/skills` und
`claude plugin install <core|laravel|web|delivery|api|guardrails>@rene-roscher-skills --scope project`.
