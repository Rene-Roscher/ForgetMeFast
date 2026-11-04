import inertia from '@inertiajs/vite';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
            // Für einen isolierten Dev-E2E-Lauf neben einem laufenden `composer dev` (npm run e2e:dev).
            ...(process.env.VITE_HOT_FILE ? { hotFile: process.env.VITE_HOT_FILE } : {}),
        }),
        inertia({ ssr: false }),
        vue(),
        // Nachrichten werden beim Build geprüft und vorkompiliert (runtimeOnly). Die vue-i18n-Doku nennt das eval-Problem mit
        // CSP für Versionen vor 9.3; ab dort gibt es JIT-Kompilierung, ab v10 ist sie Standard. Dass es unter unserer strikten
        // CSP läuft, belegt der E2E-Test (keine Verstöße), nicht diese Annahme.
        VueI18nPlugin({ include: [resolve(root, 'resources/js/locales/**')], runtimeOnly: true, compositionOnly: true, strictMessage: true }),
        tailwindcss(),
    ],
    resolve: { alias: { '@': resolve(root, 'resources/js') } },
    build: {
        // Never inline assets as data: URIs; the CSP (font-src, img-src 'self') does not allow them.
        assetsInlineLimit: 0,
    },
    server: {
        // IPv4 on purpose: the CSP cannot name an IPv6 host (see SecurityHeaders).
        host: '127.0.0.1',
        port: Number(process.env.VITE_PORT ?? 5173),
        strictPort: true,
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
