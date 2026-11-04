<script setup lang="ts">
// Auswahl aus einer kurzen Liste (Reka UI Select): Tastatur, Typeahead und Screenreader wie bei einer nativen Auswahl,
// aber gestaltbar. Öffnet nach oben, weil die Aktionsleiste am unteren Rand liegt.
import { computed } from 'vue';
import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui';
import Icon, { type IconName } from '@/components/Icon.vue';

const props = defineProps<{ id: string; label: string; icon: IconName; options: { value: number; label: string; title: string }[] }>();
const model = defineModel<number>({ required: true });
const current = computed(() => props.options.find((o) => o.value === model.value));

function update(value: unknown): void {
    if (value !== undefined && value !== null && value !== '') model.value = Number(value);
}
</script>

<template>
    <SelectRoot :model-value="String(model)" @update:model-value="update">
        <SelectTrigger :id="id" :aria-label="label" class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-caption bg-input px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent data-[state=open]:bg-accent">
            <Icon :name="icon" class="text-muted-foreground" />
            <span class="hidden text-muted-foreground lg:inline">{{ label }}</span>
            <SelectValue :aria-label="current?.title"><span class="whitespace-nowrap">{{ current?.label }}</span></SelectValue>
            <Icon name="chevron-down" class="text-muted-foreground" />
        </SelectTrigger>
        <SelectPortal>
            <SelectContent position="popper" side="top" :side-offset="8" align="start" class="modal-content-pop z-50 min-w-40 rounded-md border border-border-strong bg-card p-1 shadow-xl">
                <SelectViewport>
                    <SelectItem v-for="o in options" :key="o.value" :value="String(o.value)" class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-accent data-[state=checked]:font-semibold">
                        <SelectItemText>{{ o.title }}</SelectItemText>
                        <SelectItemIndicator><Icon name="check" /></SelectItemIndicator>
                    </SelectItem>
                </SelectViewport>
            </SelectContent>
        </SelectPortal>
    </SelectRoot>
</template>
