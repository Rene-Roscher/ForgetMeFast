import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PASSWORD_ALPHABET } from './constants';
import { EFF_LARGE_WORDLIST } from './eff-large-wordlist';
import { estimateBits, generatedBits, randomChars, randomPassphrase } from './generator';
import type { ByteSource } from './random';

const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const queue = (...values: number[]): ByteSource => {
    const rest = [...values];
    return () => {
        const v = rest.shift();
        if (v === undefined) throw new Error('Bytequelle leer');
        return u32(v);
    };
};

describe('EFF Large Wordlist', () => {
    it('hat 7.776 eindeutige Wörter im erwarteten Format', () => {
        expect(EFF_LARGE_WORDLIST).toHaveLength(7776);
        expect(new Set(EFF_LARGE_WORDLIST).size).toBe(7776);
        expect(EFF_LARGE_WORDLIST.every((w) => /^[a-z]+(-[a-z]+)?$/.test(w))).toBe(true);
    });

    it('stimmt mit der Prüfsumme aus dem Dateikopf überein (Datei unverändert)', () => {
        const sum = createHash('sha256').update(EFF_LARGE_WORDLIST.join('\n') + '\n').digest('hex');
        expect(sum).toBe('6d557f0693958fb5e650b68b5bee585eb82cf4da32965505c789e924743bc522');
    });
});

describe('randomChars', () => {
    it('bildet jeden Index 0 bis 61 auf genau ein Zeichen des Alphabets ab', () => {
        const out = randomChars(62, queue(...Array.from({ length: 62 }, (_, i) => i)));
        expect(out).toBe(PASSWORD_ALPHABET);
    });

    it('verwirft Werte im Bias-Bereich (Grenzfall bei 62 Zeichen)', () => {
        const limit = 2 ** 32 - (2 ** 32 % 62);
        expect(randomChars(1, queue(limit, 2 ** 32 - 1, 5))).toBe(PASSWORD_ALPHABET[5]);
    });

    it('liefert 16 Zeichen aus dem Alphabet mit der Systemquelle', () => {
        const pw = randomChars();
        expect(pw).toHaveLength(16);
        expect([...pw].every((c) => PASSWORD_ALPHABET.includes(c))).toBe(true);
        expect(randomChars()).not.toBe(pw);
    });
});

describe('randomPassphrase', () => {
    it('zieht die Wörter an den erwarteten Indizes, auch an den Rändern', () => {
        const pw = randomPassphrase(EFF_LARGE_WORDLIST, 5, queue(0, 7775, 1, 4000, 7774));
        expect(pw).toBe([0, 7775, 1, 4000, 7774].map((i) => EFF_LARGE_WORDLIST[i]).join('-'));
    });

    it('verwirft Werte im Bias-Bereich bei 7.776 Wörtern', () => {
        const limit = 2 ** 32 - (2 ** 32 % 7776);
        expect(randomPassphrase(EFF_LARGE_WORDLIST, 1, queue(limit, 2 ** 32 - 1, 3))).toBe(EFF_LARGE_WORDLIST[3]);
    });

    it('nimmt fünf Wörter mit der Systemquelle', () => {
        expect(randomPassphrase(EFF_LARGE_WORDLIST).split('-').length).toBeGreaterThanOrEqual(5);
    });
});

describe('Entropie', () => {
    it('exakte Werte für generierte Passwörter', () => {
        expect(generatedBits(7776, 5)).toBeCloseTo(64.624, 3);
        expect(generatedBits(62, 16)).toBeCloseTo(95.267, 3);
    });

    it('Schätzung für getippte Passwörter (Länge × log2 Zeichenvorrat)', () => {
        expect(estimateBits('')).toBe(0);
        expect(estimateBits('abcdefghij')).toBeCloseTo(10 * Math.log2(26), 6);
        expect(estimateBits('Abcdefghi1')).toBeCloseTo(10 * Math.log2(62), 6);
        expect(estimateBits('Abcdefgh1!')).toBeCloseTo(10 * Math.log2(95), 6);
        expect(estimateBits('äöüäöüäöüä')).toBeCloseTo(10 * Math.log2(100), 6); // nur Nicht-ASCII: Pool 100
        expect(estimateBits('😀'.repeat(10))).toBeGreaterThan(0);
    });
});
