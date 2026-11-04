import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { readNeedles } from './helpers';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Klartext-Scan (docs/SPEC.md, Tests): Nach allen Abläufen werden Datenbank, Log-Dateien und das Zugriffsprotokoll
// des Servers nach Secret, Passwort UND Link-Key durchsucht. Es darf keinen Treffer geben. Läuft zuletzt (zz-).
const root = resolve(__dirname, '..');
const targets = (): string[] => {
    const logs = resolve(root, 'storage/logs');
    const files = existsSync(logs) ? readdirSync(logs).map((f) => resolve(logs, f)) : [];
    const db = resolve(root, 'database/e2e.sqlite');
    return [db, `${db}-wal`, `${db}-shm`, ...files].filter(existsSync);
};

/** Sucht eine Zeichenfolge in drei Kodierungen: roh, base64 und hex. */
export function findNeedle(haystack: Buffer, needle: string): string | null {
    const b = Buffer.from(needle, 'utf8');
    const forms: [string, string | Buffer][] = [['roh', b], ['base64', b.toString('base64').replace(/=+$/, '')], ['base64url', b.toString('base64url')], ['hex', b.toString('hex')]];
    for (const [name, form] of forms) if (haystack.includes(form)) return name;
    return null;
}

test('Positivkontrolle: der Scan findet einen bekannten Wert in Datenbank, und die Suche selbst funktioniert', async () => {
    const verifier = readNeedles().find((n) => n.startsWith('VERIFIER:'))!.slice('VERIFIER:'.length);
    // Im WAL-Modus stehen frische Zeilen zuerst in der -wal-Datei, darum werden Hauptdatei und -wal gemeinsam gelesen.
    const dbFiles = ['', '-wal'].map((s) => resolve(root, `database/e2e.sqlite${s}`)).filter(existsSync).map((f) => readFileSync(f));
    expect(findNeedle(Buffer.concat(dbFiles), verifier)).not.toBeNull(); // der Verifier ist absichtlich in der Datenbank
    expect(findNeedle(Buffer.from('xx geheim yy'), 'geheim')).toBe('roh');
    expect(findNeedle(Buffer.from(Buffer.from('geheim').toString('base64')), 'geheim')).toBe('base64');
    expect(findNeedle(Buffer.from('nichts'), 'geheim')).toBeNull();
});

test('weder Secret noch Passwort noch Link-Key stehen in Datenbank, Logs oder Zugriffsprotokoll', async () => {
    const needles = readNeedles().filter((n) => !n.startsWith('VERIFIER:') && n.length >= 8);
    expect(needles.length).toBeGreaterThan(15); // es wurden viele Abläufe aufgezeichnet
    const files = targets();
    expect(files.some((f) => f.endsWith('e2e.sqlite'))).toBe(true);
    expect(files.some((f) => f.endsWith('e2e-access.log'))).toBe(true);
    // Die Tests dürfen nie in die Entwicklungs-Datenbank geschrieben haben.
    const dev = resolve(root, 'database/database.sqlite');
    expect(existsSync(dev) ? findNeedle(readFileSync(dev), 'VERIFIER') : null).toBeNull();
    const accessLog = readFileSync(resolve(root, 'storage/logs/e2e-access.log'));
    expect(accessLog.length).toBeGreaterThan(100); // das Zugriffsprotokoll ist nicht leer, die Suche läuft also über echte Daten

    const hits: string[] = [];
    for (const file of files) {
        const data = readFileSync(file);
        for (const n of needles) {
            // Zeilenumbrüche im Secret werden zeilenweise gesucht.
            for (const part of n.split('\n').filter((p) => p.length >= 8)) {
                const form = findNeedle(data, part);
                if (form) hits.push(`${file.replace(root, '.')}: "${part.slice(0, 12)}…" (${form})`);
            }
        }
    }
    expect(hits).toEqual([]);
});
