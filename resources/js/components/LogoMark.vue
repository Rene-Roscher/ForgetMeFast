<script setup lang="ts">
// Wortmarke der App: ein Schloss, in dem ein Handschlag steckt (zwei Parteien, ein geteiltes Geheimnis). Der Handschlag
// ist das Lucide-Icon "handshake" (ISC), eingesetzt in den Schlosskörper. Dieselbe Marke steht als public/favicon.svg.
import { Handshake } from 'lucide-vue-next';
defineProps<{ size?: number }>();
</script>

<template>
    <svg :width="size ?? 28" :height="size ?? 28" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M10 13.5V10a6 6 0 0 1 12 0v3.5" />
        <rect x="5" y="13" width="22" height="15" rx="4" />
        <Handshake x="9.4" y="15.3" :width="13" :height="13" :stroke-width="2.4" viewBox="0 0 24 24" />
    </svg>
</template>
