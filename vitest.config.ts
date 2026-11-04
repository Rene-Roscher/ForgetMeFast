import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['resources/js/**/*.test.ts'],
        environment: 'node',
        coverage: { provider: 'v8', include: ['resources/js/crypto/**'] },
    },
});
