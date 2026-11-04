// Zustandsautomat für den laufenden Beispiel-Platzhalter (composables/useRotatingPlaceholder.ts liefert nur den Timer
// dazu). Rein und ohne Zeit, damit er sich testen lässt: jeder Schritt liefert den anzuzeigenden Text und die Wartezeit bis
// zum nächsten Schritt. Ablauf je Beispiel: Zeichen für Zeichen tippen, kurz stehen lassen, schnell löschen, nächstes.
export interface Typer {
    step(): { text: string; delay: number };
}

export const TYPE_MS = 38;
export const LINE_MS = 260;
export const HOLD_MS = 2600;
export const ERASE_MS = 14;
export const ERASE_STEP = 3;
export const NEXT_MS = 450;

export function createTyper(examples: readonly string[], start = 0): Typer {
    let index = start % examples.length;
    let shown = 0;
    let erasing = false;
    return {
        step() {
            const full = examples[index]!;
            if (!erasing) {
                shown += 1;
                const text = full.slice(0, shown);
                if (shown >= full.length) {
                    erasing = true;
                    return { text, delay: HOLD_MS };
                }
                return { text, delay: full[shown - 1] === '\n' ? LINE_MS : TYPE_MS };
            }
            shown = Math.max(0, shown - ERASE_STEP);
            const text = full.slice(0, shown);
            if (shown === 0) {
                erasing = false;
                index = (index + 1) % examples.length;
                return { text, delay: NEXT_MS };
            }
            return { text, delay: ERASE_MS };
        },
    };
}
