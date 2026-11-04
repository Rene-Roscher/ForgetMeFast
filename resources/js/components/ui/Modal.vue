<script setup lang="ts">
// Dialog (Reka UI): sichtbarer Titel als Name, Beschreibung verknüpft, Fokus hinein und beim Schließen zurück, Esc schließt.
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';

defineProps<{ title: string; description: string; wide?: boolean; testid?: string }>();
const open = defineModel<boolean>('open', { required: true });
</script>

<template>
    <DialogRoot v-model:open="open">
        <DialogPortal>
            <DialogOverlay class="modal-overlay fixed inset-0 z-[70] bg-black/60 backdrop-blur-[2px]" />
            <DialogContent :data-testid="testid" class="modal-content fixed top-1/2 left-1/2 z-[80] flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-card shadow-2xl focus:outline-none" :class="wide ? 'max-w-2xl' : 'max-w-md'">
                <header class="flex flex-col gap-1.5 p-6 pb-4">
                    <DialogTitle class="text-lg font-semibold tracking-tight">{{ title }}</DialogTitle>
                    <DialogDescription class="text-sm text-muted-foreground">{{ description }}</DialogDescription>
                </header>
                <div v-if="$slots.default" class="min-h-0 flex-1 overflow-auto px-6 pb-4"><slot /></div>
                <footer class="flex flex-col-reverse gap-2 rounded-b-lg border-t border-border bg-inset px-6 py-4 sm:flex-row sm:justify-end"><slot name="footer" /></footer>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
