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
        const s = getComputedStyle(el);
        if (parseFloat(s.borderTopWidth) === 0) continue;
        const r = ratio(over(parse(s.borderTopColor), bgOf(el.parentElement)), bgOf(el.parentElement));
        checked++;
        if (r < 3) failures.push(`Rand ${label(el)}: ${r.toFixed(2)}:1 < 3`);
    }
    // 4. Zielgrößen (WCAG 2.5.8: mindestens 24 x 24 px).
    for (const el of Array.from(document.querySelectorAll('button, a[href], input:not([type=hidden]), summary'))) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        checked++;
        if (r.width < 24 || r.height < 24) failures.push(`Zielgröße ${label(el)}: ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { failures, checked };
};

async function audit(page: Page, name: string) {
    // Erst messen, wenn die App gemountet ist (sonst gibt es kaum etwas zu messen).
    await expect(page.locator('main h1, main [data-testid]').first()).toBeVisible();
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
        const [hi, lo] = [lum(px(s.outlineColor)), lum(acc)].sort((a, b) => b - a) as [number, number];
        return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, ratio: (hi + 0.05) / (lo + 0.05), tag: el.tagName };
    });
    expect(r.style, `${name}: Fokus sichtbar`).not.toBe('none');
    expect(r.width, `${name}: Ringbreite`).toBeGreaterThanOrEqual(2);
    expect(r.ratio, `${name}: Fokusring-Kontrast`).toBeGreaterThanOrEqual(3);
}

test('Gegenprobe: die Messung schlägt bei absichtlich schlechten Werten an', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('dice-words').click();
    // CSSOM-Zugriff, weil die CSP Inline-Style-Elemente blockiert: Textfarbe fast wie der Hintergrund, Rahmen fast
    // unsichtbar und eine winzige Schaltfläche.
    await page.evaluate(() => {
        (document.querySelector('.hint') as HTMLElement).style.color = '#dddddd';
        (document.querySelector('#secret') as HTMLElement).style.borderColor = '#eeeeee';
        const b = document.querySelector('[data-testid=dice-chars]') as HTMLElement;
        b.style.width = '10px';
        b.style.minHeight = '10px';
        b.style.height = '10px';
    });
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

            await page.locator('#secret').fill('x');
            await page.locator('#password').fill('kurz');
            await audit(page, 'create-hinweis');

            await page.getByTestId('dice-words').click();
            await page.getByTestId('server-view').locator('summary').click();
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('server-body')).toBeVisible({ timeout: 15_000 });
            await audit(page, 'create-server-sicht');
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
            await audit(page, 'ergebnis');
            await page.getByTestId('destroy').click();
            await audit(page, 'ergebnis-vernichten-rueckfrage');
        });

        test('Viewer: Passwort, Fehlversuch, Anzeige, nicht verfügbar, unvollständig', async ({ page, browser }) => {
            const created = await create(await (await browser.newContext()).newPage(), { secret: 'Design-Test Secret', views: 3 });
            await page.goto(created.link);
            await expect(page.locator('#view-password')).toBeVisible();
            await audit(page, 'viewer-passwort');
            await focusRing(page, 'viewer');

            await tryPassword(page, 'falsches-passwort-eins');
            await expect(page.getByTestId('status')).toContainText('Falsches Passwort');
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
            await page.getByTestId('dice-words').click();
            await audit(page, 'create-360');
            await page.getByTestId('submit').click();
            await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
            await audit(page, 'ergebnis-360');
        });
    });
}
