import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: { alias: { '@': resolve(root, 'resources/js') } },
    test: {
        include: ['resources/js/**/*.test.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            include: ['resources/js/**/*.ts'],
            exclude: ['resources/js/**/*.test.ts', 'resources/js/**/*.d.ts', 'resources/js/crypto/vectors/**', 'resources/js/crypto/eff-large-wordlist.ts',
                // Laufen nur im Browser (Web Worker); abgedeckt durch e2e/ (Playwright), nicht durch Vitest.
                'resources/js/crypto/kdf.worker.ts', 'resources/js/crypto/kdf-worker-client.ts',
                // Start der App und reine Verdrahtung: abgedeckt durch e2e/.
                'resources/js/app.ts', 'resources/js/i18n.ts', 'resources/js/ui.ts'],
            // Reviewbefund 12: Die Erfolgsmessgröße aus dem Plan wird erzwungen, nicht nur behauptet.
            thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
        },
    },
});
