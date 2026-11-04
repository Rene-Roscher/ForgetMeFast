import { describe, expect, it } from 'vitest';
import { CryptoError } from './errors';
import { randomBytes, randomIndex, systemBytes, type ByteSource } from './random';

const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const queue = (...values: number[]): ByteSource => {
    const rest = [...values];
    return (len) => {
        expect(len).toBe(4);
        const v = rest.shift();
        if (v === undefined) throw new Error('Bytequelle leer');
        return u32(v);
    };
};

describe('randomBytes', () => {
    it('liefert die verlangte Länge und unterschiedliche Werte', () => {
        const a = randomBytes(32);
        const b = randomBytes(32);
        expect(a).toHaveLength(32);
        expect(a).not.toEqual(b);
    });

    it('füllt auch Längen über 65536 Byte', () => {
        expect(systemBytes(70000)).toHaveLength(70000);
    });

    it('lehnt eine Quelle mit falscher Länge ab', () => {
        expect(() => randomBytes(8, () => new Uint8Array(4))).toThrow(CryptoError);
    });

    it('meldet InsecureContext ohne Web Crypto', () => {
        const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
        Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
        try {
            expect(() => systemBytes(4)).toThrowError(expect.objectContaining({ code: 'InsecureContext' }));
        } finally {
            Object.defineProperty(globalThis, 'crypto', original);
        }
    });
});

describe('randomIndex (Rejection Sampling)', () => {
    it('verwirft Werte ab dem größten Vielfachen von max (Grenzfall bei 62)', () => {
        const limit = 2 ** 32 - (2 ** 32 % 62);
        expect(2 ** 32 % 62).toBeGreaterThan(0); // 62 teilt 2^32 nicht, also gibt es etwas zu verwerfen
        // limit selbst und limit+1 werden verworfen, limit-1 wird genommen.
        expect(randomIndex(62, queue(limit, limit + 1, 2 ** 32 - 1, limit - 1))).toBe((limit - 1) % 62);
    });

    it('bildet jeden Rest im Bereich [limit-max, limit) genau einmal ab', () => {
        const max = 62;
        const limit = 2 ** 32 - (2 ** 32 % max);
        const counts = new Array<number>(max).fill(0);
        for (let x = limit - max; x < limit; x++) counts[randomIndex(max, queue(x))]!++;
        expect(counts.every((n) => n === 1)).toBe(true);
    });

    it('nimmt bei max=1 immer 0 und akzeptiert 2^32', () => {
        expect(randomIndex(1, queue(123456))).toBe(0);
        expect(randomIndex(2 ** 32, queue(2 ** 32 - 1))).toBe(2 ** 32 - 1);
    });

    it('lehnt ungültige Grenzen ab', () => {
        for (const bad of [0, -1, 1.5, 2 ** 32 + 1, Number.NaN]) {
            expect(() => randomIndex(bad)).toThrow(RangeError);
        }
    });

    it('trifft mit der Systemquelle den Bereich', () => {
        for (let i = 0; i < 200; i++) {
            const n = randomIndex(7776);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThan(7776);
        }
    });
});
