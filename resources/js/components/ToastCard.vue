<script setup lang="ts">
// Eine Meldung als eigene Karte (von vue-sonner nur platziert, gestapelt und zeitgesteuert). Nur der Text der Meldung, kein Titel. Links ein
// schmaler Strich in der Farbe der Art (rot, grün, neutral), der mit der verbleibenden Zeit von oben nach unten wegläuft;
// beim Überfahren pausiert er, wie die Zeit der Bibliothek. Die Art steht in der Rolle (alert oder status), die Farbe ist Zugabe.
import { toast as sonner } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';

const props = defineProps<{ id: string; kind: 'error' | 'success' | 'info'; message: string; duration: number }>();
const { t } = useI18n();
const bar = { error: 'bg-destructive', success: 'bg-emerald-500', info: 'bg-foreground/40' } as const;
</script>

<template>
    <div :data-testid="`toast-${kind}`" :role="kind === 'error' ? 'alert' : 'status'" class="toast-card flex w-full items-stretch gap-3 rounded-xl border border-border bg-card p-3 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.18)]">
        <span class="toast-bar w-[3px] shrink-0 rounded-full" :class="bar[kind]" :style="{ animationDuration: `${duration}ms` }" aria-hidden="true" />
        <p class="min-w-0 flex-1 py-0.5 text-sm leading-5">{{ message }}</p>
        <button type="button" class="icon-btn -my-0.5 -mr-1 size-7 self-start text-muted-foreground" :aria-label="t('toast.close')" @click="sonner.dismiss(props.id)"><Icon name="close" /></button>
    </div>
</template>
