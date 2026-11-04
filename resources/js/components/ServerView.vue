<script setup lang="ts">
import { computed } from 'vue';
import Icon from '@/components/Icon.vue';
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
    <details class="group rounded-lg border border-border bg-inset" data-testid="server-view" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
        <summary class="flex cursor-pointer list-none items-center gap-3 rounded-lg p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" class="transition-transform motion-reduce:transition-none group-open:rotate-90" />
            <span class="flex flex-col">
                <span class="flex items-center gap-2 text-sm font-semibold"><Icon name="server" />{{ de.create.serverView }}</span>
                <span class="hint">{{ de.create.serverViewHint }}</span>
            </span>
        </summary>
        <div class="flex flex-col gap-3 border-t border-border p-3">
            <pre v-if="body" class="max-h-72 overflow-auto rounded-md border border-border-strong bg-card p-3 font-mono text-xs leading-relaxed" data-testid="server-body">{{ shown }}</pre>
            <p v-else class="hint">{{ de.create.serverViewPending }}</p>
            <p class="flex items-center gap-2 text-xs font-medium"><Icon name="shield" />{{ de.create.serverViewNotIncluded }}</p>
        </div>
    </details>
</template>
