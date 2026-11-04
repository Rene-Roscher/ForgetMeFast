# 0002. Argon2id-Bibliothek für den Browser

Status: Accepted
Date: 2026-11-04
Supersedes: none

Berührt Protokoll v1 (Wahl der Krypto-Bibliothek). Der Maintainer hat am 2026-11-04 entschieden: genauer prüfen und
`@noble/hashes` nehmen, sofern es keinen ernsten Grund dagegen gibt. Die Nachmessung unten ergab keinen.

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

Laufzeit mit m=19456 KiB, t=2, p=1:
- Node 24.11.1, drei Läufe: `@noble/hashes` 99 bis 104 ms, `hash-wasm` 21 bis 22 ms.
- Chromium 156 (headless, Desktop-CPU), vier Läufe je Bibliothek: `@noble/hashes` 111 ms kalt, danach 94 bis 96 ms;
  `hash-wasm` 28 ms kalt, danach 20 bis 22 ms.
- Mobilgeräte nicht gemessen; dort ist mit deutlich längeren Zeiten zu rechnen (Einschätzung, kein Messwert).

Bundle-Größe (rolldown 1.2.16, IIFE, minifiziert, nur `argon2id` importiert): `@noble/hashes` 13.965 B, gzip 5.550 B;
`hash-wasm` 28.049 B, gzip 11.118 B (WASM inline). Die OpenPGP-Bibliothek nennt in ihrer README unter 7 KB gzip; nicht
nachgemessen.

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
- Laufzeit (rund 100 ms im Desktop-Chromium) und Größe (5,5 kB gzip) sind gemessen und unauffällig.
- Offen: Laufzeit auf einem echten Mobilgerät, KDF-Parameter und Name (`argon2id`) im Header festschreiben.
- Alternative bei Freigabe von `'wasm-unsafe-eval'`: `hash-wasm` (schneller, aber RFC-Vektor mit AD nicht prüfbar,
  Pflege seit 2024-11 ruhend). Das lockert die CSP-Invariante und bräuchte eine eigene ADR.
- Rückfall laut Spec: PBKDF2-SHA-256 ≥ 600.000 Iterationen über Web Crypto, KDF-Name im Header.
- Nicht gegen den RFC-Vektor geprüft: `argon2-browser` und `argon2id` (OpenPGP). Beide sind WASM und bräuchten
  `'wasm-unsafe-eval'`; `argon2-browser` wird seit 2022-04 nicht mehr veröffentlicht. Damit scheiden sie aus.
