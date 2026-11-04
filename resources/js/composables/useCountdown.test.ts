import { describe, expect, it } from 'vitest';
import de from '@/locales/de.json';
import { format } from './useCountdown';

// Minimaler Ersatz für t(): setzt {name} in den deutschen Text ein. Der echte Pfad läuft im Browser (E2E).
const t = (key: string, named: Record<string, number | string>) => {
    const text = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], de) as string;
    return text.replace(/\{(\w+)\}/g, (_m, k: string) => String(named[k]));
};

describe('format', () => {
    it('formatiert Tage, Stunden, Minuten und Sekunden', () => {
        expect(format(0, t)).toBeNull();
        expect(format(-5, t)).toBeNull();
        expect(format(45_000, t)).toBe('45 Sek');
        expect(format(61_000, t)).toBe('1 Min 01 Sek');
        expect(format(3_720_000, t)).toBe('1 Std 02 Min');
        expect(format(90_000_000, t)).toBe('1 Tg 1 Std');
        expect(format(500, t)).toBe('1 Sek');
    });
});
