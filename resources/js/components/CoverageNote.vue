<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';

// Die Grenzen des Schutzes als Popover. In der Seitenleiste (tone "side") öffnet es zur Seite, am Handy (tone "card") am
// Seitenende nach oben, dort mit den Vertrauens-Punkten, weil es am Handy keine Seitenleiste gibt.
defineProps<{ tone: 'side' | 'card'; testid: string; withTrust?: boolean }>();
const { t } = useI18n();
const trust: { key: string; icon: IconName }[] = [
    { key: 'encrypted', icon: 'lock' },
    { key: 'zeroKnowledge', icon: 'eye-off' },
    { key: 'fragment', icon: 'hash' },
    { key: 'selfDestruct', icon: 'flame' },
    { key: 'hardened', icon: 'fingerprint' },
];
</script>

<template>
    <PopoverRoot>
        <div :data-testid="testid" :class="tone === 'side' ? '' : 'card-flat'">
            <PopoverTrigger class="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium" :class="tone === 'side' ? 'border border-side-line bg-white/5 hover:bg-white/10' : 'hover:bg-accent'">
                {{ t('shell.coverage.title') }}
                <Icon :name="tone === 'side' ? 'chevron-right' : 'chevron-down'" class="text-muted-foreground group-data-[state=open]:text-foreground" />
            </PopoverTrigger>
        </div>
        <PopoverPortal>
            <PopoverContent :side="tone === 'side' ? 'right' : 'top'" :align="tone === 'side' ? 'end' : 'center'" :side-offset="tone === 'side' ? 36 : 12" :collision-padding="12" class="popover-content z-50 flex max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-auto rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground shadow-2xl outline-none" data-testid="coverage-content">
                <h2 class="text-sm font-semibold text-foreground">{{ t('shell.coverage.title') }}</h2>
                <ul v-if="withTrust" class="flex flex-col gap-3" :aria-label="t('shell.trustLabel')">
                    <li v-for="item in trust" :key="item.key" class="flex items-start gap-3">
                        <Icon :name="item.icon" class="mt-0.5 text-brand" />
                        <span class="flex flex-col gap-0.5">
                            <span class="font-medium text-foreground">{{ t(`shell.trust.${item.key}.title`) }}</span>
                            <span class="text-xs">{{ t(`shell.trust.${item.key}.body`) }}</span>
                        </span>
                    </li>
                </ul>
                <p><strong class="text-foreground">{{ t('shell.coverage.protects') }}</strong> {{ t('shell.coverage.protectsBody') }}</p>
                <p><strong class="text-foreground">{{ t('shell.coverage.limits') }}</strong> {{ t('shell.coverage.limitsBody') }}</p>
            </PopoverContent>
        </PopoverPortal>
    </PopoverRoot>
</template>
