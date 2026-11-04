import { argon2id } from '@noble/hashes/argon2.js';
import { describe, expect, it } from 'vitest';
import { CryptoError } from './errors';
import { fromHex, toHex } from './hex';
import { checkParams, defaultDeriver, derivePwKey, deriveOnMainThread, normalizePassword } from './kdf';
import vectors from './vectors/protocol-v1.json';

const rep = (b: number, n: number) => new Uint8Array(n).fill(b);
const code = (fn: () => unknown) => {
    try {
        fn();
    } catch (e) {
        return (e as CryptoError).code;
    }
    return undefined;
};

describe('Argon2id gegen RFC 9106', () => {
    it('§5.3-Vektor direkt gegen die Bibliothek (m=32, t=3, p=4, mit Secret und AD)', () => {
        // Erwartetes Tag aus rfc9106.txt Abschnitt 5.3 gelesen, nicht aus dem Gedächtnis.
        const tag = argon2id(rep(1, 32), rep(2, 16), { t: 3, m: 32, p: 4, dkLen: 32, key: rep(3, 8), personalization: rep(4, 12) });
        expect(toHex(tag)).toBe('0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659');
    });

    it('Produktionsparameter (m=19456, t=2, p=1) stimmen mit dem unabhängig erzeugten Vektor überein', async () => {
        for (const v of vectors.vectors) {
            const key = await derivePwKey(v.inputs.password, fromHex(v.inputs.salt_hex), v.inputs.kdf, deriveOnMainThread);
            expect(toHex(key)).toBe(v.outputs.pw_key_hex);
        }
    });
});

describe('Passwortregeln (ADR 0004, Punkt 7)', () => {
    it('akzeptiert 10 Codepoints und lehnt 9 ab', () => {
        expect(normalizePassword('abcdefghij')).toHaveLength(10);
        expect(code(() => normalizePassword('abcdefghi'))).toBe('InvalidPassword');
    });

    it('zählt Codepoints, nicht UTF-16-Einheiten (Emoji)', () => {
        expect(() => normalizePassword('😀'.repeat(10))).not.toThrow();
        expect(code(() => normalizePassword('😀'.repeat(9)))).toBe('InvalidPassword');
    });

    it('verlangt 10 Codepoints auch VOR der Normalisierung (U+FDFA wird nach NFKC zu 18)', () => {
        expect('ﷺ'.normalize('NFKC').length).toBe(18);
        expect(code(() => normalizePassword('ﷺ'))).toBe('InvalidPassword');
        expect(code(() => normalizePassword('ﬁ'.repeat(5)))).toBe('InvalidPassword');
    });

    it('normalisiert NFKC (volle Breite wird ASCII)', () => {
        expect(new TextDecoder().decode(normalizePassword('ｐａｓｓｗｏｒｄ１２３４'))).toBe('password1234');
    });

    it('lehnt einzelne Surrogate ab statt sie still zu U+FFFD zu machen', () => {
        for (const bad of ['\uD800abcdefghij', 'abcdefghij\uDC00', 'abcde\uD83Dfghij']) {
            expect(code(() => normalizePassword(bad)), JSON.stringify(bad)).toBe('InvalidPassword');
        }
        // gültiges Paar bleibt gültig
        expect(() => normalizePassword('abcdefgh😀😀')).not.toThrow();
    });

    it('lehnt Nicht-Strings ab', () => {
        for (const bad of [undefined, null, 1234567890, ['abcdefghij']]) {
            expect(code(() => normalizePassword(bad))).toBe('InvalidPassword');
        }
    });
});

describe('Parametergrenzen (ADR 0004, Punkt 3)', () => {
    const ok = { m: 19456, t: 2, p: 1 };
    it('akzeptiert die Grenzen', () => {
        for (const p of [ok, { m: 65536, t: 6, p: 1 }, { m: 30000, t: 3, p: 1 }]) {
            expect(() => checkParams(p)).not.toThrow();
        }
    });
    it('lehnt alles außerhalb ab', () => {
        const bad = [
            { ...ok, m: 19455 }, { ...ok, m: 65537 }, { ...ok, t: 1 }, { ...ok, t: 7 }, { ...ok, p: 2 }, { ...ok, p: 0 },
            { ...ok, m: 19456.5 }, { ...ok, m: Number.NaN }, { ...ok, t: '2' as unknown as number },
        ];
        for (const p of bad) {
            expect(code(() => checkParams(p)), JSON.stringify(p)).toBe('KdfParamsOutOfBounds');
        }
    });
});

describe('derivePwKey', () => {
    const salt = rep(5, 16);
    const params = { m: 19456, t: 2, p: 1 };

    it('meldet KdfFailed, wenn die Ableitung wirft (z. B. zu wenig Speicher)', async () => {
        const boom = async () => {
            throw new RangeError('Array buffer allocation failed');
        };
        await expect(derivePwKey('abcdefghij', salt, params, boom)).rejects.toMatchObject({ code: 'KdfFailed' });
    });

    it('meldet KdfFailed bei falscher Ausgabelänge', async () => {
        await expect(derivePwKey('abcdefghij', salt, params, async () => new Uint8Array(16))).rejects.toMatchObject({ code: 'KdfFailed' });
    });

    it('prüft Parameter und Passwort vor der Ableitung', async () => {
        let called = false;
        const spy = async () => {
            called = true;
            return new Uint8Array(32);
        };
        await expect(derivePwKey('kurz', salt, params, spy)).rejects.toMatchObject({ code: 'InvalidPassword' });
        await expect(derivePwKey('abcdefghij', salt, { ...params, m: 8 }, spy)).rejects.toMatchObject({ code: 'KdfParamsOutOfBounds' });
        expect(called).toBe(false);
    });

    it('überschreibt die Passwort-Bytes nach der Ableitung', async () => {
        let seen: Uint8Array | undefined;
        await derivePwKey('abcdefghij', salt, params, async (pw) => {
            seen = pw;
            return new Uint8Array(32);
        });
        expect([...seen!].every((b) => b === 0)).toBe(true);
    });

    it('der Standard-Deriver fällt ohne Worker auf den Hauptthread zurück', async () => {
        expect(typeof Worker).toBe('undefined');
        const key = await defaultDeriver(new TextEncoder().encode('abcdefghij'), salt, params);
        expect(key).toHaveLength(32);
    });
});

describe('deriveOnMainThread', () => {
    it('meldet KdfFailed, wenn die Bibliothek ablehnt', async () => {
        await expect(deriveOnMainThread(rep(1, 12), rep(2, 16), { m: 1, t: 2, p: 1 })).rejects.toMatchObject({ code: 'KdfFailed' });
    });
});
