<script setup lang="ts">
// Kompakte Zahl mit Plus und Minus (Reka UI NumberField) für die Aktionsleiste: Pfeiltasten, Tippen mit Grenzen, "spinbutton".
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput, NumberFieldRoot } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';

defineProps<{ id: string; label: string; icon: IconName; min: number; max: number }>();
const model = defineModel<number>({ required: true });
const { t } = useI18n();

function update(value: number | null | undefined): void {
    if (typeof value === 'number' && Number.isFinite(value)) model.value = value;
}
</script>

<template>
    <NumberFieldRoot :id="id" :model-value="model" :min="min" :max="max" :step="1" locale="de-DE" class="flat-ctl inline-flex h-9 items-center justify-center gap-0.5 pr-0.5 pl-1.5 focus-within:bg-accent sm:pl-2.5" @update:model-value="update">
        <label :for="id" class="flex items-center gap-2 text-sm text-muted-foreground"><Icon :name="icon" /><span class="hidden lg:inline">{{ label }}</span></label>
        <NumberFieldDecrement class="no-ring icon-btn size-8 hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:shadow-none sm:size-7" :aria-label="`${label}: ${t('stepper.less')}`"><Icon name="minus" /></NumberFieldDecrement>
        <NumberFieldInput class="no-ring h-8 w-6 bg-transparent text-center text-base font-semibold text-foreground tabular-nums focus-visible:shadow-none focus-visible:outline-none sm:text-sm" />
        <NumberFieldIncrement class="no-ring icon-btn size-8 hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:shadow-none sm:size-7" :aria-label="`${label}: ${t('stepper.more')}`"><Icon name="plus" /></NumberFieldIncrement>
    </NumberFieldRoot>
</template>
