import { describe, expect, it } from 'vitest';

// Platzhalter, damit die Vitest-Spur läuft. Wird durch die Krypto-Tests ersetzt.
describe('web crypto availability', () => {
    it('exposes SubtleCrypto and getRandomValues', () => {
        expect(globalThis.crypto.subtle).toBeDefined();
        expect(globalThis.crypto.getRandomValues(new Uint8Array(16))).toHaveLength(16);
    });
});
