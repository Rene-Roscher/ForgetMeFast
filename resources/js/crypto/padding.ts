import { BUCKETS, LENGTH_PREFIX_BYTES, MAX_PLAINTEXT_BYTES } from './constants';
import { CryptoError } from './errors';

// Warum: Auffüllen auf feste Größen verbirgt die Länge des Secrets (docs/SPEC.md, Protokoll v1 Schritt 4). Die
// Füllung liegt innerhalb des AEAD, ist also vertraulich und manipulationssicher.
export function bucketFor(length: number): number {
    const bucket = BUCKETS.find((b) => b >= length + LENGTH_PREFIX_BYTES);
    if (bucket === undefined) {
        throw new CryptoError('SecretTooLarge');
    }
    return bucket;
}

export function pad(plain: Uint8Array): Uint8Array {
    if (plain.length === 0) {
        throw new CryptoError('EmptySecret');
    }
    if (plain.length > MAX_PLAINTEXT_BYTES) {
        throw new CryptoError('SecretTooLarge');
    }
    const out = new Uint8Array(bucketFor(plain.length));
    new DataView(out.buffer).setUint32(0, plain.length);
    out.set(plain, LENGTH_PREFIX_BYTES);
    return out;
}

/** Entpackt streng: Bucketgröße, kleinster passender Bucket, Füllbytes null. Fehler nach erfolgreichem AEAD sind DecryptFailed. */
export function unpad(padded: Uint8Array): Uint8Array {
    if (!(BUCKETS as readonly number[]).includes(padded.length)) {
        throw new CryptoError('DecryptFailed');
    }
    const length = new DataView(padded.buffer, padded.byteOffset, padded.byteLength).getUint32(0);
    if (length === 0 || length > MAX_PLAINTEXT_BYTES || bucketFor(length) !== padded.length) {
        throw new CryptoError('DecryptFailed');
    }
    for (let i = LENGTH_PREFIX_BYTES + length; i < padded.length; i++) {
        if (padded[i] !== 0) {
            throw new CryptoError('DecryptFailed');
        }
    }
    return padded.slice(LENGTH_PREFIX_BYTES, LENGTH_PREFIX_BYTES + length);
}
