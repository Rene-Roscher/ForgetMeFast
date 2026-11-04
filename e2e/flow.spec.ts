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

test('das Gesendete enthält weder Klartext noch Passwort noch Link-Key und genau die erwarteten Felder', async ({ page }) => {
    const secret = 'sehr geheimer Klartext 12345';
    const password = 'ein-ziemlich-langes-passwort';
    rememberNeedles(secret, password);
    await page.goto('/');
    await page.locator('#secret').fill(secret);
    await page.locator('#password').fill(password);
    const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/secrets') && r.method() === 'POST');
    await page.getByTestId('submit').click();
    const sent = JSON.parse((await requestPromise).postData()!) as Record<string, unknown>;
    const { ciphertext, ...rest } = sent as { ciphertext: string };
    expect(ciphertext.length).toBeGreaterThan(1000);
    expect(Object.keys(rest).sort()).toEqual(['id', 'iv', 'kdf', 'manage_hash', 'max_attempts', 'max_views', 'salt', 'ttl', 'v', 'verifier']);

    const raw = JSON.stringify(sent);
    expect(raw).not.toContain(secret);
    expect(raw).not.toContain(password);
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    const linkKey = (await page.getByTestId('result-link').textContent())!.split('#')[1]!;
    expect(raw).not.toContain(linkKey);
    rememberNeedles(linkKey, `VERIFIER:${String(sent.verifier)}`);
});

test('ohne Prüfen genügt ein Klick', async ({ page }) => {
    await page.goto('/');
    await page.locator('#secret').fill('ein Klick');
    await page.locator('#password').fill('mindestens-zehn-zeichen');
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    rememberNeedles('ein Klick', 'mindestens-zehn-zeichen');
});

test('Passwort zu kurz und leeres Secret sperren den Button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('submit')).toBeDisabled(); // leeres Secret
    await page.locator('#secret').fill('x');
    await expect(page.getByTestId('submit')).toBeEnabled(); // erzeugtes Passwort ist lang genug
    await page.locator('#password').fill('kurz');
    await expect(page.getByTestId('submit')).toBeDisabled();
    await expect(page.getByText('Das Passwort ist zu kurz')).toBeVisible();
    await page.locator('#password').fill('lang-genug-jetzt');
    await expect(page.getByTestId('submit')).toBeEnabled();
});

test('Limit-Hinweis: nichts bei normaler Länge, freundlich kurz vor dem Limit, deutlich darüber', async ({ page }) => {
    await page.goto('/');
    const hint = page.getByTestId('secret-limit');
    await page.locator('#secret').fill('ein ganz normales Secret');
    await expect(hint).toHaveText('');
    expect(await page.getByText(/Byte/).count()).toBe(0); // keine Byte-Angaben für normale Menschen

    await page.locator('#secret').fill('a'.repeat(60000));
    await expect(hint).toContainText('Noch etwa');
    await expect(hint).toContainText('Zeichen Platz');
    await expect(page.getByTestId('submit')).toBeEnabled();

    await page.locator('#secret').fill('a'.repeat(65533));
    await expect(hint).toContainText('Zu lang');
    await expect(page.locator('#secret')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('submit')).toBeDisabled();
});

test('beim Laden ist schon ein Passwort erzeugt, sichtbar, und bei jedem Neuladen ein neues', async ({ page }) => {
    await page.goto('/');
    const first = await page.locator('#password').inputValue();
    expect(first.split('-').length).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId('strength')).toContainText('65 Bit');
    await expect(page.getByTestId('strength')).toContainText('zufällig erzeugt');
    await page.reload();
    const second = await page.locator('#password').inputValue();
    expect(second).not.toBe(first);
    expect(second.split('-').length).toBeGreaterThanOrEqual(5);
});

test('Passwort neu erzeugen, Art wechseln und selbst tippen: exakte Bits für erzeugt, Schätzung für getippt', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('#password').inputValue();
    await page.getByTestId('pw-refresh').click();
    expect(await page.locator('#password').inputValue()).not.toBe(before);

    await page.getByTestId('pw-mode-chars').click();
    await expect(page.getByTestId('strength')).toContainText('95 Bit');
    expect(await page.locator('#password').inputValue()).toMatch(/^[A-Za-z0-9]{16}$/);
    await page.getByTestId('pw-mode-words').click();
    await expect(page.getByTestId('strength')).toContainText('65 Bit');

    await page.locator('#password').fill('selbst getippt 123');
    await expect(page.getByTestId('strength')).toContainText('geschätzt');
});

test('Fehler erscheinen als Toast oben mittig, mit Schließen, und blockieren nichts', async ({ page }) => {
    await page.goto('/');
    await page.route('**/api/secrets', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 500, body: '{}' }) : r.continue()));
    await page.locator('#secret').fill('Fehlerfall');
    await page.getByTestId('submit').click();

    const toast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Der Server hat einen Fehler gemeldet');
    const box = (await toast.boundingBox())!;
    const width = page.viewportSize()!.width;
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(24); // mittig
    expect(box.y).toBeLessThan(40); // oben
    // Der Fehler steht nicht zusätzlich als Box im Formular, und die Eingabe ist unverändert.
    await expect(page.locator('#secret')).toHaveValue('Fehlerfall');
    await toast.hover();
    await toast.getByRole('button', { name: 'Meldung schließen' }).click();
    await expect(toast).toHaveCount(0);

    // Netzwerkfehler: eigene, ehrliche Meldung.
    await page.unroute('**/api/secrets');
    await page.route('**/api/secrets', (r) => r.abort());
    await page.getByTestId('submit').click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText('Keine Verbindung zum Server');
});

test('Kopieren meldet sich als Toast', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await ctx.newPage();
    const created = await create(page, { secret: 'Toast-Test' });
    await page.getByTestId('result-link').locator('xpath=ancestor::section[1]').getByRole('button', { name: 'Kopieren' }).click();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText('Link kopiert');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(created.link);
    await ctx.close();
});

test('Verlauf: Link und Verwaltungstoken, nie Passwort oder Klartext; Abrufe und Status vom Server', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const a = await ctx.newPage();
    const secret = 'Verlauf-Geheimnis-98765';
    const created = await create(a, { secret, views: 2 });

    // Gespeichert ist der Link (mit Schlüssel) und das Verwaltungstoken, aber nichts vom Passwort oder vom Klartext.
    const raw = await a.evaluate(() => localStorage.getItem('fmf-history'));
    expect(raw).toContain(created.linkKey);
    expect(raw).not.toContain(created.password);
    expect(raw).not.toContain(secret);
    expect(Object.keys(JSON.parse(raw!)[0]).sort()).toEqual(['createdAt', 'expiresAt', 'id', 'link', 'manageToken', 'maxViews', 'ttl']);

    await a.goto('/');
    await a.getByTestId('history-open').click();
    const row = a.getByTestId('history-row').first();
    await expect(row.getByTestId('history-state')).toHaveText('Aktiv');
    await expect(row.getByTestId('history-views')).toContainText('0 von 2 Abrufen');

    // Ein Empfänger öffnet einmal: der Verlauf zählt mit.
    const b = await ctx.newPage();
    await b.goto(created.link);
    await tryPassword(b, created.password);
    await expect(b.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
    await a.getByTestId('history-refresh').click();
    await expect(row.getByTestId('history-views')).toContainText('1 von 2 Abrufen');

    // Link kopieren aus dem Verlauf.
    await row.getByTestId('history-copy').click();
    expect(await a.evaluate(() => navigator.clipboard.readText())).toBe(created.link);

    // Vernichten aus dem Verlauf: Dialog, danach "Gelesen oder vernichtet".
    await row.getByTestId('history-destroy').click();
    await a.getByTestId('history-destroy-confirm').click();
    await expect(row.getByTestId('history-state')).toHaveText('Gelesen oder vernichtet');
    await expect(row.getByTestId('history-destroy')).toHaveCount(0);

    // Eintrag entfernen und alles leeren.
    await row.getByTestId('history-remove').click();
    await expect(a.getByTestId('history-empty')).toBeVisible();
    expect(await a.evaluate(() => JSON.parse(localStorage.getItem('fmf-history') ?? '[]'))).toEqual([]);
    await ctx.close();
});

test('Verlauf: ein von einem Empfänger leergelesenes Secret erscheint als "Gelesen oder vernichtet"', async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    const created = await create(a, { secret: 'einmal lesen', views: 1 });
    const b = await ctx.newPage();
    await b.goto(created.link);
    await tryPassword(b, created.password);
    await expect(b.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
    await a.goto('/');
    await a.getByTestId('history-open').click();
    await expect(a.getByTestId('history-row').first().getByTestId('history-state')).toHaveText('Gelesen oder vernichtet');

    // Verlauf leeren mit Rückfrage.
    await a.getByTestId('history-clear').click();
    await expect(a.getByRole('dialog', { name: 'Verlauf leeren?' })).toBeVisible();
    await a.getByTestId('history-clear-confirm').click();
    await expect(a.getByTestId('history-empty')).toBeVisible();
    await expect(a.locator('[data-sonner-toast][data-type="info"]')).toContainText('Verlauf geleert');
    await ctx.close();
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
    if (process.env.E2E_DEV === '1') {
        // Im Dev-Betrieb liegt die Worker-Datei auf dem Vite-Server (anderer Ursprung); dort rechnet der Hauptthread.
        expect(workers).toEqual([]);
    } else {
        expect(workers.length).toBeGreaterThan(0);
        expect(workers.every((u) => u.startsWith('http://127.0.0.1') && !u.startsWith('blob:'))).toBe(true);
    }
    expect(violations).toEqual([]);
    expect(ms).toBeLessThan(5000);
    rememberNeedles('zeit', 'mindestens-zehn-zeichen');
});

test('Regeln und Art des Passworts bleiben im Browser erhalten, nie Passwort oder Secret', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Läuft ab nach' }).click();
    await page.getByRole('option', { name: '7 Tage' }).click();
    await page.getByTestId('onetime-toggle').click(); // aus: Abrufe erscheinen
    await page.getByRole('button', { name: 'Abrufe: Mehr' }).click();
    await page.getByRole('button', { name: 'Fehlversuche: Weniger' }).click();
    await page.getByTestId('pw-mode-chars').click();
    await page.locator('#secret').fill('Prefs-Geheimnis-4711');
    const password = await page.locator('#password').inputValue();

    const raw = await page.evaluate(() => localStorage.getItem('fmf-prefs'));
    expect(JSON.parse(raw!)).toEqual({ ttl: 604800, views: 2, attempts: 2, oneTime: false, mode: 'chars' });
    expect(raw).not.toContain(password);
    expect(raw).not.toContain('Prefs-Geheimnis');

    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Läuft ab nach' })).toContainText('7 Tage');
    await expect(page.getByTestId('onetime-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('spinbutton', { name: 'Abrufe' })).toHaveValue('2');
    await expect(page.getByRole('spinbutton', { name: 'Fehlversuche' })).toHaveValue('2');
    await expect(page.getByTestId('pw-mode-chars')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('#password').inputValue()).toMatch(/^\S{12,}$/); // erzeugte Zeichen, neu bei jedem Laden
    // Kaputter Speicher fällt auf die Voreinstellung zurück.
    await page.evaluate(() => localStorage.setItem('fmf-prefs', '{"ttl":1,"views":99}'));
    await page.reload();
    await expect(page.getByTestId('onetime-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('combobox', { name: 'Läuft ab nach' })).toContainText('24 Std');
});

test('Einmalig blendet die Abrufe aus und sendet genau einen Abruf', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('spinbutton', { name: 'Abrufe' })).toHaveCount(0);
    await page.locator('#secret').fill('einmalig und weg');
    const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/secrets') && r.method() === 'POST');
    await page.getByTestId('submit').click();
    expect((JSON.parse((await requestPromise).postData()!) as { max_views: number }).max_views).toBe(1);
    await expect(page.getByTestId('result')).toContainText('1 Abruf');
    rememberNeedles('einmalig und weg');
});

test('Textdatei: laden per Auswahl und per Ablegen, nur Text und nur bis zum Limit', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('file-input');
    await input.setInputFiles({ name: 'zugang.env', mimeType: 'text/plain', buffer: Buffer.from('DB_HOST=db.example.test\nDB_PASS=äöü-123') });
    await expect(page.locator('#secret')).toHaveValue('DB_HOST=db.example.test\nDB_PASS=äöü-123');

    // Binärdaten werden abgelehnt, das Feld bleibt unverändert.
    await input.setInputFiles({ name: 'bild.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 0xff, 0xfe]) });
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText('keine Textdatei');
    await expect(page.locator('#secret')).toHaveValue('DB_HOST=db.example.test\nDB_PASS=äöü-123');

    // Zu groß.
    await input.setInputFiles({ name: 'gross.txt', mimeType: 'text/plain', buffer: Buffer.alloc(70_000, 'a') });
    await expect(page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: 'zu groß' })).toBeVisible();

    // Ablegen: Überlagerung beim Ziehen, Inhalt beim Loslassen.
    const section = page.locator('section[aria-labelledby="secret-title"]');
    await page.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(['aus dem Ablegen'], 'drop.txt', { type: 'text/plain' }));
        const target = document.querySelector('section[aria-labelledby="secret-title"]')!;
        target.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
        (window as unknown as { __dt: DataTransfer }).__dt = dt;
    });
    await expect(page.getByTestId('drop-overlay')).toBeVisible();
    await section.evaluate((el) => el.dispatchEvent(new DragEvent('drop', { dataTransfer: (window as unknown as { __dt: DataTransfer }).__dt, bubbles: true, cancelable: true })));
    await expect(page.locator('#secret')).toHaveValue('aus dem Ablegen');
    await expect(page.getByTestId('drop-overlay')).toHaveCount(0);
});

test('das Feld wächst mit langem Inhalt, bleibt aber im Fenster', async ({ page }) => {
    await page.goto('/');
    const before = (await page.locator('#secret').boundingBox())!.height;
    await page.locator('#secret').fill(Array.from({ length: 80 }, (_, i) => `Zeile ${i}`).join('\n'));
    await expect.poll(async () => (await page.locator('#secret').boundingBox())!.height).toBeGreaterThan(before + 100);
    const h = (await page.locator('#secret').boundingBox())!.height;
    expect(h).toBeLessThanOrEqual(page.viewportSize()!.height * 0.6 + 4);
});

test('Stärke: vier Stufen mit Wort, Passwort in einer Zeile', async ({ page }) => {
    await page.goto('/');
    const level = page.getByTestId('strength-level');
    await expect(level).toHaveText('Gut'); // Wörter, 65 Bit
    await page.getByTestId('pw-mode-chars').click();
    await expect(level).toHaveText('Stark');
    await page.locator('#password').fill('1234567890');
    await expect(level).toHaveText('Schwach');
    // Ein langes Passwort bricht nicht um: das Feld bleibt eine Zeile hoch.
    const h0 = (await page.locator('#password').boundingBox())!.height;
    await page.locator('#password').fill('x'.repeat(200));
    expect((await page.locator('#password').boundingBox())!.height).toBe(h0);
    expect(await page.locator('#password').evaluate((el) => el.tagName)).toBe('INPUT');
});

test('Popover "So funktioniert es" erklärt Link, # und Passwort', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('how').getByRole('button', { name: 'So funktioniert es' }).click();
    const pop = page.getByTestId('how-content');
    await expect(pop).toContainText('Der Link');
    await expect(pop).toContainText('Das # im Link');
    await expect(pop).toContainText('Das Passwort');
    await expect(pop).toContainText('Beides zusammen');
    await page.keyboard.press('Escape');
    await expect(pop).toHaveCount(0);
});
