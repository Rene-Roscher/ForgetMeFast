import { describe, expect, it } from 'vitest';
import { fromHex, toHex } from './hex';
import { deriveKeys, hkdfBits } from './hkdf';
import vectors from './vectors/protocol-v1.json';

// RFC 5869 Anhang A, Fälle 1 bis 3 (SHA-256). Werte aus dem RFC-Text gelesen (2026-11-04).
const RFC5869 = [
    {
        name: 'A.1',
        ikm: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
        salt: '000102030405060708090a0b0c',
        info: 'f0f1f2f3f4f5f6f7f8f9',
        len: 42,
        okm: '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
    },
    {
        name: 'A.2',
        ikm: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f',
        salt: '606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeaf',
        info: 'b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
        len: 82,
        okm: 'b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c59045a99cac7827271cb41c65e590e09da3275600c2f09b8367793a9aca3db71cc30c58179ec3e87c14c01d5c1f3434f1d87',
    },
    {
        name: 'A.3',
        ikm: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
        salt: '',
        info: '',
        len: 42,
        okm: '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8',
    },
];

describe('HKDF-SHA-256 (RFC 5869)', () => {
    for (const c of RFC5869) {
        it(`Testfall ${c.name}`, async () => {
            const okm = await hkdfBits(fromHex(c.ikm), fromHex(c.salt), fromHex(c.info), c.len);
            expect(toHex(okm)).toBe(c.okm);
        });
    }
});

describe('deriveKeys', () => {
    const ikm = new Uint8Array(64).fill(9);
    const salt = new Uint8Array(16).fill(3);

    it('trennt K_enc und K_auth über die info-Labels', async () => {
        const text = new TextEncoder();
        const enc = await hkdfBits(ikm, salt, text.encode('fmf/v1/enc'), 32);
        const auth = await hkdfBits(ikm, salt, text.encode('fmf/v1/auth'), 32);
        expect(toHex(enc)).not.toBe(toHex(auth));
        const { kAuth } = await deriveKeys(ikm, salt);
        expect(toHex(kAuth)).toBe(toHex(auth));
    });

    it('liefert K_enc als nicht exportierbaren AES-GCM-Schlüssel', async () => {
        const { kEnc } = await deriveKeys(ikm, salt);
        expect(kEnc.extractable).toBe(false);
        expect(kEnc.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
        await expect(globalThis.crypto.subtle.exportKey('raw', kEnc)).rejects.toThrow();
    });

    it('stimmt mit dem unabhängig erzeugten Protokollvektor überein (K_auth)', async () => {
        for (const v of vectors.vectors) {
            const ikm2 = fromHex(v.inputs.k_link_hex + v.outputs.pw_key_hex);
            const { kAuth } = await deriveKeys(ikm2, fromHex(v.inputs.salt_hex));
            expect(toHex(kAuth)).toBe(v.outputs.k_auth_hex);
        }
    });

    it('ein anderer Salt oder anderes IKM liefert andere Schlüssel', async () => {
        const a = await deriveKeys(ikm, salt);
        const b = await deriveKeys(ikm, new Uint8Array(16).fill(4));
        const c = await deriveKeys(new Uint8Array(64).fill(8), salt);
        expect(toHex(a.kAuth)).not.toBe(toHex(b.kAuth));
        expect(toHex(a.kAuth)).not.toBe(toHex(c.kAuth));
    });
});

describe('ohne Web Crypto (HTTP statt HTTPS)', () => {
    it('meldet InsecureContext', async () => {
        const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
        Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
        try {
            await expect(deriveKeys(new Uint8Array(64), new Uint8Array(16))).rejects.toMatchObject({ code: 'InsecureContext' });
            await expect(hkdfBits(new Uint8Array(4), new Uint8Array(0), new Uint8Array(0), 8)).rejects.toMatchObject({ code: 'InsecureContext' });
        } finally {
            Object.defineProperty(globalThis, 'crypto', original);
        }
    });
});
