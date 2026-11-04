// Alle Protokollkonstanten an einer Stelle (docs/CRYPTO-NOTES.md, ADR 0004). Nichts davon darf anderswo
// im Modul als Literal wiederholt werden.

export const VERSION = 1;
export const MAGIC = new Uint8Array([0x46, 0x4d, 0x46]); // ASCII "FMF"
export const KDF_ID_ARGON2ID = 1;
export const KDF_NAME = 'argon2id';

/** Standardparameter beim Erstellen: OWASP-Minimum, siehe docs/SPEC.md (Protokoll v1, Schritt 2). */
export const KDF_DEFAULT = { m: 19456, t: 2, p: 1 } as const;
/** Grenzen beim Öffnen (ADR 0004, Punkt 3): Untergrenze aus der Spec, Obergrenzen gegen Speicher- und Zeitbomben. */
export const KDF_LIMITS = { mMin: 19456, mMax: 65536, tMin: 2, tMax: 6, p: 1 } as const;

export const ID_BYTES = 16;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const KEY_BYTES = 32;
export const TAG_BYTES = 16;
export const LINK_KEY_BYTES = 32;
export const MANAGE_TOKEN_BYTES = 32;
export const HASH_BYTES = 32;
export const HEADER_BYTES = 49;

export const LENGTH_PREFIX_BYTES = 4;
/** Padding-Buckets in Byte (1, 4, 16, 64 KiB). Das Längenpräfix zählt zum Bucket. */
export const BUCKETS = [1024, 4096, 16384, 65536] as const;
export const MAX_PLAINTEXT_BYTES = BUCKETS[BUCKETS.length - 1]! - LENGTH_PREFIX_BYTES;

export const INFO_ENC = 'fmf/v1/enc';
export const INFO_AUTH = 'fmf/v1/auth';

export const MIN_PASSWORD_CODEPOINTS = 10;

/** Passwortgenerator (docs/SPEC.md, Optionen): 5 Wörter bzw. 16 Zeichen aus 62. */
export const PASSPHRASE_WORDS = 5;
export const PASSWORD_CHARS = 16;
export const PASSWORD_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
