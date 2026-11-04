import { describe, expect, it } from 'vitest';
import { format } from './useCountdown';

describe('format', () => {
    it('formatiert Tage, Stunden, Minuten und Sekunden', () => {
        expect(format(0)).toBeNull();
        expect(format(-5)).toBeNull();
        expect(format(45_000)).toBe('45 Sek');
        expect(format(61_000)).toBe('1 Min 01 Sek');
        expect(format(3_720_000)).toBe('1 Std 02 Min');
        expect(format(90_000_000)).toBe('1 Tg 1 Std');
        expect(format(500)).toBe('1 Sek');
    });
});
