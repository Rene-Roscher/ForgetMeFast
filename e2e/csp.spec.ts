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
    await expect(page.getByRole('heading', { name: 'Neues Secret' })).toBeVisible();
    expect(await page.locator('script:not([src]):not([type="application/json"])').count()).toBe(0);
    if (process.env.E2E_DEV === '1') {
        // Proves the dev run really loads scripts from the Vite dev server and not from public/build.
        expect(await page.locator('script[src*=":5183"]').count()).toBeGreaterThan(0);
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
    await expect(page.getByRole('heading', { name: 'Neues Secret' })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('16px "Plus Jakarta Sans"'))).toBe(true);
    expect(external).toEqual([]);
    await context.close();
});

test('der Umschalter wechselt das Design, merkt sich die Wahl und flackert beim Laden nicht', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('/');
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));

    expect(await isDark()).toBe(false);
    await page.getByTestId('theme-toggle').click();
    expect(await isDark()).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('fmf-theme'))).toBe('dark');
    await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Helles Design einschalten');

    // Nach dem Neuladen gilt die Wahl, und zwar schon beim Parsen: das blockierende Skript setzt die Klasse vor dem ersten Zeichnen.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await isDark()).toBe(true);
    // Wer "dark" gespeichert hat, bekommt es auch gegen die Systemeinstellung "hell"; "light" gilt auch bei "dunkel".
    const dark = await browser.newContext({ colorScheme: 'dark' });
    const p2 = await dark.newPage();
    await p2.addInitScript(() => localStorage.setItem('fmf-theme', 'light'));
    await p2.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await p2.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);

    await page.getByTestId('theme-toggle').click();
    expect(await page.evaluate(() => localStorage.getItem('fmf-theme'))).toBe('light');
    // Es wird nur diese eine Einstellung gespeichert, und es gibt weiterhin kein Cookie.
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['fmf-theme']);
    expect(await ctx.cookies()).toEqual([]);
    await ctx.close();
    await dark.close();
});

test('die Seitenleiste zeigt die Vertrauensaussagen, die das Projekt belegt, und nennt die Grenzen', async ({ page }) => {
    await page.goto('/');
    const side = page.getByTestId('sidebar');
    for (const text of ['Im Browser verschlüsselt', 'Zero Knowledge', 'Schlüssel bleibt im Link', 'Löscht sich selbst', 'Gehärtetes Passwort', 'Keine Accounts, keine Cookies, kein Tracking.']) {
        await expect(side).toContainText(text);
    }
    await side.getByRole('button', { name: 'Wie weit reicht der Schutz?' }).click();
    await expect(side).toContainText('Das schützt nicht');
    await expect(side).toContainText('manipulierten Code');
    await expect(page.getByTestId('secure-indicator')).toContainText('Sichere Verbindung');
});
