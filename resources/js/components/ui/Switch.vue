<script setup lang="ts">
// Schalter (Reka UI Switch). Gebunden wird `modelValue`, nicht `checked`.
import { SwitchRoot, SwitchThumb } from 'reka-ui';

defineProps<{ id: string; label: string; hint?: string }>();
const model = defineModel<boolean>({ required: true });
</script>

<template>
    <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-0.5">
            <label :for="id" class="label cursor-pointer">{{ label }}</label>
            <p v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</p>
        </div>
        <SwitchRoot :id="id" v-model="model" :aria-describedby="hint ? `${id}-hint` : undefined" class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-caption bg-input transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) data-[state=checked]:border-primary data-[state=checked]:bg-primary">
            <SwitchThumb class="block size-4 translate-x-1 rounded-full bg-foreground shadow transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-foreground motion-reduce:transition-none" />
        </SwitchRoot>
    </div>
</template>
