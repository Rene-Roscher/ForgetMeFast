<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/Icon.vue';
import { de } from '@/lang/de';

// Die Klasse "dark" setzt public/theme-init.js vor dem ersten Zeichnen; hier wird nur umgeschaltet und die Wahl
// ("light" oder "dark") in localStorage gemerkt. Sonst nichts, und kein Cookie.
const dark = ref(document.documentElement.classList.contains('dark'));

function toggle(): void {
    dark.value = !dark.value;
    document.documentElement.classList.toggle('dark', dark.value);
    try {
        localStorage.setItem('fmf-theme', dark.value ? 'dark' : 'light');
    } catch {
        // Speicher gesperrt: das Design gilt dann nur für diese Sitzung.
    }
}
</script>

<template>
    <button type="button" class="icon-btn border border-border-strong bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)]" data-testid="theme-toggle" :aria-label="dark ? de.theme.toLight : de.theme.toDark" :title="dark ? de.theme.toLight : de.theme.toDark" @click="toggle">
        <Icon :name="dark ? 'sun' : 'moon'" />
    </button>
</template>
