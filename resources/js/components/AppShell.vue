<script setup lang="ts">
import { computed } from 'vue';
import Icon, { type IconName } from '@/components/Icon.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { de } from '@/lang/de';

const props = defineProps<{ variant: 'create' | 'view' }>();
const copy = computed(() => (props.variant === 'create' ? de.shell.create : de.shell.view));
const trust: { icon: IconName; title: string; body: string }[] = de.shell.trust.map((t, i) => ({
    ...t,
    icon: (['lock', 'eye-off', 'hash', 'flame', 'fingerprint'] as IconName[])[i]!,
}));
const secure = typeof window !== 'undefined' && window.isSecureContext;
</script>

<template>
    <div class="min-h-screen bg-stage lg:grid lg:grid-cols-[23rem_minmax(0,1fr)] xl:grid-cols-[27rem_minmax(0,1fr)]">
        <aside class="side relative flex flex-col gap-7 overflow-hidden bg-side px-5 py-6 text-side-foreground sm:px-8 lg:min-h-screen lg:py-9 xl:px-10" data-testid="sidebar">
            <div class="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.07)_1px,transparent_0)] [background-size:22px_22px]" aria-hidden="true" />

            <a href="/" class="relative flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--focus)">
                <span class="icon-tile"><Icon name="lock" /></span>
                <span class="text-lg font-bold tracking-tight">{{ de.app.name }}</span>
            </a>

            <div class="relative flex flex-col gap-3">
                <h2 class="text-2xl leading-tight font-bold tracking-tight text-balance lg:text-[1.75rem]">{{ copy.headline }}</h2>
                <p class="max-w-sm text-sm leading-relaxed text-side-muted">{{ copy.lead }}</p>
            </div>

            <ul class="relative grid grid-cols-2 gap-x-4 gap-y-3 lg:flex lg:flex-col lg:gap-4" :aria-label="de.shell.trustLabel">
                <li v-for="t in trust" :key="t.title" class="flex items-start gap-3">
                    <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-side-line bg-white/10 text-primary"><Icon :name="t.icon" /></span>
                    <span class="flex flex-col">
                        <span class="text-sm leading-snug font-semibold">{{ t.title }}</span>
                        <span class="hidden text-xs leading-relaxed text-side-muted lg:block">{{ t.body }}</span>
                    </span>
                </li>
            </ul>

            <details class="group relative rounded-lg border border-side-line bg-black/20 text-sm">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) [&::-webkit-details-marker]:hidden">
                    {{ de.shell.coverageTitle }}
                    <Icon name="chevron-right" class="transition-transform group-open:rotate-90 motion-reduce:transition-none" />
                </summary>
                <div class="flex flex-col gap-3 border-t border-side-line px-3 py-3 text-xs leading-relaxed text-side-muted">
                    <p><strong class="text-side-foreground">{{ de.shell.covered }}</strong> {{ de.shell.coveredBody }}</p>
                    <p><strong class="text-side-foreground">{{ de.shell.notCovered }}</strong> {{ de.shell.notCoveredBody }}</p>
                </div>
            </details>

            <p class="relative mt-auto flex items-center gap-2 text-xs text-side-muted"><Icon name="shield" />{{ de.app.footer }}</p>
        </aside>

        <div class="flex min-w-0 flex-col">
            <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-10 lg:py-5">
                <p class="flex items-center gap-2 text-xs font-medium" :class="secure ? 'text-muted-foreground' : 'text-foreground'" data-testid="secure-indicator">
                    <Icon :name="secure ? 'shield' : 'alert'" />{{ secure ? de.shell.secure : de.shell.insecure }}
                </p>
                <ThemeToggle />
            </div>
            <main class="flex flex-1 flex-col items-center px-4 pb-10 sm:px-8 lg:px-10">
                <slot />
            </main>
        </div>
    </div>
</template>
