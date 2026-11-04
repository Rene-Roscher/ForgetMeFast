import { markRaw } from 'vue';
import { toast as sonner } from 'vue-sonner';
import ToastCard from '@/components/ToastCard.vue';

// Meldungen platziert vue-sonner (components/Toaster.vue), gezeichnet wird die Karte von ToastCard.vue. Diese kleine Hülle
// hält die Aufrufe im Code kurz und setzt die Dauer einheitlich. Dieselbe Meldung bekommt dieselbe id und wird
// aktualisiert statt gestapelt.
type Kind = 'error' | 'success' | 'info';
const card = markRaw(ToastCard);

function show(kind: Kind, message: string): void {
    const id = `${kind}:${message}`;
    const duration = kind === 'error' ? 8000 : 3500;
    sonner.custom(card, { id, duration, componentProps: { id, kind, message, duration } });
}

export const toast = {
    error: (message: string) => show('error', message),
    success: (message: string) => show('success', message),
    info: (message: string) => show('info', message),
};
