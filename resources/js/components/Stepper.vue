<script setup lang="ts">
import Icon from '@/components/Icon.vue';

const props = defineProps<{ label: string; id: string; min: number; max: number; hint?: string }>();
const model = defineModel<number>({ required: true });
const step = (d: number) => {
    model.value = Math.min(props.max, Math.max(props.min, model.value + d));
};
</script>

<template>
    <div class="flex flex-col gap-2">
        <span :id="`${id}-label`" class="label">{{ label }}</span>
        <div class="inline-flex w-fit items-center rounded-xl border border-caption bg-input p-1" role="group" :aria-labelledby="`${id}-label`">
            <button type="button" class="icon-btn" :disabled="model <= min" aria-label="weniger" @click="step(-1)"><Icon name="minus" /></button>
            <output :id="id" class="w-9 text-center text-base font-semibold tabular-nums" aria-live="polite">{{ model }}</output>
            <button type="button" class="icon-btn" :disabled="model >= max" aria-label="mehr" @click="step(1)"><Icon name="plus" /></button>
        </div>
        <p v-if="hint" class="hint">{{ hint }}</p>
    </div>
</template>
