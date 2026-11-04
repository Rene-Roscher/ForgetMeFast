import { decrypt, encrypt } from './aead';
import { decode, encode } from './base64url';
import {
    BUCKETS, ID_BYTES, IV_BYTES, KDF_DEFAULT, KDF_NAME, LINK_KEY_BYTES, MANAGE_TOKEN_BYTES, MAX_COUNT, SALT_BYTES,
    TAG_BYTES, TTL_SECONDS, VERSION,
} from './constants';
import { CryptoError } from './errors';
import { concat, sha256 } from './hash';
import { buildHeader, parseParams } from './header';
import { deriveKeys } from './hkdf';
import { defaultDeriver, derivePwKey, type Deriver } from './kdf';
import { pad, unpad } from './padding';
import { randomBytes, systemBytes, type ByteSource } from './random';

// Protokoll v1, Browser-Seite. Bytes: docs/CRYPTO-NOTES.md. Entscheidungen: docs/SPEC.md und ADR 0004.

export interface Settings {
    /** Ablauf in Sekunden, einer von TTL_SECONDS. Der Server rechnet expires_at selbst aus. */
    ttl: number;
    maxViews: number;
    maxAttempts: number;
}

export interface Options {
    deriver?: Deriver;
    random?: ByteSource;
}

/** Body für POST /api/secrets. Enthält weder Klartext noch Passwort noch Link-Key noch Schlüssel. */
export interface CreateBody {
    id: string;
    v: number;
    kdf: { name: string; m: number; t: number; p: number };
    salt: string;
    iv: string;
    ciphertext: string;
    verifier: string;
    manage_hash: string;
    ttl: number;
    max_views: number;
    max_attempts: number;
}

export interface CreatedSecret {
    body: CreateBody;
    /** base64url(K_link), kommt hinter das # des Links und verlässt den Browser nie. */
    linkKey: string;
    /** base64url(manage_token), nur im Speicher, für "Jetzt vernichten" (Header X-Manage-Token). */
    manageToken: string;
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_COUNT;

function checkSettings(s: Settings): void {
    if (!(TTL_SECONDS as readonly number[]).includes(s.ttl) || !isCount(s.maxViews) || !isCount(s.maxAttempts)) {
        throw new CryptoError('InvalidPayload');
    }
}

const utf8 = new TextEncoder();

export async function createSecret(
    input: { secret: string; password: string; settings: Settings },
    options: Options = {},
): Promise<CreatedSecret> {
    const { deriver = defaultDeriver, random = systemBytes } = options;
    checkSettings(input.settings);
    if (typeof input.secret !== 'string' || input.secret.length === 0) {
        throw new CryptoError('EmptySecret');
    }
    const padded = pad(utf8.encode(input.secret)); // wirft SecretTooLarge

    // Reihenfolge der Ziehungen ist Teil des Vertrags (Tests speisen sie ein): id, K_link, salt, iv, manage_token.
    const id = randomBytes(ID_BYTES, random);
    const kLink = randomBytes(LINK_KEY_BYTES, random);
    const salt = randomBytes(SALT_BYTES, random);
    const iv = randomBytes(IV_BYTES, random);
    const manageToken = randomBytes(MANAGE_TOKEN_BYTES, random);

    const kdf = { ...KDF_DEFAULT };
    const header = buildHeader(id, kdf, salt);
    const pwKey = await derivePwKey(input.password, salt, kdf, deriver);
    const ikm = concat(kLink, pwKey);
    const { kEnc, kAuth } = await deriveKeys(ikm, salt);
    pwKey.fill(0);
    ikm.fill(0);

    const sealed = await encrypt(kEnc, iv, header, padded);

    // Selbstprüfung: Der Server liefert beim Öffnen die Felder einzeln zurück. Die AAD, aus genau diesen Feldern neu
    // gebaut, muss byte-gleich sein, und die Entschlüsselung muss gelingen. Sonst wäre das Secret schon beim
    // letzten Abruf unlesbar und zerstört (Reviewbefund 1).
    const wire = { v: VERSION, kdf: { name: KDF_NAME, ...kdf }, salt: encode(salt), max_attempts: input.settings.maxAttempts };
    const rebuilt = buildHeader(id, parseParams(wire).kdf, decode(wire.salt, SALT_BYTES));
    const roundTrip = await decrypt(kEnc, iv, rebuilt, sealed);
    if (toKey(rebuilt) !== toKey(header) || toKey(unpad(roundTrip)) !== toKey(utf8.encode(input.secret))) {
        throw new CryptoError('DecryptFailed');
    }

    const body: CreateBody = {
        id: encode(id),
        v: VERSION,
        kdf: wire.kdf,
        salt: wire.salt,
        iv: encode(iv),
        ciphertext: encode(sealed),
        verifier: encode(await sha256(kAuth)),
        manage_hash: encode(await sha256(manageToken)),
        ttl: input.settings.ttl,
        max_views: input.settings.maxViews,
        max_attempts: input.settings.maxAttempts,
    };
    kAuth.fill(0);
    return { body, linkKey: encode(kLink), manageToken: encode(manageToken) };
}

const toKey = (b: Uint8Array): string => encode(b);

export interface PreparedOpen {
    /** base64url(K_auth). Das ist alles, was der Server vom Öffnen sieht. */
    proof: string;
    /** Versuche pro Secret laut Server (für die Anzeige). */
    maxAttempts: number;
    /** Entschlüsselt die Antwort von POST /api/secrets/{id}/open. Erst nach akzeptiertem Proof sinnvoll. */
    finish: (response: { iv: string; ciphertext: string }) => Promise<string>;
}

const SEALED_LENGTHS = new Set(BUCKETS.map((b) => b + TAG_BYTES));

/**
 * Erster Öffnen-Schritt: leitet K_auth und K_enc ab. Die `id` kommt aus der URL (nicht aus der Antwort des Servers),
 * der Link-Key aus dem Fragment. Ein falsches Passwort erkennt allein der Server am Proof; das Modul kann es nicht.
 */
export async function prepareOpen(
    input: { id: string; linkKey: string; password: string; params: unknown },
    options: Options = {},
): Promise<PreparedOpen> {
    const { deriver = defaultDeriver } = options;
    const id = decode(input.id, ID_BYTES, 'InvalidLink');
    const kLink = decode(input.linkKey, LINK_KEY_BYTES, 'InvalidLink');
    const parsed = parseParams(input.params);

    const pwKey = await derivePwKey(input.password, parsed.salt, parsed.kdf, deriver);
    const ikm = concat(kLink, pwKey);
    const { kEnc, kAuth } = await deriveKeys(ikm, parsed.salt);
    pwKey.fill(0);
    ikm.fill(0);
    const header = buildHeader(id, parsed.kdf, parsed.salt);
    const proof = encode(kAuth);
    kAuth.fill(0);

    const finish = async (response: { iv: string; ciphertext: string }): Promise<string> => {
        const iv = decode(response?.iv, IV_BYTES);
        const sealed = decode(response?.ciphertext);
        if (!SEALED_LENGTHS.has(sealed.length)) {
            throw new CryptoError('InvalidPayload');
        }
        const plain = unpad(await decrypt(kEnc, iv, header, sealed));
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(plain);
        } catch {
            throw new CryptoError('DecryptFailed');
        }
    };
    return { proof, maxAttempts: parsed.maxAttempts, finish };
}
