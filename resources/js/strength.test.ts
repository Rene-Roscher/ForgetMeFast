import { describe, expect, it } from 'vitest';
import { strengthLevel } from '@/strength';

describe('strengthLevel', () => {
    it('is 0 for an empty password regardless of bits', () => {
        expect(strengthLevel(0, true)).toBe(0);
        expect(strengthLevel(200, true)).toBe(0);
    });

    it.each([
        [0, 1], [35.99, 1], [36, 2], [49.99, 2], [50, 3], [63.99, 3], [64, 4], [65, 4], [120, 4],
    ])('maps %d bits to level %d at the boundaries', (bits, level) => {
        expect(strengthLevel(bits, false)).toBe(level);
    });

    it('rates a generated six-word passphrase (about 65 bits) as strong', () => {
        expect(strengthLevel(65, false)).toBe(4);
    });
});
