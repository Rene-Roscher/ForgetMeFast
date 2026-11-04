import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as api from './index';

const dir = __dirname;
const sources = readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'eff-large-wordlist.ts') // reine Datendatei
    .map((f) => ({ file: f, code: stripComments(readFileSync(join(dir, f), 'utf8')) }));

function stripComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Reviewbefund 9: Spione sehen nur ausgeführte Pfade und localStorage existiert in Node nicht. Darum eine statische Prüfung.
const FORBIDDEN = [
    'localStorage', 'sessionStorage', 'document.cookie', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket',
    'console.', 'location.', 'history.', 'Math.random', 'eval(', 'new Function', 'window.name', 'BroadcastChannel',
];

describe('Schlüssel verlassen das Modul nicht (statische Prüfung)', () => {
    for (const word of FORBIDDEN) {
        it(`kein "${word}" im Modulcode`, () => {
            const hits = sources.filter((s) => s.code.includes(word)).map((s) => s.file);
            expect(hits).toEqual([]);
        });
    }

    it('importiert nur Dateien des Moduls und @noble/hashes/argon2.js (und node: nirgends)', () => {
        const allowed = /^(\.\/[a-z0-9.-]+|@noble\/hashes\/argon2\.js)$/;
        for (const s of sources) {
            for (const m of s.code.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
                expect(allowed.test(m[1]!), `${s.file}: ${m[1]}`).toBe(true);
            }
        }
    });

    it('die Prüfung selbst erkennt einen Verstoß (Gegenprobe)', () => {
        expect(stripComments('const a = localStorage.getItem("x"); // console.log').includes('localStorage')).toBe(true);
        expect(stripComments('// console.log(1)\nconst b = 1;').includes('console.')).toBe(false);
    });
});

describe('öffentliche Schnittstelle', () => {
    it('exportiert genau die vorgesehenen Namen', () => {
        expect(Object.keys(api).sort()).toEqual([
            'CryptoError', 'EFF_LARGE_WORDLIST', 'MAX_COUNT', 'MAX_PLAINTEXT_BYTES', 'MIN_PASSWORD_CODEPOINTS', 'PASSPHRASE_WORDS',
            'PASSWORD_ALPHABET', 'PASSWORD_CHARS', 'TTL_SECONDS', 'createSecret', 'estimateBits', 'generatedBits',
            'isAcceptablePassword', 'isCryptoAvailable', 'normalizePassword', 'prepareOpen', 'randomChars', 'randomPassphrase',
        ]);
    });

    it('isCryptoAvailable und isAcceptablePassword', () => {
        expect(api.isCryptoAvailable()).toBe(true);
        expect(api.isAcceptablePassword('abcdefghij')).toBe(true);
        expect(api.isAcceptablePassword('kurz')).toBe(false);
        const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
        Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
        try {
            expect(api.isCryptoAvailable()).toBe(false);
        } finally {
            Object.defineProperty(globalThis, 'crypto', original);
        }
    });
});
