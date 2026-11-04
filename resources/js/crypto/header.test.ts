import { describe, expect, it } from 'vitest';
import { encode } from './base64url';
import { buildHeader, parseParams } from './header';
import { fromHex, toHex } from './hex';
import vectors from './vectors/protocol-v1.json';

const id = new Uint8Array(16).fill(1);
const salt = new Uint8Array(16).fill(2);
const kdf = { m: 19456, t: 2, p: 1 };
const code = (fn: () => unknown) => {
    try {
        fn();
    } catch (e) {
        return (e as { code?: string }).code;
    }
    return undefined;
};
const wire = () => ({ v: 1, kdf: { name: 'argon2id', m: 19456, t: 2, p: 1 }, salt: encode(salt), max_attempts: 3 });

describe('buildHeader', () => {
    it('ist byte-gleich zum unabhängig erzeugten Vektor', () => {
        for (const v of vectors.vectors) {
            const h = buildHeader(fromHex(v.inputs.id_hex), v.inputs.kdf, fromHex(v.inputs.salt_hex));
            expect(toHex(h)).toBe(v.outputs.header_hex);
            expect(h).toHaveLength(49);
        }
    });

    it('jedes Feld ändert die Bytes (id, m, t, p, salt)', () => {
        const base = toHex(buildHeader(id, kdf, salt));
        const variants = [
            buildHeader(new Uint8Array(16).fill(9), kdf, salt),
            buildHeader(id, { ...kdf, m: 19457 }, salt),
            buildHeader(id, { ...kdf, t: 3 }, salt),
            buildHeader(id, { ...kdf, p: 2 }, salt),
            buildHeader(id, kdf, new Uint8Array(16).fill(9)),
        ].map(toHex);
        for (const v of variants) expect(v).not.toBe(base);
        expect(new Set(variants).size).toBe(variants.length);
    });

    it('lehnt falsche Längen ab', () => {
        expect(code(() => buildHeader(new Uint8Array(15), kdf, salt))).toBe('InvalidPayload');
        expect(code(() => buildHeader(id, kdf, new Uint8Array(17)))).toBe('InvalidPayload');
    });
});

describe('parseParams (Erlaubnisliste beim Öffnen)', () => {
    it('akzeptiert die gültige Antwort', () => {
        const p = parseParams(wire());
        expect(p.kdf).toEqual(kdf);
        expect(p.salt).toEqual(salt);
        expect(p.maxAttempts).toBe(3);
    });

    it('lehnt unbekannte und fehlende Felder ab', () => {
        expect(code(() => parseParams({ ...wire(), extra: 1 }))).toBe('InvalidPayload');
        expect(code(() => parseParams({ ...wire(), kdf: { ...wire().kdf, extra: 1 } }))).toBe('InvalidPayload');
        const { salt: _s, ...noSalt } = wire();
        expect(code(() => parseParams(noSalt))).toBe('InvalidPayload');
        for (const bad of [null, 'x', 1, [], undefined]) expect(code(() => parseParams(bad))).toBe('InvalidPayload');
    });

    it('lehnt andere Version und anderes KDF ab', () => {
        expect(code(() => parseParams({ ...wire(), v: 2 }))).toBe('UnsupportedVersion');
        expect(code(() => parseParams({ ...wire(), kdf: { ...wire().kdf, name: 'pbkdf2' } }))).toBe('UnsupportedVersion');
    });

    it('lehnt Parameter außerhalb der Grenzen ab (Downgrade und Zeitbombe)', () => {
        for (const k of [{ m: 8 }, { m: 70000 }, { t: 1 }, { t: 9 }, { p: 4 }]) {
            expect(code(() => parseParams({ ...wire(), kdf: { ...wire().kdf, ...k } }))).toBe('KdfParamsOutOfBounds');
        }
    });

    it('lehnt schlechte Salts und max_attempts ab', () => {
        expect(code(() => parseParams({ ...wire(), salt: encode(new Uint8Array(15)) }))).toBe('InvalidPayload');
        expect(code(() => parseParams({ ...wire(), salt: 'AAAA=' }))).toBe('InvalidPayload');
        for (const a of [0, 11, 1.5, '3', null]) expect(code(() => parseParams({ ...wire(), max_attempts: a }))).toBe('InvalidPayload');
    });
});
