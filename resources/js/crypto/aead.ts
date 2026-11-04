import { IV_BYTES, TAG_BYTES } from './constants';
import { CryptoError } from './errors';

// Warum: AES-256-GCM nach NIST SP 800-38D mit zufälligem 96-Bit-IV und AAD. Pro Secret entsteht ein frischer Schlüssel
// (frischer K_link und salt), der IV wird also nur einmal je Schlüssel benutzt. Ergebnis ist Chiffretext || Tag
// (so liefert es Web Crypto).
function subtle(): SubtleCrypto {
    const s = globalThis.crypto?.subtle;
    if (!s) {
        throw new CryptoError('InsecureContext');
    }
    return s;
}

export async function encrypt(key: CryptoKey, iv: Uint8Array, aad: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    if (iv.length !== IV_BYTES) {
        throw new CryptoError('InvalidPayload');
    }
    const out = await subtle().encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource, tagLength: TAG_BYTES * 8 },
        key,
        data as BufferSource,
    );
    return new Uint8Array(out);
}

export async function decrypt(key: CryptoKey, iv: Uint8Array, aad: Uint8Array, sealed: Uint8Array): Promise<Uint8Array> {
    if (iv.length !== IV_BYTES || sealed.length < TAG_BYTES) {
        throw new CryptoError('DecryptFailed');
    }
    const api = subtle(); // außerhalb des try: fehlendes Web Crypto ist InsecureContext, nicht DecryptFailed
    try {
        const out = await api.decrypt(
            { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource, tagLength: TAG_BYTES * 8 },
            key,
            sealed as BufferSource,
        );
        return new Uint8Array(out);
    } catch {
        throw new CryptoError('DecryptFailed');
    }
}
