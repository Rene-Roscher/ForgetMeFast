<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import { de } from '@/lang/de';
</script>

<template>
    <header class="flex items-center justify-between gap-4">
        <a href="/" class="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
            <span class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl"><Icon name="lock" /></span>
            <span class="flex flex-col leading-tight">
                <span class="text-lg font-bold tracking-tight">{{ de.app.name }}</span>
                <span class="hidden text-xs text-muted-foreground sm:block">{{ de.app.tagline }}</span>
            </span>
        </a>
        <span class="chip hidden sm:inline-flex"><Icon name="shield" />{{ de.app.badge }}</span>
    </header>
</template>
