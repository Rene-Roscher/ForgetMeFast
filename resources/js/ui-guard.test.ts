import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Designregel des Projekts: keine Emojis und keine Sonderzeichen als Symbole in der Oberfläche. Symbole sind
// SVG-Icons (components/Icon.vue). Dieser Test hält die Regel fest.
const root = join(__dirname);
const files: string[] = [];
(function walk(dir: string) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            if (name !== 'vectors' && name !== 'crypto') walk(path);
        } else if (/\.(vue|ts|json)$/.test(name) && !name.endsWith('.test.ts')) {
            files.push(path);
        }
    }
})(root);

// Emoji und Piktogramme, Dingbats, technische Symbole sowie typische Zeichen-Ersatzsymbole.
const GLYPHS = /[\p{Extended_Pictographic}←-⇿⌀-⏿■-◿☀-➿−✓✔✗✘]/u;

describe('Oberfläche ohne Emojis und Symbolzeichen', () => {
    it('hat Quelldateien zu prüfen', () => {
        expect(files.some((f) => f.endsWith('Create.vue'))).toBe(true);
        expect(files.some((f) => f.endsWith('de.json'))).toBe(true);
    });

    it.each(files.map((f) => [f.slice(root.length + 1), f]))('%s enthält keine Emojis oder Symbolzeichen', (_name, file) => {
        const hits = readFileSync(file, 'utf8')
            .split('\n')
            .map((line, i) => ({ line: i + 1, text: line }))
            .filter(({ text }) => GLYPHS.test(text));
        expect(hits).toEqual([]);
    });

    it('der Wächter erkennt Verstöße (Gegenprobe)', () => {
        for (const bad of ['\u{1F512}', '⚠', '✓', '\u{1F3B2}', '▸', 'a − b']) {
            expect(GLYPHS.test(bad), bad).toBe(true);
        }
        expect(GLYPHS.test('Zugang für Kunde: ä ö ü ß – ok')).toBe(false);
    });
});
