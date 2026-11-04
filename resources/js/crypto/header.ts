import { decode } from './base64url';
import {
    HEADER_BYTES, ID_BYTES, KDF_ID_ARGON2ID, KDF_LIMITS, KDF_NAME, MAGIC, SALT_BYTES, VERSION,
} from './constants';
import { CryptoError } from './errors';
import { checkParams, type KdfParams } from './kdf';

// Warum: AAD nach NIST SP 800-38D (zusätzliche authentifizierte Daten). Der Header bindet Version, id, KDF und salt
// an den Chiffretext, damit ein Austausch oder ein Downgrade der Parameter beim Entschlüsseln auffällt. Binäre
// Festbreite statt JSON: keine Kanonisierungsfallen (ADR 0004, Punkt 2; Bytes in docs/CRYPTO-NOTES.md).
export function buildHeader(id: Uint8Array, kdf: KdfParams, salt: Uint8Array): Uint8Array {
    if (id.length !== ID_BYTES || salt.length !== SALT_BYTES) {
        throw new CryptoError('InvalidPayload');
    }
    const out = new Uint8Array(HEADER_BYTES);
    const view = new DataView(out.buffer);
    out.set(MAGIC, 0);
    out[3] = VERSION;
    out.set(id, 4);
    out[20] = KDF_ID_ARGON2ID;
    view.setUint32(21, kdf.m);
    view.setUint32(25, kdf.t);
    view.setUint32(29, kdf.p);
    out.set(salt, 33);
    return out;
}

export interface ParsedParams {
    kdf: KdfParams;
    salt: Uint8Array;
    maxAttempts: number;
}

const WIRE_KEYS = ['kdf', 'max_attempts', 'salt', 'v'];
const KDF_KEYS = ['m', 'name', 'p', 't'];
const sameKeys = (o: object, keys: string[]): boolean => JSON.stringify(Object.keys(o).sort()) === JSON.stringify(keys);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Strenge Prüfung der Antwort von GET /api/secrets/{id}/params (docs/CRYPTO-NOTES.md, Abschnitt 2). */
export function parseParams(raw: unknown): ParsedParams {
    if (!isRecord(raw) || !sameKeys(raw, WIRE_KEYS) || !isRecord(raw.kdf) || !sameKeys(raw.kdf, KDF_KEYS)) {
        throw new CryptoError('InvalidPayload');
    }
    if (raw.v !== VERSION || raw.kdf.name !== KDF_NAME) {
        throw new CryptoError('UnsupportedVersion');
    }
    const kdf = { m: raw.kdf.m, t: raw.kdf.t, p: raw.kdf.p } as KdfParams;
    checkParams(kdf);
    const attempts = raw.max_attempts;
    if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
        throw new CryptoError('InvalidPayload');
    }
    return { kdf, salt: decode(raw.salt, SALT_BYTES), maxAttempts: attempts };
}

export { KDF_LIMITS };
