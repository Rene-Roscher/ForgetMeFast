<script setup lang="ts">
// Marke der App: eine Hand, die ein Schloss trägt (ein Geheimnis wird übergeben, sicher verschlossen). Bewusst schlicht aus
// Strichen und einem vollen Schloss, damit sie auch bei 16 px lesbar bleibt. Die Hand folgt der Form von Lucide "hand-heart"
// (ISC), das Schloss ist eigen. Dieselbe Marke steht als public/favicon.svg.
defineProps<{ size?: number }>();
</script>

<template>
    <svg :width="size ?? 32" :height="size ?? 32" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="#0f766e"/>
        <g transform="translate(2.8 7) scale(1.05)" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/>
        <path d="m2 15 6 6"/>
        <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91"/>
        </g>
        <g transform="translate(0.6 -1)">
        <path d="M13.2 8.4V7.2a2.8 2.8 0 0 1 5.6 0v1.2" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>
        <rect x="10.6" y="8" width="10.8" height="8" rx="2.2" fill="#fff"/>
        <circle cx="16" cy="11.5" r="1.2" fill="#0f766e"/>
        <path d="M16 12v2" stroke="#0f766e" stroke-width="1.5" stroke-linecap="round"/>
        </g>
    </svg>
</template>
