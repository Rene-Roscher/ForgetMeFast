import { toast as sonner } from 'vue-sonner';
import { i18n } from '@/i18n';

// Meldungen zeigt vue-sonner (components/Toaster.vue). Diese kleine Hülle hält die Aufrufe im Code kurz und setzt Titel und
// Dauer einheitlich. Dieselbe Meldung bekommt dieselbe id und wird aktualisiert statt gestapelt.
type Kind = 'error' | 'success' | 'info';

function show(kind: Kind, message: string): void {
    const title = i18n.global.t(`toast.titles.${kind}`);
    sonner[kind](title, { id: `${kind}:${message}`, description: message, duration: kind === 'error' ? 8000 : 3500 });
}

export const toast = {
    error: (message: string) => show('error', message),
    success: (message: string) => show('success', message),
    info: (message: string) => show('info', message),
};
