<script setup lang="ts">
// Zahl mit Plus und Minus (Reka UI NumberField): Pfeiltasten, Mausrad und Tippen mit Grenzen, als "spinbutton" zugänglich.
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput, NumberFieldRoot } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';

defineProps<{ id: string; label: string; min: number; max: number; hint?: string }>();
const model = defineModel<number>({ required: true });
const { t } = useI18n();

function update(value: number | null | undefined): void {
    if (typeof value === 'number' && Number.isFinite(value)) model.value = value;
}
</script>

<template>
    <NumberFieldRoot :id="id" :model-value="model" :min="min" :max="max" :step="1" locale="de-DE" class="flex flex-col gap-2" @update:model-value="update">
        <label :for="id" class="label">{{ label }}</label>
        <div class="inline-flex w-fit items-center rounded-lg border border-caption bg-input p-1">
            <NumberFieldDecrement class="icon-btn" :aria-label="`${label}: ${t('stepper.less')}`"><Icon name="minus" /></NumberFieldDecrement>
            <NumberFieldInput class="w-11 bg-transparent text-center text-base font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus)" />
            <NumberFieldIncrement class="icon-btn" :aria-label="`${label}: ${t('stepper.more')}`"><Icon name="plus" /></NumberFieldIncrement>
        </div>
        <p v-if="hint" class="hint">{{ hint }}</p>
    </NumberFieldRoot>
</template>
