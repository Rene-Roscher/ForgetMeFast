<script setup lang="ts">
// Tooltip (Reka UI). Nur Text; der Auslöser behält seinen eigenen zugänglichen Namen (aria-label).
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui';

defineProps<{ text: string; side?: 'top' | 'right' | 'bottom' | 'left' }>();
</script>

<template>
    <TooltipRoot>
        <TooltipTrigger as-child><slot /></TooltipTrigger>
        <TooltipPortal>
            <TooltipContent :side="side ?? 'bottom'" :side-offset="8" class="tip z-50 rounded-md bg-foreground px-2.5 py-1.5 text-sm font-medium text-background shadow-lg">{{ text }}</TooltipContent>
        </TooltipPortal>
    </TooltipRoot>
</template>
