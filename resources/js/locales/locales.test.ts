import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { baseCompile } from '@intlify/message-compiler';
import { describe, expect, it } from 'vitest';

// Die drei Pflicht-Tests für vue-i18n (Skill web-architecture): Syntax kompiliert, Parität zwischen den Sprachen, und jeder
// benutzte Schlüssel existiert. Jeder Test wurde einmal rot gesehen (siehe Gegenproben unten).
const dir = __dirname;
const jsDir = join(dir, '..');
type Tree = { [k: string]: string | Tree };
const locales: Record<string, Tree> = Object.fromEntries(
    readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(join(dir, f), 'utf8')) as Tree]),
);

function flatten(tree: Tree, prefix = ''): Record<string, string> {
    return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
    }, {});
}
const flat = Object.fromEntries(Object.entries(locales).map(([name, tree]) => [name, flatten(tree)]));

function sources(): { file: string; code: string }[] {
    const out: { file: string; code: string }[] = [];
    (function walk(d: string) {
        for (const name of readdirSync(d, { withFileTypes: true })) {
            const path = join(d, name.name);
            if (name.isDirectory()) {
                if (!['crypto', 'locales', 'vectors'].includes(name.name)) walk(path);
            } else if (/\.(vue|ts)$/.test(name.name) && !name.name.endsWith('.test.ts')) {
                out.push({ file: path.slice(jsDir.length + 1), code: readFileSync(path, 'utf8') });
            }
        }
    })(jsDir);
    return out;
}

describe('Sprachdateien', () => {
    it('es gibt mindestens eine Sprache', () => {
        expect(Object.keys(locales)).toContain('de');
    });

    it('Syntax: jede Nachricht lässt sich kompilieren', () => {
        const errors: string[] = [];
        for (const [locale, messages] of Object.entries(flat)) {
            for (const [key, source] of Object.entries(messages)) {
                try {
                    baseCompile(source, { onError: (e) => { throw e; } });
                } catch (e) {
                    errors.push(`${locale}:${key}: ${(e as Error).message}`);
                }
            }
        }
        expect(errors).toEqual([]);
    });

    it('Parität: alle Sprachen haben dieselben Schlüssel, keine leeren Texte', () => {
        const [first, ...rest] = Object.values(flat);
        for (const other of rest) expect(Object.keys(other!).sort()).toEqual(Object.keys(first!).sort());
        for (const [locale, messages] of Object.entries(flat)) {
            const blank = Object.entries(messages).filter(([, v]) => v.trim() === '').map(([k]) => k);
            expect(blank, locale).toEqual([]);
        }
    });

    // Dynamische Schlüssel stehen auf dieser Liste. Der Nadeltext muss im Quelltext noch vorkommen, sonst ist der Eintrag veraltet.
    const dynamic: Record<string, string[]> = {
        'expiry.${value}': ['expiry.300', 'expiry.3600', 'expiry.86400', 'expiry.604800'],
        'expiryShort.${value}': ['expiryShort.300', 'expiryShort.3600', 'expiryShort.86400', 'expiryShort.604800'],
        'expiry.${result.ttl}': ['expiry.300', 'expiry.3600', 'expiry.86400', 'expiry.604800'],
        'history.state.${row.state}': ['active', 'expired', 'gone', 'unknown'].map((k) => `history.state.${k}`),
        '${copy}.headline': ['shell.create.headline', 'shell.view.headline'],
        '${copy}.lead': ['shell.create.lead', 'shell.view.lead'],
        'shell.trust.${item.key}.title': ['encrypted', 'zeroKnowledge', 'fragment', 'selfDestruct', 'hardened'].map((k) => `shell.trust.${k}.title`),
        'shell.how.${step.key}.title': ['link', 'fragment', 'password', 'result'].map((k) => `shell.how.${k}.title`),
        'shell.how.${step.key}.body': ['link', 'fragment', 'password', 'result'].map((k) => `shell.how.${k}.body`),
        'create.password.levels.${level}': ['1', '2', '3', '4'].map((k) => `create.password.levels.${k}`),
        'shell.trust.${item.key}.body': ['encrypted', 'zeroKnowledge', 'fragment', 'selfDestruct', 'hardened'].map((k) => `shell.trust.${k}.body`),
    };

    it('Nutzung: jeder statische und jeder erlaubte dynamische Schlüssel existiert in jeder Sprache', () => {
        const used = new Set<string>();
        const needles = new Set<string>();
        for (const { code } of sources()) {
            for (const m of code.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]!);
            for (const m of code.matchAll(/\bt\(\s*`([^`]+)`/g)) {
                needles.add(m[1]!);
                if (!(m[1]! in dynamic)) throw new Error(`Dynamischer Schlüssel nicht auf der Liste: ${m[1]}`);
            }
        }
        for (const [needle, keys] of Object.entries(dynamic)) {
            expect(needles.has(needle), `veralteter Eintrag: ${needle}`).toBe(true);
            keys.forEach((k) => used.add(k));
        }
        expect(used.size).toBeGreaterThan(40);
        for (const [locale, messages] of Object.entries(flat)) {
            const missing = [...used].filter((k) => !(k in messages));
            expect(missing, locale).toEqual([]);
        }
    });

    it('Gegenprobe: die Prüfungen schlagen bei kaputten Texten an', () => {
        // Das `@` ist Verknüpfungs-Syntax, eine offene Klammer ein Fehler: genau die Fälle, die einen Dialog erst im Build-Ergebnis zerlegen.
        expect(() => baseCompile('mail@x.de', { onError: (e) => { throw e; } })).toThrow();
        expect(() => baseCompile('Hallo {name', { onError: (e) => { throw e; } })).toThrow();
        expect(() => baseCompile('Hallo {name} | Plural {n}', { onError: (e) => { throw e; } })).not.toThrow();
        expect(Object.keys(flatten({ a: { b: 'x', c: '' } }))).toEqual(['a.b', 'a.c']);
    });
});
