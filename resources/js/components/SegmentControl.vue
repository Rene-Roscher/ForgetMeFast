<script setup lang="ts" generic="T extends string | number">
defineProps<{ label: string; options: { value: T; label: string; title: string }[]; id: string }>();
const model = defineModel<T>({ required: true });
</script>

<template>
    <div role="radiogroup" :aria-labelledby="`${id}-label`" class="flex flex-col gap-2">
        <span :id="`${id}-label`" class="label">{{ label }}</span>
        <div class="grid grid-cols-4 gap-1 rounded-xl border border-caption bg-input p-1">
            <button
                v-for="o in options"
                :key="o.value"
                type="button"
                role="radio"
                :aria-checked="model === o.value"
                :aria-label="o.title"
                :title="o.title"
                class="min-h-9 cursor-pointer rounded-lg px-1 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground"
                :class="model === o.value ? 'bg-foreground text-background' : 'text-foreground hover:bg-accent'"
                @click="model = o.value"
            >
                {{ o.label }}
            </button>
        </div>
    </div>
</template>
