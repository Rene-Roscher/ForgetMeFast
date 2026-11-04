import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '@/examples';

describe('Beispiel-Platzhalter', () => {
    it('sind zehn und kurz genug für das Feld', () => {
        expect(EXAMPLES).toHaveLength(10);
        for (const e of EXAMPLES) expect(e.length).toBeGreaterThan(10);
        for (const e of EXAMPLES) expect(e.length).toBeLessThan(200);
    });

    it('sind offensichtlich unecht: jedes trägt EXAMPLE, außer der öffentlichen Stripe-Testkarte', () => {
        for (const e of EXAMPLES) {
            expect(e.includes('EXAMPLE') || e.includes('4242 4242 4242 4242'), e).toBe(true);
        }
    });

    it('enthalten keinen echt wirkenden Schlüssel: lange Wörter tragen EXAMPLE oder dekodieren zu "Example"', () => {
        for (const e of EXAMPLES) {
            for (const word of e.split(/\s+/)) {
                if (word.length <= 24 || word.includes('EXAMPLE')) continue;
                expect(Buffer.from(word, 'base64').toString('utf8'), `${e}`).toContain('Example');
            }
        }
    });
});
