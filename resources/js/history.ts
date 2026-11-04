import { ref } from 'vue';

// Verlauf der eigenen Secrets, nur in diesem Browser (localStorage). Gespeichert wird der Link (er enthält den Schlüssel
// hinter dem #) und das Verwaltungstoken (für Status und Vernichten), aber NIE das Passwort und NIE der Klartext.
// Das weicht von der Invariante "Fragment nie speichern" ab und ist auf Wunsch des Maintainers entschieden: ADR 0006.
export interface HistoryEntry {
    id: string;
    link: string;
    manageToken: string;
    createdAt: number;
    expiresAt: number;
    ttl: number;
    maxViews: number;
}

export type HistoryState = 'active' | 'expired' | 'gone' | 'unknown';

export const HISTORY_KEY = 'fmf-history';
export const HISTORY_MAX = 20;
/** Abgelaufene Einträge bleiben noch einen Tag sichtbar, danach verschwinden sie von selbst. */
export const KEEP_AFTER_EXPIRY_MS = 24 * 60 * 60 * 1000;

const LINK = /^https?:\/\/[^\s/]+\/s\/[A-Za-z0-9_-]{22}#[A-Za-z0-9_-]{43}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const ID = /^[A-Za-z0-9_-]{22}$/;

/** Streng geprüft, weil der Speicher von außen veränderbar ist: nur wohlgeformte Einträge kommen durch. */
export function isEntry(v: unknown): v is HistoryEntry {
    if (typeof v !== 'object' || v === null) return false;
    const e = v as Record<string, unknown>;
    const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
    return (
        typeof e.id === 'string' && ID.test(e.id) &&
        typeof e.link === 'string' && LINK.test(e.link) && e.link.includes(`/s/${e.id}#`) &&
        typeof e.manageToken === 'string' && TOKEN.test(e.manageToken) &&
        num(e.createdAt) && num(e.expiresAt) && num(e.ttl) && num(e.maxViews)
    );
}

export function prune(list: HistoryEntry[], now = Date.now()): HistoryEntry[] {
    return list
        .filter((e) => e.expiresAt + KEEP_AFTER_EXPIRY_MS > now)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, HISTORY_MAX);
}

function read(): HistoryEntry[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    } catch {
        return [];
    }
}

function write(list: HistoryEntry[]): void {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch {
        // Speicher gesperrt oder voll: der Verlauf gilt dann nur, solange die Seite offen ist.
    }
}

const entries = ref<HistoryEntry[]>([]);
let loaded = false;

export function useHistory() {
    if (!loaded) {
        const stored = read();
        entries.value = prune(stored);
        // Nur schreiben, wenn aufgeräumt wurde: Ein bloßes Laden der Seite legt keinen Eintrag im Speicher an.
        if (entries.value.length !== stored.length) write(entries.value);
        loaded = true;
    }
    return {
        entries,
        add(entry: HistoryEntry): void {
            entries.value = prune([entry, ...entries.value.filter((e) => e.id !== entry.id)]);
            write(entries.value);
        },
        remove(id: string): void {
            entries.value = entries.value.filter((e) => e.id !== id);
            write(entries.value);
        },
        clear(): void {
            entries.value = [];
            write(entries.value);
        },
    };
}

/** Test-Hilfe: setzt den Zustand zurück, damit der nächste Aufruf neu liest. */
export function resetHistoryForTests(): void {
    loaded = false;
    entries.value = [];
}
