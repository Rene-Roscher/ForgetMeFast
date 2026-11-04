import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

// Erzeugt die Bilder und die GIF für die README (docs/media/). Läuft nur mit `npm run docs:media` (MEDIA=1), nie im
// normalen E2E-Lauf. Die Bilder zeigen die echte Anwendung mit erfundenen Beispielwerten.
test.skip(process.env.MEDIA !== '1', 'nur für npm run docs:media');
test.setTimeout(120_000);

const out = resolve(import.meta.dirname, '../docs/media');
const SECRET = 'DB_HOST=db.example.test\nDB_USER=app\nDB_PASSWORD=EXAMPLE-not-a-real-password';

test('Bilder und Ablauf-GIF für die README', async ({ browser }) => {
    const size = { width: 1200, height: 720 };

    // Standbilder: hell und dunkel
    for (const scheme of ['light', 'dark'] as const) {
        const ctx = await browser.newContext({ viewport: size, colorScheme: scheme, permissions: ['clipboard-read', 'clipboard-write'] });
        const page = await ctx.newPage();
        await page.goto('/');
        await page.locator('#secret').fill(SECRET);
        await page.locator('#secret').blur();
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(out, `erstellen-${scheme === 'light' ? 'hell' : 'dunkel'}.png`) });
        if (scheme === 'light') {
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
            await page.waitForTimeout(500);
            await page.screenshot({ path: join(out, 'ergebnis.png') });
            const link = (await page.getByTestId('result-link').textContent())!.trim();
            const password = (await page.getByTestId('result-password').textContent())!.trim();
            await page.goto(link);
            await expect(page.locator('#view-password')).toBeVisible();
            await page.waitForTimeout(300);
            await page.screenshot({ path: join(out, 'empfaenger.png') });
            await page.locator('#view-password').fill(password);
            await page.getByTestId('view-submit').click();
            await expect(page.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
            await page.getByTestId('reveal').click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: join(out, 'secret-angezeigt.png') });
        }
        await ctx.close();
    }

    // GIF: Erstellen, Link öffnen, Passwort eingeben, lesen, danach ist es weg
    const tmp = mkdtempSync(join(tmpdir(), 'fmf-media-'));
    const ctx = await browser.newContext({ viewport: size, colorScheme: 'light', recordVideo: { dir: tmp, size } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForTimeout(1800); // der Platzhalter läuft
    await page.locator('#secret').click();
    await page.locator('#secret').pressSequentially(SECRET, { delay: 35 });
    await page.waitForTimeout(700);
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1600);
    const link = (await page.getByTestId('result-link').textContent())!.trim();
    const password = (await page.getByTestId('result-password').textContent())!.trim();
    await page.goto(link);
    await expect(page.locator('#view-password')).toBeVisible();
    await page.waitForTimeout(900);
    await page.locator('#view-password').pressSequentially(password, { delay: 22 });
    await page.waitForTimeout(500);
    await page.getByTestId('view-submit').click();
    await expect(page.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(900);
    await page.getByTestId('reveal').click();
    await page.waitForTimeout(1800);
    await page.goto('about:blank');
    await page.goto(link); // zweiter Aufruf: das Secret ist weg
    await expect(page.getByTestId('unavailable')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1800);
    const video = page.video()!;
    await ctx.close();
    const webm = await video.path();
    renameSync(webm, join(tmp, 'flow.webm'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, 'flow.webm'), '-vf', 'fps=8,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle', join(out, 'ablauf.gif')]);
    rmSync(tmp, { recursive: true, force: true });
});
