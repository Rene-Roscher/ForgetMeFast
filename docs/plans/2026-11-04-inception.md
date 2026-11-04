# Inception: ForgetMeFast

Status: Draft
Approved-by:
Mode: new
Date: 2026-11-04

## Summary
ForgetMeFast ist eine selbst gehostete Webapp ohne Accounts, die Secrets im Browser verschlüsselt und einmalig
abrufbar macht. Zielgruppe sind Entwickler und Admins, die Zugangsdaten übergeben. Das erste Release liefert das
Protokoll v1 aus `docs/SPEC.md`; dieses Setup legt nur das Fundament ohne Feature-Code.

## Areas
| Area | Document | Status | Skills | N/A reason |
|---|---|---|---|---|
| Product | `docs/product/brief.md` | Draft | none installed | |
| Business | `docs/business/model.md` | Draft | none installed | |
| Architecture | `docs/specs/architecture.md` | Draft | web-architecture, vue-inertia-frontend | |
| Data | `docs/specs/data.md` | Draft | none installed | |
| Tenancy | | | | N/A: Single-Tenant-Selbsthost-App, keine Mandanten, keine Accounts |
| Access | | | | N/A: keine Rollen und kein Login; der Zugriff läuft über Link-Key, Passwort und `manage_token` aus `docs/SPEC.md` |
| Billing | | | | N/A: kein Bezahlmodell |
| Privacy | `docs/specs/privacy.md` | Draft | none installed | |
| Availability | | | | N/A: Selbsthost, kein Betriebsversprechen; Backups irrelevant, Secrets sind kurzlebig |
| Delivery | `docs/specs/delivery.md` | Draft | github-actions-hardening, safe-actions | |
| Testing | `docs/specs/testing.md` | Draft | verify-before-done, browser-verification, feature-delivery | |
| API | `docs/specs/api.md` | Draft | api-contract | |
| Runtime | `docs/specs/runtime.md` | Draft | laravel-architecture, laravel-production-runtime | |

Die Skills `product-strategy`, `pricing-and-unit-economics`, `gdpr-engineering` und `dual-key-identifiers`
gehören zu nicht installierten Plugins (`business`, `saas`, `data`); dort galt die Bereichs-Checkliste.

## Drift
Keine. Es gibt noch keinen Code.

## Open decisions
1. Soll das User-Model samt Tabellen entfernt werden, obwohl es Teil des Laravel-Grundgerüsts ist?
   - Options: A, per ADR in eigenem Commit entfernen; B, vorerst behalten.
   - Trade-offs: B lässt toten Code und Account-Schema im Repo.
   - Recommendation: A, weil die Spec Accounts ausschließt.
   - Answer: A (ADR 0003)
2. Wie hält das Projekt „keine Cookies für Funktionen“ ein?
   - Options: A, Session, CSRF und Cookie-Verschlüsselung aus der web-Gruppe nehmen und per Test absichern; B,
     Session-Cookie behalten.
   - Trade-offs: A weicht vom Laravel-Standard ab, ist aber für zustandslose JSON-Endpunkte ohne Auth unkritisch.
   - Recommendation: A.
   - Answer: A (ADR 0003)
3. Wie läuft die lokale Entwicklung?
   - Options: A, nativ mit `composer dev`; B, Docker Compose.
   - Trade-offs: B zieht ein Stretch-Ziel vor.
   - Recommendation: A.
   - Answer: A (ADR 0003)
4. Soll `laravel/boost` installiert werden?
   - Options: A, ja; B, nein, das Plugin bleibt aktiv (Skill-Abhängigkeit), das Paket fehlt.
   - Trade-offs: B hinterlässt einen nicht startenden MCP-Server.
   - Recommendation: B.
   - Answer: B
5. Welche Zahl mit Termin gilt als Erfolgsmaß?
   - Options: A, keine Zahl, nur der Test- und README-Nachweis; B, eine Zahl, die du nennst.
   - Trade-offs: A ist ehrlich für ein Lernprojekt, B misst Wirkung.
   - Recommendation: A.
6. Wie lautet das Fehlerformat der API?
   - Options: A, ein fester JSON-Body `{"message": "unavailable"}`; B, RFC 9457 Problem Details.
   - Trade-offs: B verrät über `type` und `title` mehr Zustand, wenn man es nicht einheitlich hält.
   - Recommendation: A, weil die Antworten bewusst identisch sind.
7. Welche Argon2id-Bibliothek? ADR 0002 liefert den Vergleich mit Quellen als Vorschlag.
   - Options: wird in ADR 0002 belegt.
   - Trade-offs: berührt Protokoll v1 (Paketwahl). Nichts wird eingebaut, bevor du die ADR freigibst.
   - Recommendation: offen bis zur Recherche.
8. Commits unsigniert und ohne Push?
   - Options: A, unsigniert und ohne Push; B, du richtest SSH-Signing ein.
   - Trade-offs: A weicht vom [default] ab und wird in ADR 0003 begründet.
   - Recommendation: A.
   - Answer: A (ADR 0003)

## First features
- Krypto-Modul (`resources/js/crypto/`) → `feature-planning` Plan nach Freigabe.
- Laravel-API für Secrets → eigener Plan.
