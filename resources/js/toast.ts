import { markRaw } from 'vue';
import { toast as sonner } from 'vue-sonner';
import ToastCard from '@/components/ToastCard.vue';
import { i18n } from '@/i18n';

// Meldungen platziert vue-sonner (components/Toaster.vue), gezeichnet wird die Karte von ToastCard.vue. Diese kleine Hülle
// hält die Aufrufe im Code kurz und setzt Titel und Dauer einheitlich. Dieselbe Meldung bekommt dieselbe id und wird
// aktualisiert statt gestapelt.
type Kind = 'error' | 'success' | 'info';
const card = markRaw(ToastCard);

function show(kind: Kind, message: string): void {
    const id = `${kind}:${message}`;
    sonner.custom(card, { id, duration: kind === 'error' ? 8000 : 3500, componentProps: { id, kind, message, title: i18n.global.t(`toast.titles.${kind}`) } });
}

export const toast = {
    error: (message: string) => show('error', message),
    success: (message: string) => show('success', message),
    info: (message: string) => show('info', message),
};
