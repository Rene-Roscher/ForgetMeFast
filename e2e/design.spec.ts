import { expect, test, type Page } from '@playwright/test';
import { create, tryPassword } from './helpers';

// Gestaltung wird gemessen, nicht nach Augenmaß beurteilt (WCAG 2.2: 1.4.3 Text, 1.4.11 Komponenten, 2.4.7 Fokus).
// Gemessen wird in hell und dunkel, in jedem Zustand der beiden Seiten, und bei 360 px Breite auf Überlauf.

const measure = () => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const parse = (css: string): [number, number, number, number] => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
    };
    const over = (top: number[], bottom: number[]): [number, number, number, number] => {
        const a = top[3]! + bottom[3]! * (1 - top[3]!);
        const ch = (i: number) => (a === 0 ? 0 : (top[i]! * top[3]! + bottom[i]! * bottom[3]! * (1 - top[3]!)) / a);
        return [ch(0), ch(1), ch(2), a];
    };
    const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = (c: number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
    const ratio = (a: number[], b: number[]) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
        return (hi + 0.05) / (lo + 0.05);
    };
    const bgOf = (el: Element | null): [number, number, number, number] => {
        let acc: [number, number, number, number] = [0, 0, 0, 0];
        for (let n: Element | null = el; n; n = n.parentElement) {
            acc = over(acc, parse(getComputedStyle(n).backgroundColor));
            if (acc[3] >= 0.999) return acc;
        }
        return over(acc, parse(getComputedStyle(document.documentElement).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'white' : getComputedStyle(document.documentElement).backgroundColor));
    };
    const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent ?? '').trim().slice(0, 28)}"`;
    const failures: string[] = [];
    let checked = 0;

    // 1. Text: jedes sichtbare Element mit eigenem Text.
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
        if (!visible(el) || el.closest('[aria-hidden="true"]') || (el as HTMLButtonElement).disabled || el.closest('[disabled]')) continue;
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
        if (!own) continue;
        const s = getComputedStyle(el);
        const fg = over(parse(s.color), bgOf(el));
        const size = parseFloat(s.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
        const need = large ? 3 : 4.5;
        const r = ratio(fg, bgOf(el));
        checked++;
        if (r < need) failures.push(`Text ${label(el)}: ${r.toFixed(2)}:1 < ${need}`);
    }
    // 2. Platzhalter.
    for (const el of Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'))) {
        if (!visible(el)) continue;
        const r = ratio(over(parse(getComputedStyle(el, '::placeholder').color), bgOf(el)), bgOf(el));
        checked++;
        if (r < 4.5) failures.push(`Platzhalter ${label(el)}: ${r.toFixed(2)}:1 < 4.5`);
    }
    // 3. Grenzen von Eingabeelementen (mindestens 3:1 gegen den Hintergrund außerhalb, WCAG 1.4.11). Schaltflächen mit
    //    sichtbarer Beschriftung werden an ihrem Text erkannt, ihr Rand ist nicht die einzige Information; für sie gilt 1. oben.
    for (const el of Array.from(document.querySelectorAll('input:not([type=hidden]), textarea, [role=radiogroup] > div, [role=group].inline-flex'))) {
        if (!visible(el) || (el as HTMLButtonElement).disabled) continue;
        // Das Secret-Feld ist selbst die innere Karte (Wunsch des Maintainers): Rand wie bei Karten, nicht wie bei Feldern.
        if (el.hasAttribute('data-card-field')) continue;
        const s = getComputedStyle(el);
        if (parseFloat(s.borderTopWidth) === 0) continue;
        const r = ratio(over(parse(s.borderTopColor), bgOf(el.parentElement)), bgOf(el.parentElement));
        checked++;
        // Hell: 3:1 (WCAG 1.4.11). Dunkel: Felder heben sich durch Füllung und feinen Rand ab wie bei Vercel und Linear, gefordert sind 1,4:1.
        const need = document.documentElement.classList.contains('dark') ? 1.4 : 3;
        if (r < need) failures.push(`Rand ${label(el)}: ${r.toFixed(2)}:1 < ${need}`);
    }
    // 4. Zielgrößen (WCAG 2.5.8: mindestens 24 x 24 px).
    for (const el of Array.from(document.querySelectorAll('button, a[href], input:not([type=hidden]), summary'))) {
        if (!visible(el) || el.classList.contains('sr-only')) continue; // das verborgene Dateifeld wird über seinen Knopf bedient
        const r = el.getBoundingClientRect();
        checked++;
        if (r.width < 24 || r.height < 24) failures.push(`Zielgröße ${label(el)}: ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { failures, checked };
};

async function audit(page: Page, name: string) {
    // Erst messen, wenn die App gemountet ist (sonst gibt es kaum etwas zu messen).
    await expect(page.locator('h1').first()).toBeVisible();
    const { failures, checked } = await page.evaluate(measure);
    console.log(`Gestaltung ${name}: ${checked} Messungen`);
    expect(checked, `${name}: es wurde etwas gemessen`).toBeGreaterThan(5);
    expect(failures, `${name}`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${name}: horizontaler Überlauf`).toBeLessThanOrEqual(0);
}

/** Der Fokusring: Tab auf das erste Bedienelement, Ringfarbe gegen den Hintergrund (mindestens 3:1). */
async function focusRing(page: Page, name: string) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
        const px = (css: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); };
        const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        const lum = (c: number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
        const s = getComputedStyle(el);
        const over = (top: number[], bottom: number[]) => {
            const a = top[3]! / 255 + (bottom[3]! / 255) * (1 - top[3]! / 255);
            const ch = (i: number) => (a === 0 ? 0 : (top[i]! * (top[3]! / 255) + bottom[i]! * (bottom[3]! / 255) * (1 - top[3]! / 255)) / a);
            return [ch(0), ch(1), ch(2), a * 255];
        };
        let acc: number[] = [0, 0, 0, 0];
        for (let n: Element | null = el; n && acc[3]! < 254; n = n.parentElement) acc = over(acc, px(getComputedStyle(n).backgroundColor));
        // Der Ring ist ein Schatten ohne Unschärfe: zwei Ebenen, innen die Lücke in der Seitenfarbe, außen der Ring.
        const layers = s.boxShadow.split(/,\s*(?![^(]*\))/);
        const ring = layers[layers.length - 1] ?? '';
        const color = ring.match(/rgba?\([^)]*\)/)?.[0] ?? 'rgba(0,0,0,0)';
        const spreadOf = (layer: string) => parseFloat((layer.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) ?? [])[3] ?? '0');
        const ringWidth = layers.length > 1 ? spreadOf(ring) - spreadOf(layers[layers.length - 2]!) : spreadOf(ring);
        const [hi, lo] = [lum(px(color)), lum(acc)].sort((a, b) => b - a) as [number, number];
        return { width: ringWidth, style: s.boxShadow, ratio: (hi + 0.05) / (lo + 0.05), tag: el.tagName };
    });
    expect(r.style, `${name}: Fokus sichtbar`).not.toBe('none');
    expect(r.width, `${name}: Ringbreite`).toBeGreaterThanOrEqual(2);
    expect(r.ratio, `${name}: Fokusring-Kontrast`).toBeGreaterThanOrEqual(3);
}

/** Felder bleiben im Fokus ruhig: kein Randwechsel, kein Ring, kein Hof (Wunsch des Maintainers). */
async function fieldCalm(page: Page, selector: string, name: string) {
    const look = () => page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement;
        const surface = (el.closest('section') ?? el) as HTMLElement;
        return [el, surface].map((n) => { const s = getComputedStyle(n); return `${s.borderTopColor}|${s.boxShadow}|${s.outlineStyle}`; }).join(' / ');
    }, selector);
    await page.locator(selector).blur().catch(() => undefined);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    const before = await look();
    await page.locator(selector).focus();
    await page.waitForTimeout(250);
    expect(await look(), `${name}: Fokus ändert nichts am Aussehen`).toBe(before);
    expect(before, `${name}: kein Ring`).toContain('none');
}

test('Gegenprobe: die Messung schlägt bei absichtlich schlechten Werten an', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#secret')).toBeVisible(); // erst messen, wenn die App gemountet ist
    // CSSOM-Zugriff, weil die CSP Inline-Style-Elemente blockiert: Textfarbe fast wie der Hintergrund, Rahmen fast
    // unsichtbar und eine winzige Schaltfläche.
    await page.evaluate(() => {
        (document.querySelector('.hint') as HTMLElement).style.color = '#dddddd';
        (document.querySelector('#password') as HTMLElement).style.borderColor = '#eeeeee';
        const b = document.querySelector('[data-testid=pw-refresh]') as HTMLElement;
        b.style.width = '10px';
        b.style.minHeight = '10px';
        b.style.height = '10px';
    });
    await page.waitForTimeout(400); // die Farbübergänge der Bedienelemente müssen durch sein
    const { failures } = await page.evaluate(measure);
    expect(failures.some((f) => f.startsWith('Text '))).toBe(true);
    expect(failures.some((f) => f.startsWith('Rand '))).toBe(true);
    expect(failures.some((f) => f.startsWith('Zielgröße '))).toBe(true);
});

for (const scheme of ['light', 'dark'] as const) {
    test.describe(`Gestaltung ${scheme}`, () => {
        test.use({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });

        test('Erstellen: leer, ausgefüllt, mit Hinweisen, Server-Sicht offen, Ergebnis', async ({ page }) => {
            await page.goto('/');
            await audit(page, 'create-leer');
            await focusRing(page, 'create');
            await fieldCalm(page, '#secret', 'secret');
            await fieldCalm(page, '#password', 'password');

            await page.locator('#secret').fill('x');
            await page.locator('#password').fill('kurz');
            await audit(page, 'create-hinweis');

            await page.getByTestId('pw-refresh').click(); // wieder ein gültiges Passwort
            await audit(page, 'create-ausgefuellt');
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
            await audit(page, 'ergebnis');
            await page.getByTestId('destroy').click();
            await expect(page.getByTestId('destroy-dialog')).toBeVisible();
            await audit(page, 'ergebnis-vernichten-dialog');
        });

        test('Viewer: Passwort, Fehlversuch, Anzeige, nicht verfügbar, unvollständig', async ({ page, browser }) => {
            const created = await create(await (await browser.newContext()).newPage(), { secret: 'Design-Test Secret', views: 3 });
            await page.goto(created.link);
            await expect(page.locator('#view-password')).toBeVisible();
            await audit(page, 'viewer-passwort');
            await focusRing(page, 'viewer');

            await tryPassword(page, 'falsches-passwort-eins');
            await expect(page.getByTestId('status')).toContainText('Das Passwort stimmt nicht');
            await audit(page, 'viewer-fehlversuch');

            await tryPassword(page, created.password);
            await expect(page.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
            await page.getByTestId('reveal').click();
            await audit(page, 'viewer-angezeigt');

            await page.goto('/s/AAAAAAAAAAAAAAAAAAAAAA#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
            await expect(page.getByTestId('unavailable')).toBeVisible();
            await audit(page, 'viewer-nicht-verfuegbar');
            await page.goto('/s/AAAAAAAAAAAAAAAAAAAAAA');
            await expect(page.getByTestId('incomplete')).toBeVisible();
            await audit(page, 'viewer-unvollstaendig');
        });

        test('Handy 360 px: kein horizontaler Überlauf, gemessen mit 200 Zeichen langem Wort im Secret', async ({ page }) => {
            await page.setViewportSize({ width: 360, height: 740 });
            await page.goto('/');
            await page.locator('#secret').fill('A'.repeat(200));
            await audit(page, 'create-360');
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
            await audit(page, 'ergebnis-360');
        });
    });
}

// Handy: echte Touch-Emulation mit 390 x 844. Gemessen wird, was auf dem Handy zählt: Der Inhalt steht vorn (keine riesige
// Seitenleiste davor), Eingabefelder haben mindestens 16 px (sonst zoomt iOS beim Fokussieren), Touch-Ziele mindestens 32 px,
// und die schwebende Leiste verdeckt am Seitenende nichts.
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } as const;

for (const scheme of ['light', 'dark'] as const) {
    test.describe(`Handy ${scheme}`, () => {
        test.use({ colorScheme: scheme, ...phone });

        async function phoneChecks(page: Page, name: string) {
            const r = await page.evaluate(() => {
                const bad: string[] = [];
                const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent ?? '').trim().slice(0, 24)}"`;
                for (const el of Array.from(document.querySelectorAll('input:not([type=hidden]), textarea, select'))) {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"]')) continue;
                    if (parseFloat(getComputedStyle(el).fontSize) < 16) bad.push(`Schrift unter 16 px (iOS zoomt): ${label(el)}`);
                }
                for (const el of Array.from(document.querySelectorAll('button, a[href], input:not([type=hidden]), textarea, summary, [role=combobox]'))) {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"]') || el.classList.contains('sr-only')) continue;
                    // Die Zahlfelder der Leiste sind schmal; getroffen wird die ganze Zeile mit den beiden 32-px-Knöpfen daneben.
                    const narrowOk = el.getAttribute('role') === 'spinbutton' && r.width >= 24 && r.height >= 32;
                    if (!narrowOk && (r.width < 32 || r.height < 32)) bad.push(`Touch-Ziel ${Math.round(r.width)}x${Math.round(r.height)} unter 32 px: ${label(el)}`);
                }
                return bad;
            });
            expect(r, `${name}`).toEqual([]);
        }

        test('Erstellen: Inhalt steht vorn, Leiste verdeckt nichts, Maße stimmen', async ({ page }) => {
            await page.goto('/');
            await expect(page.locator('#secret')).toBeVisible();
            const box = (await page.locator('#secret').boundingBox())!;
            expect(box.y, 'das Secret-Feld beginnt im oberen Drittel, nicht hinter einer Seitenleiste').toBeLessThan(300);
            await audit(page, 'handy-create-leer');
            await phoneChecks(page, 'handy-create');

            await page.locator('#secret').fill('Handy-Test');
            await audit(page, 'handy-create-ausgefuellt');

            // Am Seitenende darf die schwebende Leiste nichts verdecken.
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(400); // Layout setzen lassen (Tooltips, Animationen)
            const gap = await page.evaluate(() => {
                const dock = document.querySelector('[data-testid=dock] > div')!.getBoundingClientRect();
                const last = document.querySelector('[data-testid=coverage-mobile]')!.getBoundingClientRect();
                return dock.top - last.bottom;
            });
            expect(gap, 'Abstand zwischen letztem Inhalt und Leiste').toBeGreaterThanOrEqual(0);

            // Die Leiste passt in die Breite und bricht nichts um.
            const dockBox = (await page.getByTestId('dock').locator('> div').boundingBox())!;
            expect(dockBox.x).toBeGreaterThanOrEqual(0);
            expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(390);
            for (const name of ['Läuft ab nach', 'Fehlversuche']) {
                const h = (await page.getByRole('group', { name: 'Regeln für dein Secret' }).locator(':scope *', { hasText: name }).first().boundingBox());
                expect(h).not.toBeNull();
            }
            const select = (await page.getByRole('combobox', { name: 'Läuft ab nach' }).boundingBox())!;
            expect(select.height, 'die Auswahl bricht nicht in zwei Zeilen um').toBeLessThan(44);
        });

        test('Ergebnis, Verlauf, Toast und Dialog auf dem Handy', async ({ page }) => {
            await page.goto('/');
            await page.locator('#secret').fill('Handy-Ergebnis');
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
            await audit(page, 'handy-ergebnis');
            await phoneChecks(page, 'handy-ergebnis');

            await page.getByTestId('destroy').click();
            await expect(page.getByTestId('destroy-dialog')).toBeVisible();
            const dialog = (await page.getByTestId('destroy-dialog').boundingBox())!;
            expect(dialog.x).toBeGreaterThanOrEqual(0);
            expect(dialog.x + dialog.width).toBeLessThanOrEqual(390);
            await audit(page, 'handy-dialog');
            await page.keyboard.press('Escape');

            await page.getByTestId('new-secret').click();
            await page.getByTestId('history-open-mobile').click();
            await expect(page.getByTestId('history-drawer')).toBeVisible();
            await expect(page.getByTestId('history-row')).toHaveCount(1);
            await audit(page, 'handy-verlauf');
            await phoneChecks(page, 'handy-verlauf');
            await page.keyboard.press('Escape');
            await expect(page.getByTestId('history-drawer')).toHaveCount(0);

            await page.getByTestId('coverage-mobile').getByRole('button', { name: 'Wie weit reicht der Schutz?' }).click();
            await expect(page.getByTestId('coverage-content')).toBeVisible();
            await audit(page, 'handy-schutz-offen');

            await page.route('**/api/secrets', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 500, body: '{}' }) : r.continue()));
            await page.locator('#secret').fill('Fehler');
            await page.getByTestId('submit').click();
            const toast = page.locator('[data-sonner-toast][data-type="error"]');
            await expect(toast).toBeVisible();
            const t = (await toast.boundingBox())!;
            expect(t.x).toBeGreaterThanOrEqual(0);
            expect(t.x + t.width).toBeLessThanOrEqual(390);
            await audit(page, 'handy-toast');
        });

        test('Viewer auf dem Handy', async ({ page, browser }) => {
            const created = await create(await (await browser.newContext()).newPage(), { secret: 'Handy-Viewer' });
            await page.goto(created.link);
            await expect(page.locator('#view-password')).toBeVisible();
            await audit(page, 'handy-viewer');
            await phoneChecks(page, 'handy-viewer');
            await tryPassword(page, created.password);
            await expect(page.getByTestId('revealed')).toBeVisible({ timeout: 15_000 });
            await page.getByTestId('reveal').click();
            await audit(page, 'handy-viewer-angezeigt');
        });
    });
}
