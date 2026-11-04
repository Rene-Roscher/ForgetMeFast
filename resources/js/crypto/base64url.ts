import { CryptoError, type CryptoErrorCode } from './errors';

// Warum: RFC 4648 §5 (base64url, ohne Padding). Strikt, damit genau eine Zeichenkette zu einem Byte-Array gehört:
// ein 32-Byte-Schlüssel hat 43 Zeichen und lässt 2 Bit im letzten Zeichen frei. Nicht-null-Restbits würden mehrere
// verschiedene Links auf denselben Schlüssel abbilden (Reviewbefund 11).
const ALPHABET = /^[A-Za-z0-9_-]+$/;

export function encode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Strenge Dekodierung. Abgelehnt werden: leere Eingabe, Padding, Standard-Alphabet, Leerraum und Satzzeichen,
 * unmögliche Längen, Restbits ungleich null, und (mit expectedBytes) jede andere Länge.
 */
export function decode(input: unknown, expectedBytes?: number, code: CryptoErrorCode = 'InvalidPayload'): Uint8Array {
    if (typeof input !== 'string' || input.length === 0 || !ALPHABET.test(input) || input.length % 4 === 1) {
        throw new CryptoError(code);
    }
    let binary: string;
    try {
        binary = atob(input.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
        throw new CryptoError(code);
    }
    const out = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    if (encode(out) !== input || (expectedBytes !== undefined && out.length !== expectedBytes)) {
        throw new CryptoError(code);
    }
    return out;
}
