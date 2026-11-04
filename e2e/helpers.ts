import { fileURLToPath } from 'node:url';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
const __dirname = dirname(fileURLToPath(import.meta.url));

const needleFile = resolve(__dirname, '../storage/framework/testing/e2e-needles.json');

/** Merkt sich, was der Server nie sehen darf (Secret, Passwort, Link-Key), für den Klartext-Scan am Ende. */
export function rememberNeedles(...values: string[]): void {
    mkdirSync(dirname(needleFile), { recursive: true });
    appendFileSync(needleFile, values.map((v) => JSON.stringify(v)).join('\n') + '\n');
}
export function readNeedles(): string[] {
    return existsSync(needleFile) ? readFileSync(needleFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as string) : [];
}

export interface Created {
    link: string;
    password: string;
    linkKey: string;
    id: string;
}

export async function create(page: Page, opts: { secret: string; password?: string; views?: number; attempts?: number }): Promise<Created> {
    await page.goto('/');
    await page.locator('#secret').fill(opts.secret);
    // Das Passwort ist beim Laden schon erzeugt; nur wer ein eigenes will, tippt es.
    if (opts.password) await page.locator('#password').fill(opts.password);
    const password = await page.locator('#password').inputValue();
    for (const [label, want, base] of [['Abrufe', opts.views, 1], ['Fehlversuche', opts.attempts, 3]] as const) {
        for (let i = base; want !== undefined && i < want; i++) {
            await page.getByRole('button', { name: `${label}: Mehr` }).click();
        }
    }
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 15_000 });
    const link = (await page.getByTestId('result-link').textContent())!.trim();
    const shownPassword = (await page.getByTestId('result-password').textContent())!.trim();
    expect(shownPassword).toBe(password);
    const [path, linkKey] = link.split('#') as [string, string];
    rememberNeedles(opts.secret, password, linkKey);
    return { link, password, linkKey, id: path.split('/').pop()! };
}

export async function tryPassword(page: Page, password: string): Promise<void> {
    await page.locator('#view-password').fill(password);
    await page.getByTestId('view-submit').click();
}
