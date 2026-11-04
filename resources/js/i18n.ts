import { createI18n } from 'vue-i18n';
import de from '@/locales/de.json';

// Die UI ist deutsch (CLAUDE.md: keine Mehrsprachigkeit). vue-i18n liefert trotzdem Plural, Platzhalter und einen Ort für
// alle Texte. Die Nachrichten werden beim Build geprüft und vorkompiliert (vite.config.ts); unter der strikten CSP läuft das ohne Verstöße (E2E-Test).
export const i18n = createI18n({
    legacy: false,
    locale: 'de',
    fallbackLocale: 'de',
    messages: { de },
});
