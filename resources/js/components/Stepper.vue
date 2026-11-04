<script setup lang="ts">
const props = defineProps<{ label: string; id: string; min: number; max: number; hint?: string }>();
const model = defineModel<number>({ required: true });
const step = (d: number) => {
    model.value = Math.min(props.max, Math.max(props.min, model.value + d));
};
</script>

<template>
    <div class="flex flex-col gap-1">
        <span :id="`${id}-label`" class="text-sm font-medium">{{ label }}</span>
        <div class="flex items-center gap-2" role="group" :aria-labelledby="`${id}-label`">
            <button type="button" class="size-10 rounded-lg border border-caption text-lg font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60" :disabled="model <= min" aria-label="weniger" @click="step(-1)">−</button>
            <output :id="id" class="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">{{ model }}</output>
            <button type="button" class="size-10 rounded-lg border border-caption text-lg font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60" :disabled="model >= max" aria-label="mehr" @click="step(1)">+</button>
        </div>
        <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
    </div>
</template>
