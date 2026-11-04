import { describe, expect, it } from 'vitest';
import { decode, encode } from './base64url';
import { CryptoError } from './errors';
import { fromHex, toHex } from './hex';
import { sha256 } from './hash';
import { deriveOnMainThread } from './kdf';
import { createSecret, prepareOpen, type Settings } from './protocol';
import type { ByteSource } from './random';
import vectors from './vectors/protocol-v1.json';

const settings: Settings = { ttl: 3600, maxViews: 1, maxAttempts: 3 };
const opts = { deriver: deriveOnMainThread };
const code = async (p: Promise<unknown>) => {
    try {
        await p;
    } catch (e) {
        return e instanceof CryptoError ? e.code : `other:${String(e)}`;
    }
    return undefined;
};

/** Bytequelle, die der Reihe nach die festen Eingaben des Vektors liefert (id, K_link, salt, iv, manage_token). */
const fixed = (v: (typeof vectors.vectors)[number]): ByteSource => {
    const queue = [v.inputs.id_hex, v.inputs.k_link_hex, v.inputs.salt_hex, v.inputs.iv_hex, v.inputs.manage_token_hex].map(fromHex);
    return (length) => {
        const next = queue.shift();
        if (!next || next.length !== length) throw new Error('Reihenfolge der Ziehungen weicht ab');
        return next;
    };
};

/** Simuliert den Server: gibt die Params-Antwort und prüft den Proof gegen den Verifier. */
const server = (body: Awaited<ReturnType<typeof createSecret>>['body']) => ({
    params: { v: body.v, kdf: body.kdf, salt: body.salt, max_attempts: body.max_attempts },
    accepts: async (proof: string) => encode(await sha256(decode(proof, 32))) === body.verifier,
    open: { iv: body.iv, ciphertext: body.ciphertext },
});

describe('createSecret gegen den unabhängig erzeugten Protokollvektor', () => {
    for (const v of vectors.vectors) {
        it(`erzeugt für "${v.name}" exakt die Vektor-Ausgabe`, async () => {
            const created = await createSecret({ secret: v.inputs.secret, password: v.inputs.password, settings }, { ...opts, random: fixed(v) });
            expect(created.body.id).toBe(encode(fromHex(v.inputs.id_hex)));
            expect(created.body.salt).toBe(encode(fromHex(v.inputs.salt_hex)));
            expect(created.body.iv).toBe(encode(fromHex(v.inputs.iv_hex)));
            expect(created.body.ciphertext).toBe(v.outputs.ciphertext);
            expect(created.body.verifier).toBe(v.outputs.verifier);
            expect(created.body.manage_hash).toBe(v.outputs.manage_hash);
            expect(created.linkKey).toBe(v.outputs.link_fragment);
            expect(created.manageToken).toBe(encode(fromHex(v.inputs.manage_token_hex)));
            expect(created.body.kdf).toEqual({ name: 'argon2id', ...v.inputs.kdf });
        });
    }
});

describe('Round-Trip über createSecret, Server-Simulation, prepareOpen und finish', () => {
    it('liefert den Klartext (Umlaute, Emoji)', async () => {
        const secret = 'Zugang: pässwörd 🔐 ключ';
        const { body, linkKey } = await createSecret({ secret, password: 'correct horse battery staple', settings }, opts);
        const s = server(body);
        const open = await prepareOpen({ id: body.id, linkKey, password: 'correct horse battery staple', params: s.params }, opts);
        expect(open.maxAttempts).toBe(3);
        expect(await s.accepts(open.proof)).toBe(true);
        expect(await open.finish(s.open)).toBe(secret);
    });

    it('ein NFKC-Variante des Passworts öffnet dasselbe Secret', async () => {
        const { body, linkKey } = await createSecret({ secret: 'x', password: 'password1234', settings }, opts);
        const s = server(body);
        const open = await prepareOpen({ id: body.id, linkKey, password: 'ｐａｓｓｗｏｒｄ１２３４', params: s.params }, opts);
        expect(await s.accepts(open.proof)).toBe(true);
        expect(await open.finish(s.open)).toBe('x');
    });

    it('Größen an den Grenzen: 1 Byte und 65.532 Byte', async () => {
        for (const n of [1, 65532]) {
            const secret = 'a'.repeat(n);
            const { body, linkKey } = await createSecret({ secret, password: 'abcdefghij', settings }, opts);
            const s = server(body);
            const open = await prepareOpen({ id: body.id, linkKey, password: 'abcdefghij', params: s.params }, opts);
            expect(await open.finish(s.open)).toBe(secret);
        }
    });
});

describe('falsches Passwort, falscher Link-Key, untergeschobene id', () => {
    const make = async () => {
        const created = await createSecret({ secret: 'geheim', password: 'right-password', settings }, opts);
        return { ...created, s: server(created.body) };
    };

    it('ein falsches Passwort ergibt einen Proof, den der Server ablehnt; finish gibt trotzdem nichts frei', async () => {
        const { body, linkKey, s } = await make();
        const open = await prepareOpen({ id: body.id, linkKey, password: 'wrong-password', params: s.params }, opts);
        expect(await s.accepts(open.proof)).toBe(false);
        expect(await code(open.finish(s.open))).toBe('DecryptFailed');
    });

    it('ein falscher Link-Key wird vom Server abgelehnt', async () => {
        const { body, s } = await make();
        const open = await prepareOpen({ id: body.id, linkKey: encode(new Uint8Array(32).fill(1)), password: 'right-password', params: s.params }, opts);
        expect(await s.accepts(open.proof)).toBe(false);
        expect(await code(open.finish(s.open))).toBe('DecryptFailed');
    });

    it('eine andere id (z. B. aus einer manipulierten /params-Antwort) scheitert in finish', async () => {
        const { linkKey, s } = await make();
        const open = await prepareOpen({ id: encode(new Uint8Array(16).fill(7)), linkKey, password: 'right-password', params: s.params }, opts);
        expect(await s.accepts(open.proof)).toBe(true); // Proof hängt nicht an der id
        expect(await code(open.finish(s.open))).toBe('DecryptFailed'); // aber die AAD tut es
    });

    it('manipulierte Antwortfelder scheitern mit DecryptFailed bzw. InvalidPayload', async () => {
        const { body, linkKey, s } = await make();
        const open = await prepareOpen({ id: body.id, linkKey, password: 'right-password', params: s.params }, opts);
        const flip = (b64: string, at: number) => {
            const b = decode(b64);
            b[at]! ^= 1;
            return encode(b);
        };
        expect(await code(open.finish({ ...s.open, ciphertext: flip(s.open.ciphertext, 10) }))).toBe('DecryptFailed');
        expect(await code(open.finish({ ...s.open, iv: flip(s.open.iv, 0) }))).toBe('DecryptFailed');
        expect(await code(open.finish({ ...s.open, ciphertext: encode(new Uint8Array(100)) }))).toBe('InvalidPayload');
        expect(await code(open.finish({ ...s.open, iv: encode(new Uint8Array(11)) }))).toBe('InvalidPayload');
        expect(await code(open.finish({ iv: 'x', ciphertext: 'y' }))).toBe('InvalidPayload');
        expect(await code(open.finish(undefined as never))).toBe('InvalidPayload');
    });

    it('geänderte KDF-Parameter oder ein anderer Salt in /params ergeben einen anderen Schlüssel', async () => {
        const { body, linkKey, s } = await make();
        for (const params of [
            { ...s.params, kdf: { ...s.params.kdf, t: 3 } },
            { ...s.params, salt: encode(new Uint8Array(16).fill(9)) },
        ]) {
            const open = await prepareOpen({ id: body.id, linkKey, password: 'right-password', params }, opts);
            expect(await s.accepts(open.proof)).toBe(false);
            expect(await code(open.finish(s.open))).toBe('DecryptFailed');
        }
    });

    it('ungültiger UTF-8-Klartext nach gültigem AEAD wird als DecryptFailed gemeldet', async () => {
        const { body, linkKey, s } = await make();
        const { derivePwKey } = await import('./kdf');
        const { deriveKeys } = await import('./hkdf');
        const { concat } = await import('./hash');
        const { buildHeader } = await import('./header');
        const { encrypt } = await import('./aead');
        const { pad } = await import('./padding');
        const salt = decode(body.salt, 16);
        const pwKey = await derivePwKey('right-password', salt, body.kdf, deriveOnMainThread);
        const { kEnc } = await deriveKeys(concat(decode(linkKey, 32), pwKey), salt);
        const iv = decode(body.iv, 12);
        const sealed = await encrypt(kEnc, iv, buildHeader(decode(body.id, 16), body.kdf, salt), pad(new Uint8Array([0xff, 0xfe, 0xfd])));
        const open = await prepareOpen({ id: body.id, linkKey, password: 'right-password', params: s.params }, opts);
        expect(await code(open.finish({ iv: body.iv, ciphertext: encode(sealed) }))).toBe('DecryptFailed');
    });
});

describe('frische Schlüssel je Secret (GCM-IV-Eindeutigkeit je Schlüssel, NIST SP 800-38D)', () => {
    it('zwei Aufrufe mit gleichen Eingaben teilen kein Zufallsmaterial', async () => {
        const input = { secret: 'gleich', password: 'abcdefghij', settings };
        const a = await createSecret(input, opts);
        const b = await createSecret(input, opts);
        for (const key of ['id', 'salt', 'iv', 'ciphertext', 'verifier', 'manage_hash'] as const) {
            expect(a.body[key], key).not.toBe(b.body[key]);
        }
        expect(a.linkKey).not.toBe(b.linkKey);
        expect(a.manageToken).not.toBe(b.manageToken);
    });
});

describe('Request-Body enthält keine geheimen Werte', () => {
    const forms = (bytes: Uint8Array): string[] => {
        const b64 = btoa(String.fromCharCode(...bytes));
        return [toHex(bytes), b64, b64.replace(/=+$/, ''), encode(bytes)];
    };

    it('weder Klartext noch Passwort noch K_link, pwKey, K_enc, K_auth oder manage_token (Hex, Base64, base64url)', async () => {
        const v = vectors.vectors[0]!;
        const { body } = await createSecret({ secret: v.inputs.secret, password: v.inputs.password, settings }, { ...opts, random: fixed(v) });
        const json = JSON.stringify(body);
        const secrets = [
            new TextEncoder().encode(v.inputs.secret), new TextEncoder().encode(v.inputs.password),
            fromHex(v.inputs.k_link_hex), fromHex(v.outputs.pw_key_hex), fromHex(v.outputs.k_enc_hex),
            fromHex(v.outputs.k_auth_hex), fromHex(v.inputs.manage_token_hex),
        ];
        for (const s of secrets) for (const f of forms(s)) expect(json.includes(f), f.slice(0, 24)).toBe(false);
        expect(json.includes(v.inputs.secret)).toBe(false);
        expect(json.includes(v.inputs.password)).toBe(false);
        // Gegenprobe: der Suchbegriff würde einen Treffer finden, wenn der Wert drin wäre.
        expect((json + encode(fromHex(v.inputs.k_link_hex))).includes(encode(fromHex(v.inputs.k_link_hex)))).toBe(true);
        expect(Object.keys(body).sort()).toEqual(['ciphertext', 'id', 'iv', 'kdf', 'manage_hash', 'max_attempts', 'max_views', 'salt', 'ttl', 'v', 'verifier']);
    });
});

describe('Eingabeprüfung', () => {
    it('lehnt leeres und zu großes Secret, schwaches Passwort und schlechte Einstellungen ab', async () => {
        expect(await code(createSecret({ secret: '', password: 'abcdefghij', settings }, opts))).toBe('EmptySecret');
        expect(await code(createSecret({ secret: 'a'.repeat(65533), password: 'abcdefghij', settings }, opts))).toBe('SecretTooLarge');
        expect(await code(createSecret({ secret: 'x', password: 'kurz', settings }, opts))).toBe('InvalidPassword');
        for (const bad of [
            { ...settings, ttl: 60 }, { ...settings, maxViews: 0 }, { ...settings, maxViews: 11 },
            { ...settings, maxAttempts: 0 }, { ...settings, maxAttempts: 2.5 },
        ]) {
            expect(await code(createSecret({ secret: 'x', password: 'abcdefghij', settings: bad }, opts))).toBe('InvalidPayload');
        }
    });

    it('prepareOpen meldet InvalidLink bei kaputter id oder kaputtem Fragment', async () => {
        const { body, linkKey } = await createSecret({ secret: 'x', password: 'abcdefghij', settings }, opts);
        const params = server(body).params;
        const base = { id: body.id, linkKey, password: 'abcdefghij', params };
        expect(await code(prepareOpen({ ...base, linkKey: '' }, opts))).toBe('InvalidLink');
        expect(await code(prepareOpen({ ...base, linkKey: linkKey + '.' }, opts))).toBe('InvalidLink');
        expect(await code(prepareOpen({ ...base, linkKey: encode(new Uint8Array(31)) }, opts))).toBe('InvalidLink');
        expect(await code(prepareOpen({ ...base, id: 'kurz' }, opts))).toBe('InvalidLink');
    });

    it('prepareOpen lehnt Parameter außerhalb der Erlaubnisliste ab, bevor abgeleitet wird', async () => {
        const { body, linkKey } = await createSecret({ secret: 'x', password: 'abcdefghij', settings }, opts);
        let derived = false;
        const spy = async () => { derived = true; return new Uint8Array(32); };
        const params = { ...server(body).params, kdf: { ...body.kdf, m: 8 } };
        expect(await code(prepareOpen({ id: body.id, linkKey, password: 'abcdefghij', params }, { deriver: spy }))).toBe('KdfParamsOutOfBounds');
        expect(derived).toBe(false);
    });
});
