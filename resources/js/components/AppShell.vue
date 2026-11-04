<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger, TooltipProvider } from 'reka-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';
import LogoMark from '@/components/LogoMark.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

const props = defineProps<{ variant: 'create' | 'view' }>();
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
const coverageOpen = ref(false);
</script>

<template>
    <TooltipProvider :delay-duration="300">
        <div class="min-h-screen bg-stage lg:grid lg:grid-cols-[24rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)]">
            <aside class="side relative flex flex-col gap-8 overflow-hidden bg-side px-5 py-6 text-side-foreground sm:px-8 lg:min-h-screen lg:py-10 xl:px-11" data-testid="sidebar">
                <div class="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.07)_1px,transparent_0)] [background-size:22px_22px]" aria-hidden="true" />

                <a href="/" class="relative flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--focus)">
                    <span class="icon-tile text-primary-foreground"><LogoMark :size="30" /></span>
                    <span class="text-xl font-bold tracking-tight">{{ t('app.name') }}</span>
                </a>

                <div class="relative flex flex-col gap-3">
                    <h2 class="text-2xl leading-tight font-bold tracking-tight text-balance lg:text-[1.9rem]">{{ t(`${copy}.headline`) }}</h2>
                    <p class="max-w-sm text-base leading-relaxed text-side-muted">{{ t(`${copy}.lead`) }}</p>
                </div>

                <ul class="relative grid grid-cols-2 gap-x-4 gap-y-4 lg:flex lg:flex-col lg:gap-5" :aria-label="t('shell.trustLabel')">
                    <li v-for="item in trust" :key="item.key" class="flex items-start gap-3">
                        <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-side-line bg-white/10 text-side-accent"><Icon :name="item.icon" /></span>
                        <span class="flex flex-col gap-0.5">
                            <span class="text-[0.9375rem] leading-snug font-semibold">{{ t(`shell.trust.${item.key}.title`) }}</span>
                            <span class="hidden text-sm leading-relaxed text-side-muted lg:block">{{ t(`shell.trust.${item.key}.body`) }}</span>
                        </span>
                    </li>
                </ul>

                <CollapsibleRoot v-model:open="coverageOpen" class="relative rounded-xl border border-side-line bg-black/20">
                    <CollapsibleTrigger class="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-[0.9375rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus)">
                        {{ t('shell.coverage.title') }}
                        <Icon name="chevron-right" class="transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div class="flex flex-col gap-3 border-t border-side-line px-4 py-4 text-sm leading-relaxed text-side-muted">
                            <p><strong class="text-side-foreground">{{ t('shell.coverage.protects') }}</strong> {{ t('shell.coverage.protectsBody') }}</p>
                            <p><strong class="text-side-foreground">{{ t('shell.coverage.limits') }}</strong> {{ t('shell.coverage.limitsBody') }}</p>
                        </div>
                    </CollapsibleContent>
                </CollapsibleRoot>

                <p class="relative mt-auto flex items-center gap-2 text-sm text-side-muted"><Icon name="shield" />{{ t('shell.footer') }}</p>
            </aside>

            <div class="flex min-w-0 flex-col">
                <div class="flex items-start justify-between gap-4 px-4 pt-5 sm:px-8 lg:px-10 lg:pt-8">
                    <div class="flex min-w-0 flex-col gap-1"><slot name="header" /></div>
                    <div class="flex shrink-0 items-center gap-3">
                        <p class="hidden items-center gap-2 text-sm font-medium sm:flex" :class="secure ? 'text-muted-foreground' : 'text-foreground'" data-testid="secure-indicator">
                            <Icon :name="secure ? 'shield' : 'alert'" />{{ secure ? t('shell.secure') : t('shell.insecure') }}
                        </p>
                        <ThemeToggle />
                    </div>
                </div>
                <main class="flex flex-1 flex-col items-center px-4 pt-5 pb-10 sm:px-8 lg:px-10">
                    <slot />
                </main>
            </div>
        </div>
    </TooltipProvider>
</template>
