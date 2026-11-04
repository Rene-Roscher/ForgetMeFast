import { describe, expect, it } from 'vitest';
import { createTyper, ERASE_MS, HOLD_MS, LINE_MS, NEXT_MS, TYPE_MS } from '@/placeholder';

describe('createTyper', () => {
    it('types one character at a time, pauses longer after a line break, holds, erases fast and moves on', () => {
        const t = createTyper(['ab\nc', 'xy']);
        expect(t.step()).toEqual({ text: 'a', delay: TYPE_MS });
        expect(t.step()).toEqual({ text: 'ab', delay: TYPE_MS });
        expect(t.step()).toEqual({ text: 'ab\n', delay: LINE_MS });
        expect(t.step()).toEqual({ text: 'ab\nc', delay: HOLD_MS }); // fertig getippt: stehen lassen
        expect(t.step()).toEqual({ text: 'a', delay: ERASE_MS }); // drei Zeichen weniger
        expect(t.step()).toEqual({ text: '', delay: NEXT_MS }); // leer: nächstes Beispiel
        expect(t.step()).toEqual({ text: 'x', delay: TYPE_MS });
    });

    it('wraps around after the last example and honours the start index', () => {
        const t = createTyper(['a', 'b'], 1);
        expect(t.step().text).toBe('b');
        t.step(); // löschen bis leer
        expect(t.step().text).toBe('a');
        expect(createTyper(['a', 'b'], 5).step().text).toBe('b'); // 5 % 2 = 1
    });

    it('never shows text longer than the example and always makes progress', () => {
        const examples = ['hello\nworld'];
        const t = createTyper(examples);
        let guard = 0;
        let full = 0;
        while (full < 2 && guard++ < 200) {
            const { text, delay } = t.step();
            expect(examples[0]!.startsWith(text)).toBe(true);
            expect(delay).toBeGreaterThan(0);
            if (text === examples[0]) full++;
        }
        expect(full).toBe(2);
    });
});
