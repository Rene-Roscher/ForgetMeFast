# 0005. UI-Bausteine, i18n und Teal-Palette

Status: Accepted, teilweise ersetzt durch ADR 0006 (Palette, Verlauf) und ADR 0007 (Meldungen, "Prüfen vor dem Senden", Logo)
Date: 2026-11-04
Supersedes: none

## Context
Anforderungen an die Oberfläche: Teal statt Mint-Grün, ein Logo mit Schloss, größere und bessere Bausteine statt handgebauter und nativer Widgets, bessere Texte über i18n, und ein Aufbau mit
Inhalt links, Einstellungen als eigene Karte und einer schwebenden Aktionsleiste unten. Die Skills `vue-inertia-frontend` und
`web-architecture` nennen Reka UI 2 mit dem shadcn-vue-Muster und vue-i18n mit Sprachdateien als Standard.

## Decision
1. **Reka UI 2.11.0** (MIT) als unstylte, zugängliche Bausteine (ToggleGroup, NumberField, Dialog, Tooltip,
   Collapsible), mit eigenen Wrappern in `resources/js/components/ui/` im shadcn-Muster. Die Nutzung unter der strikten CSP
   ist belegt: Die E2E-Tests (CSP, Fokus im Dialog, Fokus-Rückkehr mit Esc) laufen ohne Verstöße.
2. **vue-i18n 11.4.18** (MIT) mit **@intlify/unplugin-vue-i18n 11.2.8**: Texte stehen in `resources/js/locales/de.json` und
   werden beim Build geprüft und vorkompiliert. Es gibt nur die Sprache Deutsch (`CLAUDE.md`: keine Mehrsprachigkeit). Drei
   Pflicht-Tests aus dem Skill (Syntax, Parität, Nutzung) laufen in `locales.test.ts`; ein kaputter Text schlägt den
   Syntax-Test fehl (einmal rot gesehen).
3. **Palette Tailwind teal** (ersetzt durch ADR 0006: neutrale Flächen, Teal nur als Akzent): Primärfarbe teal-700 (hell, weißer Text 5,47:1) und teal-400 (dunkel, Text teal-950 7,77:1),
   Seitenpanel teal-950 (weißer Text 14,47:1). `resources/css/tokens.css` wurde bewusst angepasst
   (`--primary`, `--primary-hover`, `--primary-foreground`, `--ring`, `--text-link`, `--text-positive`).
4. **Lucide** (`lucide-vue-next`, ISC) für Icons. Das Logo `LogoMark.vue` und `public/favicon.svg` wurden später neu
   gezeichnet (eine Hand, die ein Schloss trägt, siehe README).
5. **Aufbau**: Seitenpanel links, rechts die Bühne mit äußeren und inneren Karten; beim Erstellen Inhalt und Einstellungen als
   zwei Karten und eine schwebende Leiste mit der Aktion. Der Schritt "Prüfen vor dem Senden" entfiel später (ADR 0007).
6. **Hell/Dunkel** per Icon-Button; die Wahl steht in `localStorage` (`fmf-theme`), kein Cookie.

## Consequences
- Mehr Abhängigkeiten. Reka UI bringt `defu`, `ohash`, `aria-hidden`, `@vueuse/*`, `@floating-ui/vue`, `@tanstack/vue-virtual`
  und `@internationalized/*` mit. `npm audit` meldet 0 Funde.
- **Override für `minimatch`:** Das i18n-Plugin zieht `@typescript-eslint/typescript-estree`, das ein verwundbares `minimatch`
  (< 11.0.1, GHSA-g3hv-75wg-m249, Denial of Service) erwartet. `package.json` setzt `overrides: { "minimatch": "^11.0.1" }`.
  Das betrifft nur die Build-Kette, nicht die ausgelieferte Seite. Der Build und alle Tests laufen damit. Bei Updates des
  Plugins ist zu prüfen, ob der Override noch nötig ist oder etwas bricht (Entscheidung zwischen sauberem Audit und
  unveränderten Abhängigkeiten).
- **CSP und vue-i18n:** Laut Doku gab es das `eval`-Problem vor Version 9.3, ab 9.3 gibt es JIT-Kompilierung, ab v10 ist sie
  Standard. Dass es hier ohne CSP-Verstoß läuft, belegt der E2E-Test, nicht die Annahme.
- Eine zweite Sprache bräuchte nur eine weitere JSON-Datei; die Parität-Prüfung ist schon vorhanden.
- `localStorage` enthält genau einen Schlüssel (`fmf-theme`), ein Test prüft das.

## Sources
- Reka UI: https://reka-ui.com, API über Context7 gelesen 2026-11-04 (NumberField, ToggleGroup, Switch, Dialog, Tooltip, Collapsible).
- vue-i18n, Abschnitt Optimization (CSP, JIT): https://vue-i18n.intlify.dev/guide/advanced/optimization, gelesen 2026-11-04.
- npm: `reka-ui` 2.11.0 MIT, `vue-i18n` 11.4.18 MIT, `@intlify/unplugin-vue-i18n` 11.2.8 MIT (peer `vite` bis 8), `lucide-vue-next` 1.0.0 ISC.
- Kontrastwerte: eigene Berechnung nach WCAG 2.2, zusätzlich im Browser gemessen (`e2e/design.spec.ts`).
