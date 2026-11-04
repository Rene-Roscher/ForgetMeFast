import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { EXAMPLES } from '@/examples';

/**
 * Ein Platzhalter, der Beispiele nacheinander "tippt", kurz stehen lässt und löscht. Läuft nur, solange `active` wahr ist
 * (Feld leer und ohne Fokus). Bei reduzierter Bewegung steht ein einzelnes Beispiel still. Gesetzt wird das echte
 * Platzhalter-Attribut; Screenreader lesen es nicht bei jeder Änderung vor, das Feld hat ein eigenes Label.
 */
export function useRotatingPlaceholder(active: Ref<boolean>, fallback: string) {
    const text = ref(fallback);
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let index = Math.floor(Math.random() * EXAMPLES.length);
    let shown = 0;
    let erasing = false;

    function tick(): void {
        if (!active.value) {
            timer = setTimeout(tick, 400);
            return;
        }
        const full = EXAMPLES[index]!;
        if (!erasing) {
            shown += 1;
            text.value = full.slice(0, shown);
            if (shown >= full.length) {
                erasing = true;
                timer = setTimeout(tick, 2600);
                return;
            }
            timer = setTimeout(tick, full[shown - 1] === '\n' ? 260 : 38);
        } else {
            shown = Math.max(0, shown - 3);
            text.value = full.slice(0, shown);
            if (shown === 0) {
                erasing = false;
                index = (index + 1) % EXAMPLES.length;
                timer = setTimeout(tick, 450);
                return;
            }
            timer = setTimeout(tick, 14);
        }
    }

    onMounted(() => {
        if (reduced) {
            text.value = EXAMPLES[index]!;
            return;
        }
        text.value = '';
        timer = setTimeout(tick, 600);
    });
    onBeforeUnmount(() => clearTimeout(timer));
    return text;
}
