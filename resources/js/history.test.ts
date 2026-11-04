import { beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_KEY, HISTORY_MAX, isEntry, KEEP_AFTER_EXPIRY_MS, prune, resetHistoryForTests, useHistory, type HistoryEntry } from './history';

const id = 'AAAAAAAAAAAAAAAAAAAAAA';
const key = 'B'.repeat(43);
const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id, link: `http://127.0.0.1:8000/s/${id}#${key}`, manageToken: 'C'.repeat(43), createdAt: 1_000, expiresAt: 10_000_000_000_000, ttl: 3600, maxViews: 1, ...over,
});

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
    resetHistoryForTests();
});

describe('Verlauf', () => {
    it('speichert Link und Verwaltungstoken, aber nie ein Passwort oder Klartext', () => {
        useHistory().add(entry());
        const raw = store.get(HISTORY_KEY)!;
        expect(Object.keys(JSON.parse(raw)[0]).sort()).toEqual(['createdAt', 'expiresAt', 'id', 'link', 'manageToken', 'maxViews', 'ttl']);
        expect(raw).not.toMatch(/password|passwort|secret|plain/i);
    });

    it('legt neueste zuerst ab, ersetzt gleiche ids und begrenzt die Anzahl', () => {
        const h = useHistory();
        for (let i = 0; i < HISTORY_MAX + 5; i++) {
            const n = String(i).padStart(22, 'A');
            h.add(entry({ id: n, link: `http://x.de/s/${n}#${key}`, createdAt: i }));
        }
        expect(h.entries.value).toHaveLength(HISTORY_MAX);
        expect(h.entries.value[0]!.createdAt).toBe(HISTORY_MAX + 4);
        h.add(entry({ createdAt: 999_999 }));
        h.add(entry({ createdAt: 1_000_000 }));
        expect(h.entries.value.filter((e) => e.id === id)).toHaveLength(1);
    });

    it('entfernt einzelne Einträge und leert alles', () => {
        const h = useHistory();
        h.add(entry());
        h.remove(id);
        expect(h.entries.value).toEqual([]);
        h.add(entry());
        h.clear();
        expect(JSON.parse(store.get(HISTORY_KEY)!)).toEqual([]);
    });

    it('verwirft kaputte oder manipulierte Einträge beim Lesen', () => {
        store.set(HISTORY_KEY, JSON.stringify([entry(), { ...entry(), link: 'javascript:alert(1)' }, { ...entry(), manageToken: 'kurz' }, { ...entry(), id: 'x' }, { ...entry(), maxViews: 'viele' }, 42, null]));
        expect(useHistory().entries.value).toHaveLength(1);
        resetHistoryForTests();
        store.set(HISTORY_KEY, '{kaputt');
        expect(useHistory().entries.value).toEqual([]);
    });

    it('der Link muss zur id des Eintrags gehören', () => {
        const other = 'D'.repeat(22);
        expect(isEntry(entry({ link: `http://x.de/s/${other}#${key}` }))).toBe(false);
        expect(isEntry(entry({ link: `http://x.de/s/${id}#kurz` }))).toBe(false);
        expect(isEntry(entry())).toBe(true);
    });

    it('abgelaufene Einträge bleiben einen Tag, dann verschwinden sie', () => {
        const expired = entry({ expiresAt: 5_000 });
        expect(prune([expired], 5_000 + KEEP_AFTER_EXPIRY_MS - 1)).toHaveLength(1);
        expect(prune([expired], 5_000 + KEEP_AFTER_EXPIRY_MS)).toHaveLength(0);
    });
});
