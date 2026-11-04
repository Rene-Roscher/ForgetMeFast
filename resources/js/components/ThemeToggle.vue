<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';
import Tip from '@/components/ui/Tip.vue';

// Die Klasse "dark" setzt public/theme-init.js vor dem ersten Zeichnen; hier wird nur umgeschaltet und die Wahl
// ("light" oder "dark") in localStorage gemerkt. Sonst nichts, und kein Cookie.
const { t } = useI18n();
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
    <Tip :text="dark ? t('theme.toLight') : t('theme.toDark')">
        <button type="button" class="icon-btn border border-border-strong bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)]" data-testid="theme-toggle" :aria-label="dark ? t('theme.toLight') : t('theme.toDark')" @click="toggle">
            <Icon :name="dark ? 'sun' : 'moon'" />
        </button>
    </Tip>
</template>
