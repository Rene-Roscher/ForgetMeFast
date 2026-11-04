import { argon2id } from '@noble/hashes/argon2.js';
import { KDF_LIMITS, KEY_BYTES, MIN_PASSWORD_CODEPOINTS } from './constants';
import { CryptoError } from './errors';

export interface KdfParams {
    m: number;
    t: number;
    p: number;
}

/** Führt Argon2id aus. Austauschbar: Browser nutzt einen Worker, Tests den Hauptthread. */
export type Deriver = (password: Uint8Array, salt: Uint8Array, params: KdfParams) => Promise<Uint8Array>;

const codepoints = (s: string): number => Array.from(s).length;

function hasLoneSurrogate(s: string): boolean {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff) {
            const next = s.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) i++;
            else return true;
        } else if (c >= 0xdc00 && c <= 0xdfff) {
            return true;
        }
    }
    return false;
}

/**
 * Passwortregeln (ADR 0004, Punkt 7) und Normalisierung: mindestens 10 Unicode-Codepoints vor UND nach NFKC,
 * keine einzelnen Surrogate (TextEncoder würde sie still durch U+FFFD ersetzen, und verschiedene Passwörter fielen
 * auf denselben Schlüssel). Warum NFKC: docs/SPEC.md, Protokoll v1 Schritt 2; Unicode UAX #15.
 */
export function normalizePassword(password: unknown): Uint8Array {
    if (typeof password !== 'string' || hasLoneSurrogate(password)) {
        throw new CryptoError('InvalidPassword');
    }
    const normalized = password.normalize('NFKC');
    if (codepoints(password) < MIN_PASSWORD_CODEPOINTS || codepoints(normalized) < MIN_PASSWORD_CODEPOINTS) {
        throw new CryptoError('InvalidPassword');
    }
    return new TextEncoder().encode(normalized);
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

export function checkParams(params: KdfParams): void {
    const { m, t, p } = params;
    if (
        !isInt(m) || !isInt(t) || !isInt(p) ||
        m < KDF_LIMITS.mMin || m > KDF_LIMITS.mMax ||
        t < KDF_LIMITS.tMin || t > KDF_LIMITS.tMax ||
        p !== KDF_LIMITS.p
    ) {
        throw new CryptoError('KdfParamsOutOfBounds');
    }
}

// Warum: Argon2id nach RFC 9106 (https://www.rfc-editor.org/rfc/rfc9106), Parameter nach OWASP Password Storage
// Cheat Sheet (m >= 19 MiB, t >= 2, p = 1). Implementierung: @noble/hashes (ADR 0002), gegen den Vektor aus
// RFC 9106 §5.3 und den Produktionsvektor geprüft.
export const deriveOnMainThread: Deriver = async (password, salt, params) => {
    try {
        return argon2id(password, salt, { t: params.t, m: params.m, p: params.p, dkLen: KEY_BYTES });
    } catch {
        throw new CryptoError('KdfFailed');
    }
};

/** Im Browser läuft die Ableitung im Worker (hält die Seite flüssig), sonst im Hauptthread. */
export const defaultDeriver: Deriver = async (password, salt, params) => {
    // Im Dev-Betrieb liegt die Worker-Datei auf dem Vite-Server (anderer Port, anderer Ursprung): ein Worker muss aber vom
    // Ursprung der Seite kommen. Dort und ohne Worker-Unterstützung läuft Argon2id im Hauptthread.
    if (typeof Worker === 'undefined' || import.meta.env.DEV) {
        return deriveOnMainThread(password, salt, params);
    }
    /* v8 ignore start -- Worker-Pfad, nur im Browser; abgedeckt durch e2e/ (Playwright) */
    try {
        const { workerDeriver } = await import('./kdf-worker-client');
        return await workerDeriver()(password, salt, params);
    } catch {
        // Worker nicht startbar (Richtlinie, Browser): lieber etwas langsamer als gar nicht.
        return deriveOnMainThread(password, salt, params);
    }
    /* v8 ignore stop */
};

/** Prüft Parameter und Passwort, leitet ab und überschreibt die Passwort-Bytes danach (best effort). */
export async function derivePwKey(password: unknown, salt: Uint8Array, params: KdfParams, deriver: Deriver): Promise<Uint8Array> {
    checkParams(params);
    const pw = normalizePassword(password);
    try {
        const key = await deriver(pw, salt, params);
        if (key.length !== KEY_BYTES) {
            throw new CryptoError('KdfFailed');
        }
        return key;
    } catch (e) {
        throw e instanceof CryptoError ? e : new CryptoError('KdfFailed');
    } finally {
        pw.fill(0);
    }
}
