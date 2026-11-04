<script setup lang="ts">
// Ein-/Aus-Schalter (Reka UI Toggle) für die Aktionsleiste: Icon und, ab großen Fenstern, auch die Beschriftung.
import { Toggle } from 'reka-ui';
import Icon, { type IconName } from '@/components/Icon.vue';
import Tip from '@/components/ui/Tip.vue';

defineProps<{ label: string; hint: string; icon: IconName; testid?: string; tone?: 'brand' | 'danger' }>();
const model = defineModel<boolean>({ required: true });
</script>

<template>
    <Tip :text="hint" side="top">
        <Toggle v-model="model" :aria-label="label" :data-testid="testid" class="group flat-ctl inline-flex h-9 cursor-pointer items-center justify-center gap-2 px-2.5 text-sm font-medium" :class="tone === 'danger' ? 'aria-pressed:bg-destructive/10' : 'aria-pressed:bg-brand/15'">
            <Icon :name="icon" class="transition-[color,transform] duration-200 group-aria-pressed:scale-110" :class="tone === 'danger' ? 'group-aria-pressed:text-destructive' : 'group-aria-pressed:text-brand'" />
            <span class="hidden lg:inline">{{ label }}</span>
        </Toggle>
    </Tip>
</template>
