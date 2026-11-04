import { defineConfig, devices } from '@playwright/test';

const port = 8765;
const dev = process.env.E2E_DEV === '1';

// E2E_DEV=1 runs the same specs against the Vite dev server in the local environment,
// where the CSP allows the dev server origin (see app/Http/Middleware/SecurityHeaders.php).
export default defineConfig({
    testDir: 'e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    use: { baseURL: `http://127.0.0.1:${port}` },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        ...(dev
            ? [
                  {
                      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
                      url: 'http://127.0.0.1:5173/@vite/client',
                      reuseExistingServer: false,
                  },
              ]
            : []),
        {
            command: `php artisan serve --host=127.0.0.1 --port=${port}`,
            url: `http://127.0.0.1:${port}/up`,
            reuseExistingServer: !process.env.CI && !dev,
            env: { APP_ENV: dev ? "local" : "testing", INERTIA_DEVTOOLS_ENABLED: "false", INERTIA_SSR_ENABLED: "false" },
        },
    ],
});
