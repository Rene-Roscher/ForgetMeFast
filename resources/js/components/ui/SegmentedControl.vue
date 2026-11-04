<script setup lang="ts">
// Auswahl aus wenigen festen Werten (Reka UI ToggleGroup, genau ein Wert). Pfeiltasten wandern, Leertaste wählt.
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui';

defineProps<{ id: string; label: string; options: { value: number; label: string; title: string }[] }>();
const model = defineModel<number>({ required: true });

function update(value: unknown): void {
    // Ein ToggleGroup mit type="single" meldet beim Abwählen einen leeren Wert; eine Auswahl muss aber bleiben.
    if (value !== undefined && value !== null && value !== '') model.value = Number(value);
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <span :id="`${id}-label`" class="label">{{ label }}</span>
        <ToggleGroupRoot type="single" :model-value="String(model)" :aria-labelledby="`${id}-label`" class="grid grid-cols-4 gap-1 rounded-lg border border-caption bg-input p-1" @update:model-value="update">
            <ToggleGroupItem
                v-for="o in options"
                :key="o.value"
                :value="String(o.value)"
                :aria-label="o.title"
                class="min-h-10 cursor-pointer rounded-md px-1 text-sm font-semibold whitespace-nowrap text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus) data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm"
            >
                {{ o.label }}
            </ToggleGroupItem>
        </ToggleGroupRoot>
    </div>
</template>
