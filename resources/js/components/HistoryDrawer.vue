<script setup lang="ts">
// Verlauf als Fach von rechts (Reka UI Dialog). Geöffnet wird es über "Verlauf" in der Seitenleiste oder in der Kopfzeile am Handy.
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';
import SecretHistory from '@/components/SecretHistory.vue';
import { historyOpen } from '@/ui';

const { t } = useI18n();
</script>

<template>
    <DialogRoot v-model:open="historyOpen">
        <DialogPortal>
            <DialogOverlay class="modal-overlay fixed inset-0 z-40 bg-black/50" />
            <DialogContent class="sheet-content fixed inset-y-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl outline-none" data-testid="history-drawer">
                <header class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                    <div class="flex flex-col gap-1">
                        <DialogTitle class="text-base font-semibold tracking-tight">{{ t('history.title') }}</DialogTitle>
                        <DialogDescription class="text-xs text-muted-foreground">{{ t('history.lead') }}</DialogDescription>
                    </div>
                    <button type="button" class="icon-btn" :aria-label="t('history.close')" data-testid="history-close" @click="historyOpen = false"><Icon name="close" /></button>
                </header>
                <SecretHistory class="min-h-0 flex-1" />
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
