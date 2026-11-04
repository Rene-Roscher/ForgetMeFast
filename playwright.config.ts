import { defineConfig, devices } from '@playwright/test';

const port = 8765;

export default defineConfig({
    testDir: 'e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    use: { baseURL: `http://127.0.0.1:${port}` },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `php artisan serve --host=127.0.0.1 --port=${port}`,
        url: `http://127.0.0.1:${port}/up`,
        reuseExistingServer: !process.env.CI,
        env: { APP_ENV: 'testing' },
    },
});
