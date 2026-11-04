<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';
import { toast } from '@/toast';

const props = defineProps<{ step: number; label: string; value: string; hint: string; testid: string; icon: IconName; copiedMessage: string; breakAnywhere?: boolean }>();
const { t } = useI18n();

async function copy() {
    try {
        await navigator.clipboard.writeText(props.value);
        toast.success(props.copiedMessage);
    } catch {
        toast.error(t('result.copyFailed'));
    }
}
</script>

<template>
    <section class="flex flex-col gap-2.5 border-t border-border pt-4 first-of-type:border-0 first-of-type:pt-0">
        <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
                <span class="flex size-6 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background" aria-hidden="true">{{ step }}</span>
                <h3 class="flex items-center gap-2 text-sm font-semibold"><Icon :name="icon" />{{ label }}</h3>
            </div>
            <button type="button" class="btn btn-primary btn-sm" @click="copy"><Icon name="copy" />{{ t('result.copy') }}</button>
        </div>
        <code :data-testid="testid" class="block rounded-md bg-inset p-3 font-mono text-[0.8125rem] leading-relaxed select-all" :class="breakAnywhere ? 'break-all' : 'break-words'">{{ value }}</code>
        <p class="hint">{{ hint }}</p>
    </section>
</template>
