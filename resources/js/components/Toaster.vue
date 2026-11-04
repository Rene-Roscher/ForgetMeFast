<script setup lang="ts">
// Meldungen oben mittig (Reka UI Toast). Fehler sind "foreground" (werden sofort vorgelesen), Erfolg und Hinweis "background".
// Aufbau wie bei modernen Apps: kleine Karte, Icon in einer Marke, Titel, Text, dezentes Schließen.
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';
import { useToasts } from '@/toast';

const { t } = useI18n();
const { items, remove } = useToasts();
const icons = { error: 'alert', success: 'check-circle', info: 'shield' } as const;
const tone = {
    error: 'bg-destructive/15 text-destructive',
    success: 'bg-brand/15 text-brand',
    info: 'bg-accent text-foreground',
} as const;
</script>

<template>
    <ToastProvider :label="t('toast.label')" swipe-direction="up" :duration="5000">
        <ToastRoot
            v-for="item in items"
            :key="item.id"
            :open="item.open"
            :type="item.kind === 'error' ? 'foreground' : 'background'"
            :duration="item.kind === 'error' ? 8000 : 3500"
            :data-testid="`toast-${item.kind}`"
            class="toast pointer-events-auto flex items-start gap-3 rounded-lg border border-border-strong bg-card p-3 pr-2.5 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.14)]"
            @update:open="(open: boolean) => { if (!open) remove(item.id); }"
        >
            <span class="mt-px flex size-6 shrink-0 items-center justify-center rounded-md" :class="tone[item.kind]"><Icon :name="icons[item.kind]" /></span>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <ToastTitle class="text-sm leading-5 font-medium">{{ t(`toast.titles.${item.kind}`) }}</ToastTitle>
                <ToastDescription class="text-[0.8125rem] leading-snug text-muted-foreground">{{ item.message }}</ToastDescription>
            </div>
            <ToastClose class="icon-btn size-7 shrink-0 text-muted-foreground" :aria-label="t('toast.close')"><Icon name="close" /></ToastClose>
        </ToastRoot>
        <ToastViewport class="pointer-events-none fixed top-4 left-1/2 z-[60] flex w-[calc(100vw-1.5rem)] max-w-[22.5rem] -translate-x-1/2 list-none flex-col gap-2 p-0" />
    </ToastProvider>
</template>
