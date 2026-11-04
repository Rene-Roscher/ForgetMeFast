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
            <DialogContent class="sheet-content fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl" data-testid="history-drawer">
                <header class="flex items-start justify-between gap-3 border-b border-border p-4">
                    <div class="flex flex-col gap-1">
                        <DialogTitle class="text-base font-semibold tracking-tight">{{ t('history.title') }}</DialogTitle>
                        <DialogDescription class="text-xs text-muted-foreground">{{ t('history.lead') }}</DialogDescription>
                    </div>
                    <button type="button" class="icon-btn" :aria-label="t('history.close')" data-testid="history-close" @click="historyOpen = false"><Icon name="close" /></button>
                </header>
                <div class="min-h-0 flex-1 overflow-auto p-4"><SecretHistory /></div>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
