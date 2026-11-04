import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, parsePrefs, savePrefs } from '@/prefs';

describe('prefs', () => {
    const store = new Map<string, string>();
    beforeEach(() => {
        store.clear();
        (globalThis as unknown as { localStorage: Storage }).localStorage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
            clear: () => store.clear(),
            key: () => null,
            length: 0,
        };
    });

    it('uses the defaults when nothing is stored', () => {
        expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    });

    it('round-trips valid values', () => {
        const p = { ttl: 3600, views: 4, attempts: 5, oneTime: false, mode: 'chars' as const };
        savePrefs(p);
        expect(loadPrefs()).toEqual(p);
    });

    it('rejects every invalid field individually', () => {
        const raw = JSON.stringify({ ttl: 12345, views: 0, attempts: 99, oneTime: 'yes', mode: 'emoji' });
        expect(parsePrefs(raw)).toEqual(DEFAULT_PREFS);
        expect(parsePrefs(JSON.stringify({ ttl: 300, views: 2.5, attempts: 2, oneTime: false, mode: 'chars' }))).toEqual({ ttl: 300, views: 1, attempts: 2, oneTime: false, mode: 'chars' });
    });

    it('survives unreadable storage content', () => {
        expect(parsePrefs('{nope')).toEqual(DEFAULT_PREFS);
        expect(parsePrefs('null')).toEqual(DEFAULT_PREFS);
        expect(parsePrefs('"x"')).toEqual(DEFAULT_PREFS);
    });

    it('stores nothing but the five rules', () => {
        savePrefs({ ttl: 300, views: 1, attempts: 3, oneTime: true, mode: 'words' });
        expect(Object.keys(JSON.parse(localStorage.getItem('fmf-prefs')!)).sort()).toEqual(['attempts', 'mode', 'oneTime', 'ttl', 'views']);
    });
});
