import { describe, expect, it } from 'vitest';
import { decode, encode } from './base64url';
import { CryptoError } from './errors';

describe('base64url', () => {
    it('Round-Trip für Längen 1 bis 70', () => {
        for (let n = 1; n <= 70; n++) {
            const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 0xff);
            expect(decode(encode(bytes))).toEqual(bytes);
        }
    });

    it('kodiert ohne Padding im URL-Alphabet (RFC 4648 §5, Beispiel 0xfb 0xff)', () => {
        expect(encode(new Uint8Array([0xfb, 0xff]))).toBe('-_8');
    });

    it('lehnt ungültige Eingaben ab', () => {
        const bad = ['', 'AAAA=', 'AA+A', 'AA/A', 'AA A', 'AAA\n', 'AAAA.', 'AAAA)', 'A', 'AAAAA', 'ÄÄÄÄ'];
        for (const s of bad) {
            expect(() => decode(s), JSON.stringify(s)).toThrow(CryptoError);
        }
        expect(() => decode(undefined)).toThrow(CryptoError);
        expect(() => decode(42)).toThrow(CryptoError);
    });

    it('lehnt Restbits ungleich null ab (43 Zeichen für 32 Byte)', () => {
        const key = new Uint8Array(32).fill(7);
        const ok = encode(key);
        expect(ok).toHaveLength(43);
        expect(decode(ok, 32)).toEqual(key);
        // Letztes Zeichen so ändern, dass nur die 2 ungenutzten Bits abweichen: dekodiert zu denselben Bytes.
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        const last = alphabet.indexOf(ok.at(-1)!);
        const twin = ok.slice(0, -1) + alphabet[(last & ~3) | ((last + 1) & 3)];
        expect(twin).not.toBe(ok);
        expect(() => decode(twin, 32, 'InvalidLink')).toThrow(CryptoError);
    });

    it('prüft die erwartete Länge und meldet den übergebenen Code', () => {
        const s = encode(new Uint8Array(16));
        expect(() => decode(s, 32)).toThrow(CryptoError);
        try {
            decode('!!!!', undefined, 'InvalidLink');
        } catch (e) {
            expect((e as CryptoError).code).toBe('InvalidLink');
        }
    });

    it('verarbeitet 64 KiB ohne Stapelüberlauf', () => {
        const big = Uint8Array.from({ length: 65552 }, (_, i) => i & 0xff);
        expect(decode(encode(big))).toEqual(big);
    });
});
