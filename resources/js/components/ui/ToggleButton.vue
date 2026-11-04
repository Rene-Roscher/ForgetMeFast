<script setup lang="ts">
// Ein-/Aus-Knopf (Reka UI Toggle), gebunden über `pressed`. Mit Tooltip, weil nur ein Icon sichtbar ist.
import { Toggle } from 'reka-ui';
import Icon, { type IconName } from '@/components/Icon.vue';
import Tip from '@/components/ui/Tip.vue';

defineProps<{ label: string; icon: IconName; testid?: string }>();
const model = defineModel<boolean>({ required: true });
</script>

<template>
    <Tip :text="label" side="top">
        <Toggle v-model="model" :aria-label="label" :data-testid="testid" class="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-caption bg-input text-foreground transition-colors hover:bg-accent data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background">
            <Icon :name="icon" />
        </Toggle>
    </Tip>
</template>
