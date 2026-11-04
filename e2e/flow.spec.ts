import { expect, test } from '@playwright/test';
import { create, rememberNeedles, tryPassword } from './helpers';

test('erstellen, in zweitem Browser-Kontext öffnen, Secret stimmt; Link-Key erreicht nie den Server', async ({ browser }) => {
    const ctxA = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const a = await ctxA.newPage();
    const secret = 'Zugang für Kunde: pässwörd 🔐 ключ\nzweite Zeile';
    const created = await create(a, { secret });

    // Kopieren legt genau den Link in die Zwischenablage.
    await a.getByTestId('result-link').locator('xpath=ancestor::section[1]').getByRole('button', { name: 'Kopieren' }).click();
    expect(await a.evaluate(() => navigator.clipboard.readText())).toBe(created.link);

    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    const sent: string[] = [];
    b.on('request', (r) => sent.push(`${r.method()} ${r.url()} ${r.postData() ?? ''} ${JSON.stringify(r.headers())}`));

    await b.goto(created.link);
    await expect(b.locator('#view-password')).toBeVisible();
    // Das Fragment wird sofort aus der Adresse entfernt.
    expect(b.url()).not.toContain('#');
    expect(b.url()).not.toContain(created.linkKey);

    await tryPassword(b, created.password);
    await expect(b.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
    await b.getByTestId('reveal').click();
    await expect(b.getByTestId('secret-text')).toHaveText(secret);
    await expect(b.getByTestId('views-left')).toContainText('letzte Abruf');

    const everything = sent.join('\n');
    expect(everything).not.toContain(created.linkKey);
    expect(everything).not.toContain(created.password);
    expect(everything).not.toContain('pässwörd');
    expect(everything).toContain('/api/secrets/' + created.id + '/open');
    await ctxA.close();
    await ctxB.close();
});

test('der Link ist nach dem einen Abruf nicht mehr verfügbar', async ({ browser }) => {
    const ctx = await browser.newContext();
    const created = await create(await ctx.newPage(), { secret: 'einmalig', views: 1 });
    const first = await ctx.newPage();
    await first.goto(created.link);
    await tryPassword(first, created.password);
    await expect(first.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });

    const second = await ctx.newPage();
    await second.goto(created.link);
    await expect(second.getByTestId('unavailable')).toBeVisible();
    await expect(second.getByRole('heading', { name: 'Nicht mehr verfügbar' })).toBeVisible();
    await ctx.close();
});

test('mehrere Abrufe zählen herunter', async ({ browser }) => {
    const ctx = await browser.newContext();
    const created = await create(await ctx.newPage(), { secret: 'zweimal', views: 2 });
    for (const text of ['Noch 1 Abruf möglich.', 'letzte Abruf']) {
        const p = await ctx.newPage();
        await p.goto(created.link);
        await tryPassword(p, created.password);
        await expect(p.getByTestId('views-left')).toContainText(text, { timeout: 15_000 });
    }
    await ctx.close();
});

test('dreimal falsches Passwort vernichtet das Secret', async ({ browser }) => {
    const ctx = await browser.newContext();
    const created = await create(await ctx.newPage(), { secret: 'wird zerstört', attempts: 3 });
    const p = await ctx.newPage();
    await p.goto(created.link);

    await tryPassword(p, 'falsches-passwort-eins');
    await expect(p.getByTestId('status')).toContainText('Noch 2 Versuche.');
    await expect(p.locator('#view-password')).toBeFocused();
    await tryPassword(p, 'falsches-passwort-zwei');
    await expect(p.getByTestId('status')).toContainText('Noch 1 Versuch.');
    await tryPassword(p, 'falsches-passwort-drei');
    await expect(p.getByTestId('unavailable')).toBeVisible();
    await expect(p.getByTestId('unavailable')).toContainText('letzte Versuch');

    // Auch das richtige Passwort hilft jetzt nicht mehr.
    const again = await ctx.newPage();
    await again.goto(created.link);
    await expect(again.getByTestId('unavailable')).toBeVisible();
    await ctx.close();
});

test('der richtige Proof gibt den Versuch zurück: zwei Fehlversuche, dann richtig, funktioniert', async ({ browser }) => {
    const ctx = await browser.newContext();
    const created = await create(await ctx.newPage(), { secret: 'trotz zweier Fehler', views: 2, attempts: 3 });
    const p = await ctx.newPage();
    await p.goto(created.link);
    await tryPassword(p, 'falsches-passwort-eins');
    await tryPassword(p, 'falsches-passwort-zwei');
    await expect(p.getByTestId('status')).toContainText('Noch 1 Versuch');
    await tryPassword(p, created.password);
    await expect(p.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
    await ctx.close();
});

test('Jetzt vernichten fragt nach und macht den Link unbrauchbar', async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    const created = await create(a, { secret: 'vorzeitig weg' });

    await a.getByTestId('destroy').click();
    const dialog = a.getByRole('dialog', { name: 'Secret endgültig vernichten?' });
    await expect(dialog).toContainText('Danach funktioniert der Link nicht mehr');
    // Der Fokus liegt im Dialog (Reka UI fokussiert das erste Bedienelement).
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await a.getByTestId('destroy-confirm').click();
    await expect(a.getByTestId('destroy')).toHaveCount(0);
    await expect(a.getByTestId('destroyed')).toBeVisible();

    const b = await ctx.newPage();
    await b.goto(created.link);
    await expect(b.getByTestId('unavailable')).toBeVisible();
    await ctx.close();
});

test('Link ohne Fragment: "Link unvollständig", und es wird nichts abgefragt', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', (r) => calls.push(r.url()));
    await page.goto('/s/AAAAAAAAAAAAAAAAAAAAAA');
    await expect(page.getByTestId('incomplete')).toBeVisible();
    expect(calls.filter((u) => u.includes('/api/'))).toEqual([]);
});

test('unbekannte id: dieselbe Seite "Nicht verfügbar"', async ({ page }) => {
    await page.goto('/s/AAAAAAAAAAAAAAAAAAAAAA#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    await expect(page.getByTestId('unavailable')).toBeVisible();
});

test('Prüfen vor dem Senden: der Dialog zeigt exakt den Body, der danach gesendet wird', async ({ page }) => {
    const secret = 'sehr geheimer Klartext 12345';
    const password = 'ein-ziemlich-langes-passwort';
    rememberNeedles(secret, password);
    await page.goto('/');
    await page.locator('#secret').fill(secret);
    await page.locator('#password').fill(password);
    await page.getByRole('switch', { name: 'Vor dem Senden prüfen' }).click();

    const posted: string[] = [];
    page.on('request', (r) => r.url().endsWith('/api/secrets') && r.method() === 'POST' && posted.push(r.postData() ?? ''));
    await page.getByTestId('submit').click();
    const dialog = page.getByRole('dialog', { name: 'Das verlässt deinen Browser' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const shown = JSON.parse((await page.getByTestId('server-body').textContent())!) as Record<string, unknown>;
    expect(posted).toEqual([]); // vor der Bestätigung wurde nichts gesendet
    await expect(page.getByTestId('result')).toHaveCount(0);

    // Esc schließt den Dialog, der Fokus kehrt zum Auslöser zurück, und es wurde immer noch nichts gesendet.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('submit')).toBeFocused();
    expect(posted).toEqual([]);

    await page.getByTestId('submit').click();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/secrets') && r.method() === 'POST');
    await page.getByTestId('review-send').click();
    const sent = JSON.parse((await requestPromise).postData()!) as Record<string, unknown>;

    // Nach dem erneuten Verschlüsseln sind Zufallswerte neu. Der Dialog, der zu DIESEM Senden gehörte, hat denselben Aufbau.
    expect(Object.keys(shown).sort()).toEqual(Object.keys(sent).sort());
    const { ciphertext: sentCt, ...sentRest } = sent as { ciphertext: string };
    expect(sentCt.length).toBeGreaterThan(1000);
    expect(Object.keys(sentRest).sort()).toEqual(['id', 'iv', 'kdf', 'manage_hash', 'max_attempts', 'max_views', 'salt', 'ttl', 'v', 'verifier']);

    const raw = JSON.stringify(sent);
    expect(raw).not.toContain(secret);
    expect(raw).not.toContain(password);
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    const linkKey = (await page.getByTestId('result-link').textContent())!.split('#')[1]!;
    expect(raw).not.toContain(linkKey);
    rememberNeedles(linkKey, `VERIFIER:${String(sent.verifier)}`);
});

test('der Dialog zeigt exakt den gesendeten Body, wenn man ohne Esc bestätigt', async ({ page }) => {
    await page.goto('/');
    await page.locator('#secret').fill('Body-Vergleich');
    await page.locator('#password').fill('mindestens-zehn-zeichen');
    await page.getByRole('switch', { name: 'Vor dem Senden prüfen' }).click();
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('server-body')).toBeVisible({ timeout: 15_000 });
    const shown = JSON.parse((await page.getByTestId('server-body').textContent())!) as Record<string, string>;
    const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/secrets') && r.method() === 'POST');
    await page.getByTestId('review-send').click();
    const sent = JSON.parse((await requestPromise).postData()!) as Record<string, unknown> & { ciphertext: string };

    const { ciphertext: shownCt, ...shownRest } = shown;
    const { ciphertext: sentCt, ...sentRest } = sent;
    expect(shownRest).toEqual(sentRest);
    expect(shownCt).toBe(`${sentCt.slice(0, 48)}… (${sentCt.length} Zeichen)`);
    rememberNeedles('Body-Vergleich', 'mindestens-zehn-zeichen');
});

test('ohne Prüfen genügt ein Klick', async ({ page }) => {
    await page.goto('/');
    await page.locator('#secret').fill('ein Klick');
    await page.locator('#password').fill('mindestens-zehn-zeichen');
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    rememberNeedles('ein Klick', 'mindestens-zehn-zeichen');
});

test('Passwort zu kurz und leeres Secret sperren den Button; Zähler warnt bei Überlänge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('submit')).toBeDisabled();
    await page.locator('#secret').fill('x');
    await page.locator('#password').fill('kurz');
    await expect(page.getByTestId('submit')).toBeDisabled();
    await expect(page.getByText('mindestens 10 Zeichen', { exact: false }).first()).toBeVisible();
    await page.locator('#password').fill('lang-genug-jetzt');
    await expect(page.getByTestId('submit')).toBeEnabled();
    await page.locator('#secret').fill('a'.repeat(65533));
    await expect(page.getByTestId('submit')).toBeDisabled();
    await expect(page.locator('#secret')).toHaveAttribute('aria-invalid', 'true');
});

test('Würfeln erzeugt ein Passwort und zeigt die Stärke: exakt für erzeugt, Schätzung für getippt', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('dice-words').click();
    await expect(page.getByTestId('strength')).toContainText('65 Bit');
    await expect(page.getByTestId('strength')).toContainText('zufällig erzeugt');
    expect((await page.locator('#password').inputValue()).split('-').length).toBeGreaterThanOrEqual(5);
    await page.getByTestId('dice-chars').click();
    await expect(page.getByTestId('strength')).toContainText('95 Bit');
    expect(await page.locator('#password').inputValue()).toMatch(/^[A-Za-z0-9]{16}$/);
    await page.locator('#password').fill('selbst getippt 123');
    await expect(page.getByTestId('strength')).toContainText('geschätzt');
});

test('Argon2id läuft in einem Worker unter der strikten CSP und die Zeit ist im Rahmen', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => m.type() === 'error' && violations.push(m.text()));
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    await page.goto('/');
    await page.locator('#secret').fill('zeit');
    await page.locator('#password').fill('mindestens-zehn-zeichen');
    const t0 = Date.now();
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    const ms = Date.now() - t0;
    console.log(`Erstellen inklusive Argon2id (m=19456, t=2, p=1), Worker, Netzwerk: ${ms} ms (Chromium, Desktop)`);
    expect(workers.length).toBeGreaterThan(0);
    expect(workers.every((u) => u.startsWith('http://127.0.0.1') && !u.startsWith('blob:'))).toBe(true);
    expect(violations).toEqual([]);
    expect(ms).toBeLessThan(5000);
    rememberNeedles('zeit', 'mindestens-zehn-zeichen');
});
