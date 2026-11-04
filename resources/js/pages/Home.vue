<script setup lang="ts">
import { de } from '@/lang/de';
</script>

<template>
    <main class="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 class="text-2xl font-semibold">{{ de.home.heading }}</h1>
        <p class="text-muted-foreground">{{ de.home.lead }}</p>
    </main>
</template>
