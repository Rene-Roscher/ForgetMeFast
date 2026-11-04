import { afterEach, describe, expect, it, vi } from 'vitest';

// Invariante (CLAUDE.md): Das Fragment wird nur im Browser gelesen, sofort per history.replaceState entfernt und nie
// gespeichert oder gesendet. Das Modul liest beim Import, deshalb wird es je Fall frisch geladen.
const g = globalThis as unknown as Record<string, unknown>;

async function load(hash: string, pathname = '/s/abc', search = '') {
    vi.resetModules();
    const replaceState = vi.fn();
    g.location = { hash, pathname, search };
    g.history = { state: { keep: 1 }, replaceState };
    const mod = await import('@/fragment');
    return { fragment: mod.initialFragment, replaceState };
}

describe('fragment', () => {
    afterEach(() => {
        delete g.location;
        delete g.history;
    });

    it('liest den Schlüssel und entfernt das Fragment sofort aus der Adresse (Pfad und Query bleiben)', async () => {
        const { fragment, replaceState } = await load('#KEY_value-123', '/s/abc', '?x=1');
        expect(fragment).toBe('KEY_value-123');
        expect(replaceState).toHaveBeenCalledTimes(1);
        const [, , url] = replaceState.mock.calls[0]!;
        expect(url).toBe('/s/abc?x=1');
        expect(String(url)).not.toContain('#');
        expect(String(url)).not.toContain('KEY_value');
    });

    it('ohne Fragment: leer und kein Eingriff in die History', async () => {
        const { fragment, replaceState } = await load('');
        expect(fragment).toBe('');
        expect(replaceState).not.toHaveBeenCalled();
    });

    it('ohne Browser (SSR, Tests): leer, ohne Fehler', async () => {
        vi.resetModules();
        delete g.location;
        const mod = await import('@/fragment');
        expect(mod.initialFragment).toBe('');
    });
});
