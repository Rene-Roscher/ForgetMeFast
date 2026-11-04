import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './aead';
import { encode } from './base64url';
import { buildHeader } from './header';
import { fromHex, toHex } from './hex';
import { pad, unpad } from './padding';
import vectors from './vectors/protocol-v1.json';

const importKey = (hex: string) => globalThis.crypto.subtle.importKey('raw', fromHex(hex) as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
const text = new TextEncoder();

describe('AES-256-GCM', () => {
    it('erzeugt exakt den Chiffretext des unabhängig erzeugten Vektors', async () => {
        for (const v of vectors.vectors) {
            const key = await importKey(v.outputs.k_enc_hex);
            const sealed = await encrypt(key, fromHex(v.inputs.iv_hex), fromHex(v.outputs.header_hex), pad(text.encode(v.inputs.secret)));
            expect(encode(sealed)).toBe(v.outputs.ciphertext);
            const plain = unpad(await decrypt(key, fromHex(v.inputs.iv_hex), fromHex(v.outputs.header_hex), sealed));
            expect(new TextDecoder().decode(plain)).toBe(v.inputs.secret);
        }
    });

    const v = vectors.vectors[0]!;
    const id = fromHex(v.inputs.id_hex);
    const salt = fromHex(v.inputs.salt_hex);
    const iv = fromHex(v.inputs.iv_hex);
    const kdf = v.inputs.kdf;
    const seal = async () => {
        const key = await importKey(v.outputs.k_enc_hex);
        const aad = buildHeader(id, kdf, salt);
        return { key, aad, sealed: await encrypt(key, iv, aad, pad(text.encode('geheim'))) };
    };

    it('lässt sich mit unverändertem AAD öffnen (Gegenprobe zu den Mutationen)', async () => {
        const { key, aad, sealed } = await seal();
        await expect(decrypt(key, iv, aad, sealed)).resolves.toHaveLength(1024);
    });

    // Reviewbefund 3: AAD-Tests auf AEAD-Ebene. Gleicher, richtiger Schlüssel, nur das AAD wird verändert. So
    // zeigt jeder Fall, dass genau dieses Feld im AAD steckt, und nicht, dass die Ableitung anders ausfiel.
    const mutations: [string, () => Uint8Array][] = [
        ['v', () => { const a = buildHeader(id, kdf, salt); a[3] = 2; return a; }],
        ['id', () => buildHeader(new Uint8Array(16).fill(0xee), kdf, salt)],
        ['kdf-id', () => { const a = buildHeader(id, kdf, salt); a[20] = 2; return a; }],
        ['m', () => buildHeader(id, { ...kdf, m: kdf.m + 1 }, salt)],
        ['t', () => buildHeader(id, { ...kdf, t: kdf.t + 1 }, salt)],
        ['p', () => buildHeader(id, { ...kdf, p: kdf.p + 1 }, salt)],
        ['salt', () => buildHeader(id, kdf, new Uint8Array(16).fill(0xee))],
    ];
    for (const [name, make] of mutations) {
        it(`ein verändertes AAD-Feld "${name}" lässt das Entschlüsseln mit DecryptFailed scheitern`, async () => {
            const { key, sealed } = await seal();
            await expect(decrypt(key, iv, make(), sealed)).rejects.toMatchObject({ code: 'DecryptFailed' });
        });
    }

    it('ein geflipptes Bit in Chiffretext, Tag oder IV scheitert mit DecryptFailed', async () => {
        const { key, aad, sealed } = await seal();
        for (const index of [0, 500, sealed.length - 16, sealed.length - 1]) {
            const bad = sealed.slice();
            bad[index]! ^= 1;
            await expect(decrypt(key, iv, aad, bad)).rejects.toMatchObject({ code: 'DecryptFailed' });
        }
        const badIv = iv.slice();
        badIv[0]! ^= 1;
        await expect(decrypt(key, badIv, aad, sealed)).rejects.toMatchObject({ code: 'DecryptFailed' });
    });

    it('ein falscher Schlüssel scheitert mit DecryptFailed', async () => {
        const { aad, sealed } = await seal();
        const other = await importKey('00'.repeat(32));
        await expect(decrypt(other, iv, aad, sealed)).rejects.toMatchObject({ code: 'DecryptFailed' });
    });

    it('lehnt falsche IV-Längen und zu kurze Eingaben ab', async () => {
        const { key, aad, sealed } = await seal();
        await expect(encrypt(key, new Uint8Array(11), aad, new Uint8Array(4))).rejects.toMatchObject({ code: 'InvalidPayload' });
        await expect(decrypt(key, new Uint8Array(11), aad, sealed)).rejects.toMatchObject({ code: 'DecryptFailed' });
        await expect(decrypt(key, iv, aad, new Uint8Array(15))).rejects.toMatchObject({ code: 'DecryptFailed' });
        expect(toHex(sealed).length).toBeGreaterThan(0);
    });
});

describe('ohne Web Crypto (HTTP statt HTTPS)', () => {
    it('meldet InsecureContext', async () => {
        const key = await importKey('00'.repeat(32));
        const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
        Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
        try {
            await expect(encrypt(key, new Uint8Array(12), new Uint8Array(0), new Uint8Array(4))).rejects.toMatchObject({ code: 'InsecureContext' });
            await expect(decrypt(key, new Uint8Array(12), new Uint8Array(0), new Uint8Array(32))).rejects.toMatchObject({ code: 'InsecureContext' });
        } finally {
            Object.defineProperty(globalThis, 'crypto', original);
        }
    });
});
