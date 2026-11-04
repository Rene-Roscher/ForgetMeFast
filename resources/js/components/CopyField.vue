<script setup lang="ts">
import { ref } from 'vue';
import Icon, { type IconName } from '@/components/Icon.vue';
import { de } from '@/lang/de';

const props = defineProps<{ step: number; label: string; value: string; hint: string; testid: string; icon: IconName; breakAnywhere?: boolean }>();
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
    <section class="flex flex-col gap-3 rounded-2xl border border-border-strong bg-surface-panel p-5">
        <div class="flex items-center gap-3">
            <span class="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background" aria-hidden="true">{{ step }}</span>
            <h3 class="flex items-center gap-2 text-base font-semibold"><Icon :name="icon" />{{ label }}</h3>
        </div>
        <code :data-testid="testid" class="block rounded-xl border border-border-strong bg-card p-3 font-mono text-sm leading-relaxed select-all" :class="breakAnywhere ? 'break-all' : 'break-words'">{{ value }}</code>
        <p class="hint">{{ hint }}</p>
        <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="btn btn-primary" @click="copy"><Icon :name="state === 'copied' ? 'check' : 'copy'" />{{ de.result.copy }}</button>
            <span role="status" class="flex items-center gap-1.5 text-sm text-foreground">
                <template v-if="state === 'copied'"><Icon name="check-circle" />{{ de.result.copied }}</template>
                <template v-else-if="state === 'failed'"><Icon name="alert" />{{ de.result.copyFailed }}</template>
            </span>
        </div>
    </section>
</template>
