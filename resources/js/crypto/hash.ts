import { CryptoError } from './errors';

// Warum: SHA-256 (FIPS 180-4) über Web Crypto. Der Server speichert nur SHA-256(K_auth) und SHA-256(manage_token).
export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
    const s = globalThis.crypto?.subtle;
    if (!s) {
        throw new CryptoError('InsecureContext');
    }
    return new Uint8Array(await s.digest('SHA-256', bytes as BufferSource));
}

export function concat(...parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        offset += p.length;
    }
    return out;
}
