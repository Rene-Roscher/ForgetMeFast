<script setup lang="ts">
// Eine Meldung als eigene Karte (von vue-sonner nur platziert, gestapelt und zeitgesteuert). Links ein schmaler Strich in der
// Farbe der Art (rot, grün, neutral), der mit der verbleibenden Zeit nach oben wegläuft; beim Überfahren pausiert er, wie die
// Zeit der Bibliothek. Die Art steht zusätzlich im Titel und in der Rolle, die Farbe ist nur Zugabe.
import { toast as sonner } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';

const props = defineProps<{ id: string; kind: 'error' | 'success' | 'info'; title: string; message: string; duration: number }>();
const { t } = useI18n();
const bar = { error: 'bg-destructive', success: 'bg-emerald-500', info: 'bg-foreground/40' } as const;
</script>

<template>
    <div :data-testid="`toast-${kind}`" :role="kind === 'error' ? 'alert' : 'status'" class="toast-card flex w-full items-stretch gap-3 rounded-xl border border-border bg-card p-3 pl-3 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.18)]">
        <span class="toast-bar w-[3px] shrink-0 rounded-full" :class="bar[kind]" :style="{ animationDuration: `${duration}ms` }" aria-hidden="true" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
            <p class="text-sm leading-5 font-medium">{{ title }}</p>
            <p class="text-[0.8125rem] leading-snug text-muted-foreground">{{ message }}</p>
        </div>
        <button type="button" class="icon-btn -my-0.5 -mr-1 size-7 self-start text-muted-foreground" :aria-label="t('toast.close')" @click="sonner.dismiss(props.id)"><Icon name="close" /></button>
    </div>
</template>
