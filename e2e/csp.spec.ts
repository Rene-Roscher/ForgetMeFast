import { expect, test } from '@playwright/test';

// Acceptance criterion: Inertia and Vite run under the strict CSP without inline scripts.
test('home page boots Inertia under the strict CSP without violations', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (msg) => {
        if (['error', 'warning'].includes(msg.type())) problems.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
    await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
            console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
        });
    });

    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");

    // The Vue app only renders this heading after Inertia mounted, so it proves the JS ran under the CSP.
    await expect(page.getByRole('heading', { name: 'Secret teilen' })).toBeVisible();
    expect(await page.locator('script:not([src]):not([type="application/json"])').count()).toBe(0);
    if (process.env.E2E_DEV === '1') {
        // Proves the dev run really loads scripts from the Vite dev server and not from public/build.
        expect(await page.locator('script[src*=":5173"]').count()).toBeGreaterThan(0);
    }
    expect(problems).toEqual([]);
});

test('no response sets a cookie', async ({ page, context }) => {
    await page.goto('/');
    expect(await context.cookies()).toEqual([]);
});

test('fonts load from the same origin and the theme follows the system without a flash', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    const external: string[] = [];
    page.on('request', (req) => {
        if (!req.url().startsWith('http://127.0.0.1')) external.push(req.url());
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Secret teilen' })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('16px "Plus Jakarta Sans"'))).toBe(true);
    expect(external).toEqual([]);
    await context.close();
});
