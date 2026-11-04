<script setup lang="ts">
// Platzierung der Meldungen oben mittig mit vue-sonner (MIT): Stapeln, Wischen zum Schließen, Pausieren beim Überfahren und
// die Zeitsteuerung kommen von der Bibliothek. Gezeichnet werden die Karten von ToastCard.vue.
import { Toaster } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
    <Toaster position="top-center" :offset="16" :visible-toasts="4" :gap="8" :aria-label="t('toast.label')" :toast-options="{ unstyled: true }" />
</template>
