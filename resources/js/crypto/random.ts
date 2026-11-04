import { CryptoError } from './errors';

/** Quelle für Zufallsbytes. Standard ist crypto.getRandomValues; Tests speisen eine deterministische Quelle ein. */
export type ByteSource = (length: number) => Uint8Array;

// Warum: W3C Web Cryptography, Crypto.getRandomValues (CSPRNG). Math.random ist im Modul verboten (Test in
// static-scan.test.ts).
export const systemBytes: ByteSource = (length) => {
    const c = globalThis.crypto;
    if (!c || typeof c.getRandomValues !== 'function') {
        throw new CryptoError('InsecureContext');
    }
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 65536) {
        c.getRandomValues(out.subarray(i, i + 65536));
    }
    return out;
};

export function randomBytes(length: number, source: ByteSource = systemBytes): Uint8Array {
    const out = source(length);
    if (out.length !== length) {
        throw new CryptoError('InvalidPayload');
    }
    return out;
}

const TWO_32 = 2 ** 32;

/**
 * Gleichverteilte Ganzzahl in [0, max) per Rejection Sampling: Werte ab dem größten Vielfachen von max unterhalb
 * von 2^32 werden verworfen, damit kein Modulo-Bias entsteht.
 */
export function randomIndex(max: number, source: ByteSource = systemBytes): number {
    if (!Number.isInteger(max) || max < 1 || max > TWO_32) {
        throw new RangeError('max out of range');
    }
    const limit = TWO_32 - (TWO_32 % max);
    for (;;) {
        const b = randomBytes(4, source);
        const x = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
        if (x < limit) {
            return x % max;
        }
    }
}
