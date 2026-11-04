<script setup lang="ts">
// Meldungen oben mittig mit vue-sonner (MIT). Ohne eigene Optik von der Bibliothek ("unstyled"), gestaltet mit unseren
// Tokens, damit Hell und Dunkel automatisch stimmen. Stapeln, Wischen zum Schließen und Pausieren beim Überfahren
// kommen von der Bibliothek.
import { Toaster } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';

const { t } = useI18n();
const classes = {
    toast: 'pointer-events-auto flex w-[22.5rem] max-w-[calc(100vw-1.5rem)] items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.16)]',
    content: 'flex min-w-0 flex-1 flex-col gap-0.5',
    title: 'text-sm leading-5 font-medium',
    description: 'text-[0.8125rem] leading-snug text-muted-foreground',
    icon: 'mt-px flex size-6 shrink-0 items-center justify-center rounded-md',
    closeButton: '!top-2 !right-2 !left-auto !size-7 !transform-none !border-border !bg-card !text-muted-foreground hover:!bg-accent',
    error: '[&_[data-icon]]:bg-destructive/15 [&_[data-icon]]:text-destructive',
    success: '[&_[data-icon]]:bg-brand/15 [&_[data-icon]]:text-brand',
    info: '[&_[data-icon]]:bg-accent [&_[data-icon]]:text-foreground',
};
</script>

<template>
    <Toaster position="top-center" close-button close-button-position="top-right" :offset="16" :visible-toasts="4" :gap="8" :aria-label="t('toast.label')" :toast-options="{ unstyled: true, classes, closeButtonAriaLabel: t('toast.close') }">
        <template #success-icon><Icon name="check-circle" /></template>
        <template #error-icon><Icon name="alert" /></template>
        <template #info-icon><Icon name="shield" /></template>
    </Toaster>
</template>
