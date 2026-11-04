import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
const __dirname = dirname(fileURLToPath(import.meta.url));

const port = 8765;
const dev = process.env.E2E_DEV === '1';
// Der Dev-Lauf nutzt eigenen Vite-Port und eine eigene Hot-Datei, damit er ein laufendes `composer dev` nicht stört.
const vitePort = 5183;
const hotFile = resolve(__dirname, 'storage/framework/testing/e2e-hot');
const root = resolve(__dirname);
export const e2eDb = resolve(root, 'database/e2e.sqlite');
export const accessLog = resolve(root, 'storage/logs/e2e-access.log');

const appEnv = {
    APP_ENV: dev ? 'local' : 'testing',
    APP_DEBUG: 'false',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: e2eDb,
    CACHE_STORE: 'database',
    SESSION_DRIVER: 'array',
    LOG_LEVEL: 'debug', // so streng wie möglich: alles, was überhaupt geloggt wird, landet im Log und wird gescannt
    INERTIA_DEVTOOLS_ENABLED: 'false',
    INERTIA_SSR_ENABLED: 'false',
    ...(dev ? { VITE_HOT_FILE: hotFile } : {}),
};

// E2E_DEV=1 führt dieselben Tests gegen den Vite-Dev-Server in der lokalen Umgebung aus, wo die CSP den
// Dev-Server-Ursprung erlaubt (app/Http/Middleware/SecurityHeaders.php).
export default defineConfig({
    testDir: 'e2e',
    globalSetup: './e2e/global-setup.ts',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    use: { baseURL: `http://127.0.0.1:${port}` },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        ...(dev
            ? [{ command: 'npm run dev', url: `http://127.0.0.1:${vitePort}/@vite/client`, reuseExistingServer: false, env: { VITE_PORT: String(vitePort), VITE_HOT_FILE: hotFile } }]
            : []),
        {
            // Zugriffsprotokoll des Servers in eine Datei, damit der Klartext-Scan es durchsuchen kann.
            // php -S statt artisan serve: artisan serve reicht DB_DATABASE & Co. nicht an den Server weiter, die Tests
            // hätten sonst in die lokale Entwicklungs-Datenbank geschrieben.
            command: `sh -c "cd public && php -S 127.0.0.1:${port} -t . ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php >> '${accessLog}' 2>&1"`,
            url: `http://127.0.0.1:${port}/up`,
            reuseExistingServer: false,
            env: appEnv,
        },
    ],
});
