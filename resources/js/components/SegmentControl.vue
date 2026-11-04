<script setup lang="ts" generic="T extends string | number">
defineProps<{ label: string; options: { value: T; label: string }[]; id: string }>();
const model = defineModel<T>({ required: true });
</script>

<template>
    <div role="radiogroup" :aria-labelledby="`${id}-label`" class="flex flex-col gap-2">
        <span :id="`${id}-label`" class="text-sm font-medium">{{ label }}</span>
        <div class="grid grid-cols-2 gap-1 rounded-lg bg-surface-sunken p-1 sm:grid-cols-4">
            <button
                v-for="o in options"
                :key="o.value"
                type="button"
                role="radio"
                :aria-checked="model === o.value"
                class="min-h-9 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :class="model === o.value ? 'bg-foreground text-background' : 'text-foreground hover:bg-accent'"
                @click="model = o.value"
            >
                {{ o.label }}
            </button>
        </div>
    </div>
</template>
