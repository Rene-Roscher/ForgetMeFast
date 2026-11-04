import { INFO_AUTH, INFO_ENC, KEY_BYTES } from './constants';
import { CryptoError } from './errors';

// Warum: HKDF-SHA-256 nach RFC 5869 (https://www.rfc-editor.org/rfc/rfc5869) über Web Crypto. Zwei verschiedene
// info-Labels trennen die Schlüssel (RFC 5869 §3.2: info bindet den Schlüssel an den Verwendungszweck): K_enc
// verschlüsselt, K_auth geht als Proof an den Server. Der Server kennt K_auth, darf daraus aber K_enc nicht
// ableiten können.
const text = new TextEncoder();

function subtle(): SubtleCrypto {
    const s = globalThis.crypto?.subtle;
    if (!s) {
        throw new CryptoError('InsecureContext');
    }
    return s;
}

async function hkdfKey(ikm: Uint8Array): Promise<CryptoKey> {
    return subtle().importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

/** HKDF-Expand-Ausgabe als Bytes. Öffentlich vor allem für die RFC-5869-Testvektoren. */
export async function hkdfBits(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const bits = await subtle().deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
        await hkdfKey(ikm),
        length * 8,
    );
    return new Uint8Array(bits);
}

export interface DerivedKeys {
    /** AES-256-GCM-Schlüssel, nicht exportierbar. */
    kEnc: CryptoKey;
    /** Rohbytes, werden als Proof gesendet. */
    kAuth: Uint8Array;
}

export async function deriveKeys(ikm: Uint8Array, salt: Uint8Array): Promise<DerivedKeys> {
    const key = await hkdfKey(ikm);
    const kEnc = await subtle().deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: text.encode(INFO_ENC) as BufferSource },
        key,
        { name: 'AES-GCM', length: KEY_BYTES * 8 },
        false,
        ['encrypt', 'decrypt'],
    );
    const kAuth = await hkdfBits(ikm, salt, text.encode(INFO_AUTH), KEY_BYTES);
    return { kEnc, kAuth };
}
