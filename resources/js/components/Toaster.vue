<script setup lang="ts">
// Platzierung der Meldungen unten rechts mit vue-sonner (MIT): Stapeln, Wischen zum Schließen, Pausieren beim Überfahren und
// die Zeitsteuerung kommen von der Bibliothek. Gezeichnet werden die Karten von ToastCard.vue. Mit schwebender Aktionsleiste
// (Erstellen-Seite) liegen sie darüber, damit sie den Absende-Knopf nicht verdecken.
import { computed } from 'vue';
import { Toaster } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ dock?: boolean }>();
const { t } = useI18n();
const offset = computed(() => ({ right: '1rem', bottom: props.dock ? '6rem' : '1rem', left: '1rem', top: '1rem' }));
</script>

<template>
    <Toaster position="bottom-right" :offset="offset" :mobile-offset="{ right: '0.75rem', left: '0.75rem', bottom: dock ? '9.5rem' : '0.75rem', top: '0.75rem' }" :visible-toasts="4" :gap="8" :aria-label="t('toast.label')" :toast-options="{ unstyled: true }" />
</template>
