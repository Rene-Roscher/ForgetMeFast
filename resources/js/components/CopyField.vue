<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';

const props = defineProps<{ step: number; label: string; value: string; hint: string; testid: string; icon: IconName; breakAnywhere?: boolean }>();
const { t } = useI18n();
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
    <section class="card-inner flex flex-col gap-4">
        <div class="flex items-center gap-3">
            <span class="flex size-8 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background" aria-hidden="true">{{ step }}</span>
            <h3 class="flex items-center gap-2 text-lg font-semibold"><Icon :name="icon" />{{ label }}</h3>
        </div>
        <code :data-testid="testid" class="block rounded-lg border border-border-strong bg-card p-4 font-mono text-[0.9375rem] leading-relaxed select-all" :class="breakAnywhere ? 'break-all' : 'break-words'">{{ value }}</code>
        <p class="hint">{{ hint }}</p>
        <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="btn btn-primary" @click="copy"><Icon :name="state === 'copied' ? 'check' : 'copy'" />{{ state === 'copied' ? t('result.copied') : t('result.copy') }}</button>
            <span role="status" class="flex items-center gap-2 text-sm text-foreground">
                <template v-if="state === 'failed'"><Icon name="alert" />{{ t('result.copyFailed') }}</template>
            </span>
        </div>
    </section>
</template>
