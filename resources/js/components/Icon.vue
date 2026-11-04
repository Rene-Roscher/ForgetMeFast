<script setup lang="ts">
// Eigene Linien-Icons (24 x 24, Strichstärke 1,75, currentColor). Ein Satz für die ganze Oberfläche: keine Emojis und
// keine Sonderzeichen als Symbole. Dekorativ (aria-hidden), die Bedeutung steht immer im Text daneben.
export type IconName =
    | 'lock' | 'eye' | 'eye-off' | 'dice' | 'copy' | 'check' | 'check-circle' | 'alert' | 'trash' | 'minus' | 'plus'
    | 'clock' | 'shield' | 'chevron-right' | 'ban' | 'link' | 'key' | 'refresh' | 'arrow-right' | 'server';
defineProps<{ name: IconName }>();
</script>

<template>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="size-[1.15em] shrink-0">
        <template v-if="name === 'lock'"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></template>
        <template v-else-if="name === 'eye'"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.75" /></template>
        <template v-else-if="name === 'eye-off'"><path d="M9.9 5.7A10 10 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3 3.7M6.3 7.4A17 17 0 0 0 2 12s3.6 6.5 10 6.5a9.6 9.6 0 0 0 4-.9" /><path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" /><path d="M4 4l16 16" /></template>
        <template v-else-if="name === 'dice'"><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" /></template>
        <template v-else-if="name === 'copy'"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V7a3 3 0 0 1 3-3h8" /></template>
        <template v-else-if="name === 'check'"><path d="M5 12.5l4.5 4.5L19 7.5" /></template>
        <template v-else-if="name === 'check-circle'"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></template>
        <template v-else-if="name === 'alert'"><path d="M12 3.8L2.8 19.5h18.4L12 3.8z" /><path d="M12 10v4" /><path d="M12 17.2v.01" /></template>
        <template v-else-if="name === 'trash'"><path d="M4 7h16" /><path d="M9 7V4.5h6V7" /><path d="M6.5 7l.9 12.5h9.2L17.5 7" /><path d="M10 11v5M14 11v5" /></template>
        <template v-else-if="name === 'minus'"><path d="M6 12h12" /></template>
        <template v-else-if="name === 'plus'"><path d="M6 12h12M12 6v12" /></template>
        <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></template>
        <template v-else-if="name === 'shield'"><path d="M12 3l7.5 2.8V12c0 4.4-3.1 7.4-7.5 9-4.4-1.6-7.5-4.6-7.5-9V5.8L12 3z" /><path d="M9 12l2.2 2.2L15.5 10" /></template>
        <template v-else-if="name === 'chevron-right'"><path d="M9 6l6 6-6 6" /></template>
        <template v-else-if="name === 'ban'"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></template>
        <template v-else-if="name === 'link'"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></template>
        <template v-else-if="name === 'key'"><circle cx="8" cy="15" r="3.5" /><path d="M10.5 12.5L20 3M16 7l2.5 2.5" /></template>
        <template v-else-if="name === 'refresh'"><path d="M20 11a8 8 0 0 0-14.3-4M4 4v3.5h3.5" /><path d="M4 13a8 8 0 0 0 14.3 4M20 20v-3.5h-3.5" /></template>
        <template v-else-if="name === 'arrow-right'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
        <template v-else-if="name === 'server'"><rect x="4" y="4" width="16" height="6.5" rx="2" /><rect x="4" y="13.5" width="16" height="6.5" rx="2" /><path d="M8 7.2v.01M8 16.8v.01" /></template>
    </svg>
</template>
