import { ref } from 'vue';

// Gemeinsamer Zustand der Oberfläche: ob das Fach mit dem Verlauf offen ist (Auslöser: Seitenleiste und Kopfzeile am Handy).
export const historyOpen = ref(false);
