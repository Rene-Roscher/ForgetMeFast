# Krypto-Notizen zu Protokoll v1

Dieses Dokument legt die Bytes fest, die `docs/SPEC.md` offenließ. Grundlage sind ADR 0002 (Argon2id-Bibliothek) und
ADR 0004 (Protokolldetails). Der Testvektor `resources/js/crypto/vectors/protocol-v1.json` stammt aus
`scripts/gen-protocol-vector.mjs`, das nur `node:crypto` benutzt und kein Modul aus `resources/js/crypto/`. Eine
zweite Argon2id-Implementierung (OpenSSL über Node) reproduziert den RFC-9106-Vektor aus §5.3 (geprüft 2026-11-04).

## 1. Bytefolgen

Alle Zahlen sind unsigned und Big-Endian. Binärfelder gehen über die Leitung als base64url ohne Padding.

**Header (zugleich AAD), 49 Byte, feste Breite, keine Längenpräfixe nötig:**

| Offset | Länge | Feld |
|---|---|---|
| 0 | 3 | ASCII `FMF` |
| 3 | 1 | Version `v` (hier `0x01`) |
| 4 | 16 | `id` |
| 20 | 1 | KDF-Kennung (`0x01` = `argon2id`) |
| 21 | 4 | `m` in KiB |
| 25 | 4 | `t` |
| 29 | 4 | `p` |
| 33 | 16 | `salt` |

Der Server speichert `v`, KDF-Name und Parameter sowie `salt` als eigene Felder und liefert sie über
`GET /api/secrets/{id}/params`. Der Browser baut daraus die 49 Byte neu. Die `id` nimmt er aus der URL, nie aus der
Antwort des Servers.

**Schlüsselableitung:**

1. `pw` = NFKC(Passwort) als UTF-8.
2. `pwKey` = Argon2id(`pw`, `salt`, m, t, p) mit 32 Byte Ausgabe. Ohne Secret und ohne Associated Data.
3. `ikm` = `K_link` (32 Byte) ‖ `pwKey` (32 Byte), also 64 Byte.
4. `K_enc` = HKDF-SHA-256(`ikm`, Salt = `salt`, Info = `fmf/v1/enc`, 32 Byte).
5. `K_auth` = HKDF-SHA-256(`ikm`, Salt = `salt`, Info = `fmf/v1/auth`, 32 Byte).

**Verifier und Verwaltung:** `verifier` = SHA-256(`K_auth`), gehasht über die 32 Bytes, nicht über den base64url-Text.
`proof` = base64url(`K_auth`). `manage_token` = 32 Zufallsbytes, `manage_hash` = SHA-256 über die Bytes des Tokens.

**Auffüllen:** Nutzdaten = `u32(len)` ‖ Klartext ‖ Nullbytes bis zur kleinsten Bucketgröße aus 1024, 4096, 16384, 65536
Byte, die `len + 4` aufnimmt. Höchste Klartextlänge 65.532 Byte. Beim Entpacken müssen alle Füllbytes 0 sein.

**Verschlüsselung:** AES-256-GCM, IV 12 zufällige Byte, AAD = Header, Tag 16 Byte. Das Feld `ciphertext` ist
Chiffretext ‖ Tag, also Bucketgröße + 16 Byte.

**Link:** `/s/{base64url(id)}#{base64url(K_link)}`.

## 2. Erlaubnisliste beim Öffnen

Der Browser leitet nur ab, wenn die Antwort von `/params` genau diese Felder hat: `v` = 1, `kdf.name` = `argon2id`,
`kdf.m` 19.456 bis 65.536, `kdf.t` 2 bis 6, `kdf.p` = 1, `salt` = 16 Byte, dazu `max_attempts`. Unbekannte Felder
werden abgelehnt. Begründung: ADR 0004, Punkt 3.

## 3. Quellen
- RFC 5869 (HKDF), RFC 9106 (Argon2), NIST SP 800-38D (GCM), W3C Web Cryptography API.
- Testvektor und Erzeuger: siehe oben.
