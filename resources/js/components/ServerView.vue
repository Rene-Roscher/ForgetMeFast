<script setup lang="ts">
import { computed } from 'vue';
import type { CreateBody } from '@/crypto';
import { de } from '@/lang/de';

const props = defineProps<{ body: CreateBody | null }>();
const open = defineModel<boolean>('open', { default: false });

/** Der exakte Body, nur der Ciphertext ist für die Anzeige gekürzt (Länge steht dabei). */
const shown = computed(() => {
    if (!props.body) return '';
    const c = props.body.ciphertext;
    return JSON.stringify({ ...props.body, ciphertext: `${c.slice(0, 48)}${de.create.ciphertextTruncated(c.length)}` }, null, 2);
});
</script>

<template>
    <details class="rounded-xl border border-caption bg-surface-panel p-3" data-testid="server-view" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
        <summary class="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{{ de.create.serverView }}</summary>
        <p class="mt-2 text-xs text-muted-foreground">{{ de.create.serverViewHint }}</p>
        <pre v-if="body" class="mt-2 max-h-72 overflow-auto rounded-lg bg-surface-sunken p-3 font-mono text-xs" data-testid="server-body">{{ shown }}</pre>
        <p v-else class="mt-2 text-xs text-muted-foreground">{{ de.create.serverViewPending }}</p>
        <p class="mt-2 text-xs font-medium">{{ de.create.serverViewNotIncluded }}</p>
    </details>
</template>
