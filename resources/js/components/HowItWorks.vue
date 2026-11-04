<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';

// Erklärt in vier Schritten die Technik hinter dem Link: Link, # im Link, Passwort, beides zusammen. Öffnet als Popover
// (in der Seitenleiste zur Seite, am Handy am Seitenende nach oben). Die Farben sind Zugabe, die Bedeutung steht im Text.
defineProps<{ tone: 'side' | 'card'; testid: string }>();
const { t } = useI18n();
const steps: { key: string; icon: IconName; tint: string }[] = [
    { key: 'link', icon: 'link', tint: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
    { key: 'fragment', icon: 'hash', tint: 'bg-brand/15 text-brand' },
    { key: 'password', icon: 'key', tint: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
    { key: 'result', icon: 'lock', tint: 'bg-emerald-500/15 text-positive' },
];
</script>

<template>
    <PopoverRoot>
        <div :data-testid="testid" :class="tone === 'side' ? '' : 'card-flat'">
            <PopoverTrigger class="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium" :class="tone === 'side' ? 'border border-side-line bg-white/5 hover:bg-white/10' : 'hover:bg-accent'">
                <span class="flex items-center gap-2"><Icon name="help" />{{ t('shell.how.title') }}</span>
                <Icon :name="tone === 'side' ? 'chevron-right' : 'chevron-down'" class="text-muted-foreground group-data-[state=open]:text-foreground" />
            </PopoverTrigger>
        </div>
        <PopoverPortal>
            <PopoverContent :side="tone === 'side' ? 'right' : 'top'" :align="tone === 'side' ? 'end' : 'center'" :side-offset="tone === 'side' ? 36 : 12" :collision-padding="12" class="popover-content z-50 flex max-h-[calc(100dvh-2rem)] w-[min(25rem,calc(100vw-1.5rem))] flex-col gap-4 overflow-auto rounded-xl border border-border bg-card p-4 shadow-2xl outline-none" data-testid="how-content">
                <div class="flex flex-col gap-1">
                    <h2 class="text-sm font-semibold text-foreground">{{ t('shell.how.title') }}</h2>
                    <p class="text-xs leading-relaxed text-muted-foreground">{{ t('shell.how.lead') }}</p>
                </div>
                <ol class="flex flex-col gap-3.5">
                    <li v-for="(step, i) in steps" :key="step.key" class="flex items-start gap-3">
                        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg" :class="step.tint"><Icon :name="step.icon" /></span>
                        <span class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium text-foreground"><span class="mr-1.5 text-muted-foreground tabular-nums">{{ i + 1 }}</span>{{ t(`shell.how.${step.key}.title`) }}</span>
                            <span class="text-[0.8125rem] leading-relaxed text-muted-foreground">{{ t(`shell.how.${step.key}.body`) }}</span>
                        </span>
                    </li>
                </ol>
            </PopoverContent>
        </PopoverPortal>
    </PopoverRoot>
</template>
