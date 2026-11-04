// Öffentliche Schnittstelle des Krypto-Moduls. Alles andere im Ordner ist intern.
import { normalizePassword } from './kdf';

export { createSecret, prepareOpen } from './protocol';
export type { CreateBody, CreatedSecret, Options, PreparedOpen, Settings } from './protocol';
export { CryptoError } from './errors';
export type { CryptoErrorCode } from './errors';
export { EFF_LARGE_WORDLIST } from './eff-large-wordlist';
export { estimateBits, generatedBits, randomChars, randomPassphrase } from './generator';
export { normalizePassword } from './kdf';
export {
    MAX_COUNT, MAX_PLAINTEXT_BYTES, MIN_PASSWORD_CODEPOINTS, PASSPHRASE_WORDS, PASSWORD_ALPHABET, PASSWORD_CHARS, TTL_SECONDS,
} from './constants';

/** true, wenn Web Crypto verfügbar ist (HTTPS oder localhost). Ohne gibt es keinen Fallback auf eigene Krypto. */
export function isCryptoAvailable(): boolean {
    return typeof globalThis.crypto?.subtle === 'object' && typeof globalThis.crypto.getRandomValues === 'function';
}

/** Prüft nur die Passwortregeln (ADR 0004, Punkt 7), ohne abzuleiten. */
export function isAcceptablePassword(password: string): boolean {
    try {
        normalizePassword(password);
        return true;
    } catch {
        return false;
    }
}
