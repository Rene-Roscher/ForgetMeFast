import type { CreateBody } from '@/crypto';

/** Fehler eines API-Aufrufs. status 0 = Server nicht erreichbar. */
export class ApiError extends Error {
    readonly status: number;
    readonly attemptsLeft: number | undefined;

    constructor(status: number, attemptsLeft?: number) {
        super(`api ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.attemptsLeft = attemptsLeft;
    }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
    const { json, headers, ...rest } = init;
    let response: Response;
    try {
        response = await fetch(path, {
            ...rest,
            // Keine Cookies, kein Cache, kein Referrer: der Server soll nichts über den Kontext erfahren.
            credentials: 'omit',
            cache: 'no-store',
            referrerPolicy: 'no-referrer',
            headers: { Accept: 'application/json', ...(json === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
            body: json === undefined ? undefined : JSON.stringify(json),
        });
    } catch {
        throw new ApiError(0);
    }
    if (response.status === 204) {
        return undefined as T;
    }
    let data: unknown = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok) {
        const left = (data as { attempts_left?: unknown } | null)?.attempts_left;
        throw new ApiError(response.status, typeof left === 'number' ? left : undefined);
    }
    return data as T;
}

export interface OpenResponse {
    iv: string;
    ciphertext: string;
    views_left: number;
    expires_at: string;
}

export const api = {
    create: (body: CreateBody) => request<{ expires_at: string }>('/api/secrets', { method: 'POST', json: body }),
    params: (id: string) => request<unknown>(`/api/secrets/${encodeURIComponent(id)}/params`),
    open: (id: string, proof: string) => request<OpenResponse>(`/api/secrets/${encodeURIComponent(id)}/open`, { method: 'POST', json: { proof } }),
    destroy: (id: string, manageToken: string) =>
        request<void>(`/api/secrets/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Manage-Token': manageToken } }),
};

export type ErrorKey = 'unavailable' | 'invalid' | 'network' | 'throttled' | 'server' | 'conflict' | 'invalidInput';

/** Ordnet einen HTTP-Status einer Meldung zu. */
export function errorKey(error: ApiError): ErrorKey {
    switch (error.status) {
        case 0: return 'network';
        case 403: return 'invalid';
        case 404: return 'unavailable';
        case 409: return 'conflict';
        case 422: return 'invalidInput';
        case 429: return 'throttled';
        default: return 'server';
    }
}
