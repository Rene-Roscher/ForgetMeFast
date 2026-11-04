<script setup lang="ts">
import { ref } from 'vue';
import { de } from '@/lang/de';

const props = defineProps<{ label: string; value: string; hint?: string; testid: string }>();
const state = ref<'idle' | 'copied' | 'failed'>('idle');

async function copy() {
    try {
        await navigator.clipboard.writeText(props.value);
        state.value = 'copied';
    } catch {
        state.value = 'failed';
    }
    setTimeout(() => (state.value = 'idle'), 2500);
}
</script>

<template>
    <section class="flex flex-col gap-2 rounded-xl border border-caption bg-surface-raised p-4">
        <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold">{{ label }}</h3>
            <span class="rounded-full border border-caption px-2 py-0.5 text-xs font-medium">{{ de.result.sendSeparately }}</span>
        </div>
        <code :data-testid="testid" class="block break-all rounded-lg bg-surface-sunken p-3 font-mono text-sm select-all">{{ value }}</code>
        <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
        <div class="flex items-center gap-3">
            <button type="button" class="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-(--primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" @click="copy">
                {{ de.result.copy }}
            </button>
            <span role="status" class="text-sm text-muted-foreground">
                <template v-if="state === 'copied'">✓ {{ de.result.copied }}</template>
                <template v-else-if="state === 'failed'">{{ de.result.copyFailed }}</template>
            </span>
        </div>
    </section>
</template>
