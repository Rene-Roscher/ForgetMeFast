<script setup lang="ts">
import { TooltipProvider } from 'reka-ui';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import CoverageNote from '@/components/CoverageNote.vue';
import HistoryDrawer from '@/components/HistoryDrawer.vue';
import Icon, { type IconName } from '@/components/Icon.vue';
import LogoMark from '@/components/LogoMark.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import Toaster from '@/components/Toaster.vue';
import Tip from '@/components/ui/Tip.vue';
import { useHistory } from '@/history';
import { historyOpen } from '@/ui';

const props = defineProps<{ variant: 'create' | 'view'; dock?: boolean; center?: boolean }>();
const history = useHistory();
const { t } = useI18n();
const copy = computed(() => (props.variant === 'create' ? 'shell.create' : 'shell.view'));
const trust: { key: string; icon: IconName }[] = [
    { key: 'encrypted', icon: 'lock' },
    { key: 'zeroKnowledge', icon: 'eye-off' },
    { key: 'fragment', icon: 'hash' },
    { key: 'selfDestruct', icon: 'flame' },
    { key: 'hardened', icon: 'fingerprint' },
];
const secure = typeof window !== 'undefined' && window.isSecureContext;
</script>

<template>
    <TooltipProvider :delay-duration="300">
        <Toaster />
        <HistoryDrawer />
        <div class="min-h-screen bg-stage lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
            <!-- Seitenleiste nur am Desktop. Auf dem Handy kommt der Inhalt zuerst. Ganz unten: die Grenzen des Schutzes. -->
            <aside class="side hidden flex-col gap-7 border-r border-side-line bg-side px-6 py-7 text-side-foreground lg:flex lg:min-h-screen xl:px-7" data-testid="sidebar">
                <a href="/" class="flex items-center gap-2.5 rounded-md">
                    <LogoMark :size="30" />
                    <span class="text-base font-semibold tracking-tight">{{ t('app.name') }}</span>
                </a>
                <div class="flex flex-col gap-2">
                    <h2 class="text-lg leading-snug font-semibold tracking-tight text-balance">{{ t(`${copy}.headline`) }}</h2>
                    <p class="text-sm leading-relaxed text-side-muted">{{ t(`${copy}.lead`) }}</p>
                </div>
                <ul class="flex flex-col gap-4" :aria-label="t('shell.trustLabel')">
                    <li v-for="item in trust" :key="item.key" class="flex items-start gap-3">
                        <span class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-side-line bg-white/5 text-side-accent"><Icon :name="item.icon" /></span>
                        <span class="flex flex-col gap-0.5">
                            <span class="text-sm leading-snug font-medium">{{ t(`shell.trust.${item.key}.title`) }}</span>
                            <span class="text-xs leading-relaxed text-side-muted">{{ t(`shell.trust.${item.key}.body`) }}</span>
                        </span>
                    </li>
                </ul>
                <div class="mt-auto flex flex-col gap-2">
                    <button type="button" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-side-line bg-white/5 px-3.5 py-2.5 text-left text-sm font-medium hover:bg-white/10" data-testid="history-open" @click="historyOpen = true">
                        <span class="flex items-center gap-2"><Icon name="history" />{{ t('history.open') }}</span>
                        <span v-if="history.entries.value.length > 0" class="rounded-md bg-white/15 px-1.5 text-xs tabular-nums" data-testid="history-count">{{ history.entries.value.length }}</span>
                    </button>
                    <CoverageNote tone="side" testid="coverage" />
                </div>
            </aside>

            <div class="flex min-w-0 flex-col">
                <!-- Kopfzeile: Handy = Marke und Umschalter, Desktop = Titel der Seite und Umschalter. Der Titel steht nur einmal im DOM. -->
                <header class="grid [grid-template-areas:'brand_tools''title_title'] items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-3 lg:[grid-template-areas:'title_tools'] lg:items-start lg:border-0 lg:bg-transparent lg:px-8 lg:pt-7 lg:pb-0">
                    <a href="/" class="flex min-h-9 items-center gap-2 rounded-md [grid-area:brand] lg:hidden">
                        <LogoMark :size="28" /><span class="text-sm font-semibold tracking-tight">{{ t('app.name') }}</span>
                    </a>
                    <div class="flex min-w-0 flex-col gap-0.5 [grid-area:title]"><slot name="header" /></div>
                    <div class="flex items-center gap-3 justify-self-end [grid-area:tools]">
                        <p class="hidden items-center gap-1.5 text-xs font-medium lg:flex" :class="secure ? 'text-muted-foreground' : 'text-foreground'" data-testid="secure-indicator">
                            <Icon :name="secure ? 'shield' : 'alert'" />{{ secure ? t('shell.secure') : t('shell.insecure') }}
                        </p>
                        <Tip :text="t('history.open')"><button type="button" class="icon-btn border border-border-strong bg-card lg:hidden" :aria-label="t('history.open')" data-testid="history-open-mobile" @click="historyOpen = true"><Icon name="history" /></button></Tip>
                        <ThemeToggle />
                    </div>
                </header>

                <main class="flex flex-1 flex-col items-center gap-4 px-3 pt-4 sm:px-6 lg:px-8" :class="[dock ? 'pb-40 sm:pb-32' : 'pb-10', center ? 'justify-center' : '']">
                    <slot />
                    <!-- Handy: keine Seitenleiste, deshalb die Grenzen (und das, was schützt) ganz unten. -->
                    <section class="w-full max-w-6xl pt-2 lg:hidden">
                        <CoverageNote tone="card" testid="coverage-mobile" with-trust />
                    </section>
                </main>
            </div>
        </div>
    </TooltipProvider>
</template>
