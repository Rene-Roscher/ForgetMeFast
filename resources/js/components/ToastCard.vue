<script setup lang="ts">
// Eine Meldung als eigene Karte (von vue-sonner nur platziert, gestapelt und zeitgesteuert). Icon in getönter Kachel, Titel,
// Text und ein eigener Schließen-Knopf. Die Optik kommt ganz von uns, damit nichts von der Bibliothek dazwischenfunkt.
import { toast as sonner } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';

const props = defineProps<{ id: string; kind: 'error' | 'success' | 'info'; title: string; message: string }>();
const { t } = useI18n();
const icons = { error: 'alert', success: 'check-circle', info: 'shield' } as const;
const tone = {
    error: 'bg-destructive/15 text-destructive',
    success: 'bg-emerald-500/15 text-positive',
    info: 'bg-accent text-foreground',
} as const;
</script>

<template>
    <div :data-testid="`toast-${kind}`" :role="kind === 'error' ? 'alert' : 'status'" class="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.18)]">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-lg" :class="tone[kind]"><Icon :name="icons[kind]" /></span>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5 pt-px">
            <p class="text-sm leading-5 font-medium">{{ title }}</p>
            <p class="text-[0.8125rem] leading-snug text-muted-foreground">{{ message }}</p>
        </div>
        <button type="button" class="icon-btn -mt-0.5 -mr-1 size-7 text-muted-foreground" :aria-label="t('toast.close')" @click="sonner.dismiss(props.id)"><Icon name="close" /></button>
    </div>
</template>
