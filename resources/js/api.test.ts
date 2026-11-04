import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, errorKey } from './api';

const respond = (status: number, body?: unknown) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
    it('sendet ohne Cookies, ohne Cache und ohne Referrer', async () => {
        const fetchMock = respond(200, { expires_at: 'x' });
        vi.stubGlobal('fetch', fetchMock);
        await api.create({} as never);
        const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
        expect(init).toMatchObject({ method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
        expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('übergibt das Verwaltungstoken als Header und erwartet 204', async () => {
        const fetchMock = respond(204);
        vi.stubGlobal('fetch', fetchMock);
        await expect(api.destroy('abc', 'tok')).resolves.toBeUndefined();
        expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ 'X-Manage-Token': 'tok' });
    });

    it('fragt den Status mit dem Verwaltungstoken ab, ohne Body, und kodiert die id im Pfad', async () => {
        const fetchMock = respond(200, { views_used: 1 });
        vi.stubGlobal('fetch', fetchMock);
        await expect(api.status('a/b?c', 'tok')).resolves.toEqual({ views_used: 1 });
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('/api/secrets/a%2Fb%3Fc/status');
        expect(init.method ?? 'GET').toBe('GET');
        expect(init.headers).toMatchObject({ 'X-Manage-Token': 'tok' });
        expect(init.body).toBeUndefined();
    });

    it('übersetzt Statuscodes in Fehler mit Restversuchen', async () => {
        vi.stubGlobal('fetch', respond(403, { message: 'invalid', attempts_left: 2 }));
        await expect(api.open('id', 'p')).rejects.toMatchObject({ status: 403, attemptsLeft: 2 });
    });

    it('meldet status 0, wenn der Server nicht erreichbar ist', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
        await expect(api.params('id')).rejects.toMatchObject({ status: 0 });
    });

    it('verträgt eine Antwort ohne JSON', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 500 })));
        await expect(api.params('id')).rejects.toMatchObject({ status: 500, attemptsLeft: undefined });
    });

    it('bildet Status auf Meldungsschlüssel ab', () => {
        const key = (s: number) => errorKey(new ApiError(s));
        expect([0, 403, 404, 409, 422, 429, 500, 503].map(key)).toEqual(['network', 'invalid', 'unavailable', 'conflict', 'invalidInput', 'throttled', 'server', 'server']);
    });
});
