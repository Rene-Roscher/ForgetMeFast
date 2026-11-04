import { PASSPHRASE_WORDS, PASSWORD_ALPHABET, PASSWORD_CHARS } from './constants';
import { randomIndex, systemBytes, type ByteSource } from './random';

// Warum: Passwörter aus Rejection Sampling (random.ts) ohne Modulo-Bias. Wortliste: EFF Large Wordlist (7.776 Wörter,
// 5 Wörter ≈ 64,6 Bit = 5 × log2 7776), Zeichen: 62 Symbole (16 Zeichen ≈ 95,3 Bit). Entscheidungen 6 und 8 in ADR 0004.
export function randomPassphrase(words: readonly string[], count: number = PASSPHRASE_WORDS, source: ByteSource = systemBytes): string {
    return Array.from({ length: count }, () => words[randomIndex(words.length, source)]!).join('-');
}

export function randomChars(length: number = PASSWORD_CHARS, source: ByteSource = systemBytes): string {
    return Array.from({ length }, () => PASSWORD_ALPHABET[randomIndex(PASSWORD_ALPHABET.length, source)]!).join('');
}

/** Exakte Entropie eines zufällig erzeugten Passworts: Anzahl Ziehungen × log2(Größe des Pools). */
export function generatedBits(poolSize: number, draws: number): number {
    return draws * Math.log2(poolSize);
}

/**
 * Grobe Schätzung für ein getipptes Passwort (Länge × log2 des Zeichenvorrats, den es benutzt). Das ist eine obere
 * Schätzung und kein Beweis: Wörter, Muster und bekannte Passwörter sind schwächer. Die Oberfläche beschriftet sie so.
 */
export function estimateBits(password: string): number {
    const chars = Array.from(password);
    if (chars.length === 0) return 0;
    let pool = 0;
    if (chars.some((c) => /[a-z]/.test(c))) pool += 26;
    if (chars.some((c) => /[A-Z]/.test(c))) pool += 26;
    if (chars.some((c) => /[0-9]/.test(c))) pool += 10;
    if (chars.some((c) => /[ -/:-@[-`{-~]/.test(c))) pool += 33;
    if (chars.some((c) => c.charCodeAt(0) > 126)) pool += 100;
    return chars.length * Math.log2(Math.max(pool, 2));
}
