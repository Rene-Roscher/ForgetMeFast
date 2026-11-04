<script setup lang="ts">
// Ein-/Aus-Schalter (Reka UI Toggle) für die Aktionsleiste: Icon und, ab großen Fenstern, auch die Beschriftung.
import { Toggle } from 'reka-ui';
import Icon, { type IconName } from '@/components/Icon.vue';
import Tip from '@/components/ui/Tip.vue';

defineProps<{ label: string; hint: string; icon: IconName; testid?: string }>();
const model = defineModel<boolean>({ required: true });
</script>

<template>
    <Tip :text="hint" side="top">
        <Toggle v-model="model" :aria-label="label" :data-testid="testid" class="flat-ctl inline-flex h-9 cursor-pointer items-center justify-center gap-2 px-2.5 text-sm font-medium data-[state=on]:bg-brand/15 data-[state=on]:text-brand">
            <Icon :name="icon" class="transition-transform duration-200 data-[on=true]:scale-110" />
            <span class="hidden lg:inline">{{ label }}</span>
        </Toggle>
    </Tip>
</template>
