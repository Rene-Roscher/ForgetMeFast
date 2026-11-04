import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { EXAMPLES } from '@/examples';
import { createTyper } from '@/placeholder';

/**
 * Ein Platzhalter, der Beispiele nacheinander "tippt", kurz stehen lässt und löscht. Läuft nur, solange `active` wahr ist
 * (Feld leer und ohne Fokus). Bei reduzierter Bewegung steht ein einzelnes Beispiel still. Gesetzt wird das echte
 * Platzhalter-Attribut; Screenreader lesen es nicht bei jeder Änderung vor, das Feld hat ein eigenes Label.
 * Der Ablauf steckt in placeholder.ts (getestet); hier ist nur der Timer, abgedeckt durch die E2E-Tests.
 */
/* v8 ignore start */
export function useRotatingPlaceholder(active: Ref<boolean>, fallback: string) {
    const text = ref(fallback);
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = Math.floor(Math.random() * EXAMPLES.length);
    const typer = createTyper(EXAMPLES, start);
    let timer: ReturnType<typeof setTimeout> | undefined;

    function tick(): void {
        if (!active.value) {
            timer = setTimeout(tick, 400);
            return;
        }
        const { text: next, delay } = typer.step();
        text.value = next;
        timer = setTimeout(tick, delay);
    }

    onMounted(() => {
        if (reduced) {
            text.value = EXAMPLES[start]!;
            return;
        }
        text.value = '';
        timer = setTimeout(tick, 600);
    });
    onBeforeUnmount(() => clearTimeout(timer));
    return text;
}
/* v8 ignore stop */
