# 0004. Krypto-Modul: Protokolldetails, die die Spec offenließ

Status: Accepted
Date: 2026-11-04
Supersedes: none

## Context
`docs/SPEC.md` (Protokoll v1) legt mehrere Bytedetails nicht fest. Sie sind nach dem ersten gespeicherten Secret
nicht mehr änderbar, weil Links sonst unlesbar würden. Der Plan `docs/plans/2026-11-04-crypto-module.md` stellte
acht Entscheidungen, der Maintainer hat am 2026-11-04 jeweils die empfohlene Option gewählt.

## Decision
1. `pwKey` (Ausgabe von Argon2id) ist 32 Byte lang.
2. Der Header für die AAD wird als feste Binärstruktur kodiert (Version, Längenpräfixe, Felder in fester Reihenfolge).
   Die genauen Bytes stehen in `docs/CRYPTO-NOTES.md` und im Protokoll-Testvektor (Plan, Schritt 0), bevor Code entsteht.
3. Beim Öffnen akzeptiert der Browser nur KDF-Name `argon2id`, Parameter ab der Spec-Untergrenze (m ≥ 19.456 KiB,
   t ≥ 2) bis m ≤ 65.536 KiB und t ≤ 6, und p = 1.
4. Padding: 4-Byte-Länge big-endian, danach Klartext, danach Nullbytes bis zur Bucketgröße (1, 4, 16, 64 KiB, das
   Längenpräfix zählt mit). Beim Entpacken müssen alle Füllbytes 0 sein.
5. Argon2id läuft in einem Web Worker aus einer eigenen Datei vom eigenen Ursprung. Die CSP bleibt unverändert, weil
   `worker-src` auf `script-src 'self'` zurückfällt (MDN, gelesen 2026-11-04). Ein `blob:`- oder Inline-Worker ist
   nicht erlaubt.
6. Die EFF Large Wordlist wird aufgenommen, sobald ihre Lizenz an der Quelle geprüft ist; Namensnennung im README.
7. Passwort: mindestens 10 Unicode-Codepoints vor und nach NFKC, einzelne Surrogate werden abgelehnt.
8. Der Zeichen-Generator nutzt a bis z, A bis Z, 0 bis 9 (62 Zeichen).

## Consequences
- Das Format ist ab dem ersten produktiven Secret fest; eine Änderung braucht eine neue Protokollversion (`v`).
- Die Obergrenzen in 3 schützen vor Speicherabsturz und Zeitbomben durch einen Server, der Parameter manipuliert.
- Binärer Header ist schwerer zu lesen als JSON; dafür gibt es keine Kanonisierungsfallen.
- Offene Grenzen für das README: Laufzeit auf Mobilgeräten ist nicht gemessen; `String.prototype.normalize` hängt
  von der Unicode-Version der Laufzeit ab (Node 24.11.1: Unicode 16.0), seltene Zeichen könnten in anderen Browsern
  einen anderen Schlüssel ergeben (inferred, nicht gemessen); der Argon2-Teil von `@noble/hashes` ist nicht auditiert
  (ADR 0002).

## Sources
- `docs/SPEC.md`, Protokoll v1; `docs/plans/2026-11-04-crypto-module.md`, Abschnitt 19.
- MDN, CSP `worker-src` (Fallback-Reihenfolge), gelesen 2026-11-04.
- NIST SP 800-38D (Eindeutigkeit des IV je Schlüssel), RFC 5869, RFC 9106.
