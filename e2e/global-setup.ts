import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Frische Datenbank und leere Logs für jeden Lauf, damit der Klartext-Scan nur diesen Lauf sieht.
export default function globalSetup(): void {
    const root = resolve(__dirname, '..');
    const db = resolve(root, 'database/e2e.sqlite');
    for (const f of [db, `${db}-wal`, `${db}-shm`]) rmSync(f, { force: true });
    writeFileSync(db, '');
    const logs = resolve(root, 'storage/logs');
    mkdirSync(logs, { recursive: true });
    // Playwright startet den Server vor globalSetup: sein Zugriffsprotokoll wird geleert, nicht gelöscht (offenes Handle).
    for (const f of readdirSync(logs)) {
        if (f === 'e2e-access.log') writeFileSync(resolve(logs, f), '');
        else if (f.endsWith('.log')) rmSync(resolve(logs, f), { force: true });
    }
    rmSync(resolve(root, 'storage/framework/testing/e2e-needles.json'), { force: true });
    if (!existsSync(resolve(root, 'public/build/manifest.json')) && process.env.E2E_DEV !== '1') {
        throw new Error('public/build fehlt: npm run e2e baut zuerst');
    }
    execFileSync('php', ['artisan', 'migrate', '--force'], {
        cwd: root,
        env: { ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'sqlite', DB_DATABASE: db, CACHE_STORE: 'array' },
        stdio: 'pipe',
    });
    // Die Zähler der Ratenbegrenzung liegen im Datenbank-Cache und überleben sonst den Lauf: ein zweiter Lauf
    // innerhalb einer Stunde liefe in das Limit von 20 Anlegevorgängen.
    execFileSync('php', ['artisan', 'cache:clear'], {
        cwd: root,
        env: { ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'sqlite', DB_DATABASE: db, CACHE_STORE: 'database' },
        stdio: 'pipe',
    });
}
