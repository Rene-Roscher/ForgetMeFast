import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['resources/js/**/*.test.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            include: ['resources/js/crypto/**/*.ts'],
            exclude: ['resources/js/crypto/**/*.test.ts', 'resources/js/crypto/vectors/**', 'resources/js/crypto/eff-large-wordlist.ts'],
            // Reviewbefund 12: Die Erfolgsmessgröße aus dem Plan wird erzwungen, nicht nur behauptet.
            thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
        },
    },
});
