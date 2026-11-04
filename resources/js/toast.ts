import { ref } from 'vue';

export type ToastKind = 'error' | 'success' | 'info';
export interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
    open: boolean;
}

// Kleiner Speicher für Meldungen. Angezeigt werden sie von components/Toaster.vue (Reka UI Toast, oben mittig).
const items = ref<ToastItem[]>([]);
let counter = 0;

function push(kind: ToastKind, message: string): void {
    // Dieselbe Meldung nicht doppelt stapeln.
    if (items.value.some((t) => t.open && t.kind === kind && t.message === message)) return;
    items.value = [...items.value.slice(-3), { id: ++counter, kind, message, open: true }];
}

export const toast = {
    error: (message: string) => push('error', message),
    success: (message: string) => push('success', message),
    info: (message: string) => push('info', message),
};

export function useToasts() {
    return {
        items,
        remove(id: number): void {
            items.value = items.value.filter((t) => t.id !== id);
        },
    };
}
