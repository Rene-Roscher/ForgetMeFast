import { ref, watch } from 'vue';
import { MAX_COUNT, TTL_SECONDS } from '@/crypto';

// Zuletzt gewählte Regeln, nur in diesem Browser (`localStorage`, Schlüssel `fmf-prefs`). Gespeichert sind Ablauf, Abrufe,
// Fehlversuche, "Einmalig" und die Art des Passworts (Wörter oder Zeichen). Nie ein Passwort, nie ein Secret. Jeder Wert wird
// streng geprüft; alles Unlesbare führt zu den Standardwerten.
export interface Prefs {
    ttl: number;
    views: number;
    attempts: number;
    oneTime: boolean;
    mode: 'words' | 'chars';
}

const KEY = 'fmf-prefs';
export const DEFAULT_PREFS: Prefs = { ttl: 86400, views: 1, attempts: 3, oneTime: true, mode: 'words' };

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_COUNT;

export function parsePrefs(raw: string | null): Prefs {
    if (raw === null) return { ...DEFAULT_PREFS };
    try {
        const v = JSON.parse(raw) as Record<string, unknown>;
        if (typeof v !== 'object' || v === null) return { ...DEFAULT_PREFS };
        return {
            ttl: (TTL_SECONDS as readonly number[]).includes(v.ttl as number) ? (v.ttl as number) : DEFAULT_PREFS.ttl,
            views: isCount(v.views) ? v.views : DEFAULT_PREFS.views,
            attempts: isCount(v.attempts) ? v.attempts : DEFAULT_PREFS.attempts,
            oneTime: typeof v.oneTime === 'boolean' ? v.oneTime : DEFAULT_PREFS.oneTime,
            mode: v.mode === 'chars' ? 'chars' : 'words',
        };
    } catch {
        return { ...DEFAULT_PREFS };
    }
}

export function loadPrefs(): Prefs {
    try {
        return parsePrefs(localStorage.getItem(KEY));
    } catch {
        return { ...DEFAULT_PREFS };
    }
}

export function savePrefs(prefs: Prefs): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
        // Speicher voll oder gesperrt: die Wahl gilt dann nur für diese Sitzung.
    }
}

/** Reaktive Regeln, die bei jeder Änderung gespeichert werden. */
export function usePrefs() {
    const loaded = loadPrefs();
    const prefs = ref<Prefs>(loaded);
    watch(prefs, (p) => savePrefs(p), { deep: true });
    return prefs;
}
