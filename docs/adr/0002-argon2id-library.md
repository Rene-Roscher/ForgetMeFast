# 0002. Argon2id-Bibliothek für den Browser

Status: Proposed
Date: 2026-11-04
Supersedes: none

Dieser Vorschlag berührt Protokoll v1 (Wahl der Krypto-Bibliothek). Er wird erst `Accepted`, wenn der
Maintainer ihn freigibt. Bis dahin wird keine Argon2id-Bibliothek eingebaut.

## Context
Protokoll v1 verlangt Argon2id im Browser mit mindestens m=19 MiB, t=2, p=1 (`docs/SPEC.md`, OWASP). Die Web Crypto
API bietet kein Argon2. Die CSP ist strikt (`script-src 'self'`); Fallback laut Spec ist PBKDF2-SHA-256 mit
mindestens 600.000 Iterationen. Verglichen wurden vier npm-Pakete.

## Befunde (Stand 2026-11-04)
| | `@noble/hashes` 2.4.0 | `hash-wasm` 4.12.0 | `argon2-browser` 1.18.0 | `argon2id` 1.0.1 (OpenPGP.js) |
|---|---|---|---|---|
| Lizenz (npm) | MIT | MIT (LICENSE-Datei: MIT, GitHub meldet NOASSERTION) | MIT | MIT |
| Letzte Änderung (npm) | 2026-08-27 | 2024-11-19 | 2022-04-11 | 2023-08-03 |
| Letzter Push (GitHub) | 2026-09-08 | 2024-11-19 | 2023-03-24 | 2023-08-03 |
| Laufzeit-Abhängigkeiten | keine | keine | keine | keine |
| Technik | reines JavaScript | WASM | WASM | WASM |
| Braucht `'wasm-unsafe-eval'` in der CSP | nein | ja | ja | ja |
| RFC 9106 §5.3 Vektor | **stimmt überein** (hier gemessen) | nicht prüfbar: API hat keine Eingabe für Associated Data | nicht geprüft | nicht geprüft: Modul lädt in Node nur mit WASM-Loader |
| Audit | Cure53 2022 für v1.0.0, **Argon2 ausdrücklich nicht im Umfang** | keine Angabe gefunden | keine Angabe gefunden | keine Angabe gefunden |

Laufzeit mit m=19456 KiB, t=2, p=1 in Node 24.11.1, drei Läufe: `@noble/hashes` 99 bis 104 ms, `hash-wasm` 21 bis 22 ms.
**Im Browser nicht gemessen.** Die Messung gehört in die Umsetzung (Playwright, echter Chromium).

Quellen (alle am 2026-11-04 gelesen):
- npm-Registry (`npm view <paket>`), GitHub-API (`repos/<repo>`), READMEs der vier Projekte.
- `@noble/hashes` README, Abschnitt Security: Audit-Umfang ohne `argon2`; Abschnitt argon2: „Argon2 can't be fast in JS“.
- MDN, CSP `script-src`: Ohne `'wasm-unsafe-eval'` blockiert die CSP WebAssembly
  (https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).
- RFC 9106 §5.3 Argon2id-Testvektor (https://www.rfc-editor.org/rfc/rfc9106.html). Der erwartete Tag
  `0d640df5…e659` wurde aus dem RFC-Text gelesen, nicht aus dem Gedächtnis.
- `hash-wasm` `dist/lib/argon2.d.ts` (Optionen: kein `associatedData`).

## Decision (Vorschlag)
`@noble/hashes` (Import `@noble/hashes/argon2.js`), exakt versioniert im Lockfile, mit den Parametern aus der Spec.

Gründe: stimmt mit dem RFC-Vektor überein, keine CSP-Lockerung nötig (die Invariante „strikte CSP“ bleibt
unverändert), aktiv gepflegt, MIT, keine Abhängigkeiten, ausreichend schnell in Node (rund 100 ms).

## Consequences
- Die Argon2-Implementierung ist **nicht auditiert** (Cure53-Umfang schließt sie aus). Das gehört wörtlich ins README
  unter „Bekannte Grenzen“.
- Reines JS hat keine garantierte Konstantzeit (laut Projekt-README nur „algorithmic constant time“). Hier unkritisch,
  weil die Ableitung im eigenen Browser des Nutzers läuft und der Angreifer keine Zeitmessung daran hat. Das ist eine
  Einschätzung, kein Beleg.
- Offen vor der Umsetzung: Laufzeit im Browser messen, Bundle-Größe nach dem Tree-Shaking messen, KDF-Parameter
  und Name (`argon2id`) im Header festschreiben.
- Alternative bei Freigabe von `'wasm-unsafe-eval'`: `hash-wasm` (schneller, aber RFC-Vektor mit AD nicht prüfbar,
  Pflege seit 2024-11 ruhend). Das lockert die CSP-Invariante und bräuchte eine eigene ADR.
- Rückfall laut Spec: PBKDF2-SHA-256 ≥ 600.000 Iterationen über Web Crypto, KDF-Name im Header.
- Nicht geprüft: `argon2-browser` und `argon2id` (OpenPGP) gegen den RFC-Vektor.
