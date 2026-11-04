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

## 4. Erklärt für Laien: was passiert, und warum

Das Ziel: Du schickst jemandem ein Geheimnis, und **nur ihr zwei** könnt es lesen. Auch wer den Server betreibt, kann es
nicht. Dafür sorgen mehrere kleine Bausteine, jeder mit einer klaren Aufgabe.

**Zwei Dinge, die zusammen öffnen.** Das Geheimnis wird mit einem Schlüssel gesperrt, der aus zwei Teilen entsteht: dem
**Link-Schlüssel** (steckt im Link hinter dem `#`) und dem **Passwort** (geht auf einem anderen Weg). Wer nur eines davon
hat, kommt nicht weiter. *Quelle: `docs/SPEC.md`, Sicherheitsziele.*

**Warum hinter dem `#`?** Alles, was hinter dem `#` einer Adresse steht, schickt der Browser nicht an den Server. Der
Server sieht also den Link-Schlüssel nie. Das ist in dieser Sitzung nachgeprüft: Der Test lauscht auf alle Anfragen des
Browsers und sucht den Link-Schlüssel danach im Server-Protokoll, in den Logs und in der Datenbank. Er findet ihn nirgends.
*Quelle: MDN "URI fragment" ("The fragment is not sent to the server when the URI is requested"), RFC 3986 §3.5.*

**Argon2id: Passwörter absichtlich teuer machen.** Wer ein Passwort rät, soll dafür viel Rechenzeit und viel Speicher
brauchen. Argon2id verlangt 19 MiB Speicher je Versuch (m=19456, t=2, p=1). Das ist das Mindestmaß, das OWASP nennt, und
kostet dich etwa eine Zehntelsekunde. *Quellen: RFC 9106; OWASP Password Storage Cheat Sheet, gelesen 2026-11-04.*

**HKDF: aus einem Schlüssel zwei machen.** Aus Link-Schlüssel und Passwort entstehen zwei getrennte Schlüssel: einer zum
Verschlüsseln (`K_enc`), einer als "Eintrittskarte" für den Server (`K_auth`). Der Server kennt nur einen Fingerabdruck der
Eintrittskarte und kann daraus den Verschlüsselungs-Schlüssel nicht ableiten. *Quelle: RFC 5869.*

**AES-256-GCM: sperren und Fälschungen bemerken.** Das Geheimnis wird so verschlüsselt, dass jede Änderung am Chiffretext
auffällt. In die Prüfung fließt auch der Kopf (Version, Kennung, Parameter, Salz) ein. Ein Server, der dir schwächere
Einstellungen unterschieben will, fliegt auf. *Quelle: NIST SP 800-38D.*

**Auffüllen: die Länge verbergen.** Ob dein Geheimnis 5 oder 500 Zeichen hat, soll niemand sehen. Alles wird auf 1, 4, 16
oder 64 KiB aufgefüllt, vor dem Verschlüsseln.

**Falsche Versuche zählen, bevor verglichen wird.** Der Server zählt einen Versuch hoch und prüft erst danach, ob die
Eintrittskarte stimmt. Würde er erst prüfen und dann zählen, könnten viele gleichzeitige Anfragen das Limit umgehen. Das ist
mit 50 echten, gleichzeitig startenden Prozessen getestet. Eine naive Fassung ließ 50 statt 3 falsche Versuche durch.

**Was das nicht kann.** Liefert ein manipulierter Server dir bösartiges JavaScript, kann es alles mitlesen. Das ist das
Grundproblem verschlüsselter Webseiten und steht im README unter "Bekannte Grenzen".
