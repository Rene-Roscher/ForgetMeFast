<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon, { type IconName } from '@/components/Icon.vue';

// Die Grenzen des Schutzes, eingeklappt. In der Seitenleiste (tone "side") und am Handy am Seitenende (tone "card"), dort mit den
// Vertrauens-Punkten, weil es am Handy keine Seitenleiste gibt.
defineProps<{ tone: 'side' | 'card'; testid: string; withTrust?: boolean }>();
const { t } = useI18n();
const open = ref(false);
const trust: { key: string; icon: IconName }[] = [
    { key: 'encrypted', icon: 'lock' },
    { key: 'zeroKnowledge', icon: 'eye-off' },
    { key: 'fragment', icon: 'hash' },
    { key: 'selfDestruct', icon: 'flame' },
    { key: 'hardened', icon: 'fingerprint' },
];
</script>

<template>
    <CollapsibleRoot v-model:open="open" :data-testid="testid" :class="tone === 'side' ? 'rounded-md border border-side-line bg-white/5' : 'card-outer'">
        <CollapsibleTrigger class="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3.5 py-2.5 text-left text-sm font-medium">
            {{ t('shell.coverage.title') }}
            <Icon name="chevron-right" class="transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none" />
        </CollapsibleTrigger>
        <CollapsibleContent>
            <div class="flex flex-col gap-3 border-t px-3.5 py-3 text-xs leading-relaxed" :class="tone === 'side' ? 'border-side-line text-side-muted' : 'border-border text-muted-foreground'">
                <ul v-if="withTrust" class="flex flex-col gap-3" :aria-label="t('shell.trustLabel')">
                    <li v-for="item in trust" :key="item.key" class="flex items-start gap-3">
                        <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-inset text-brand"><Icon :name="item.icon" /></span>
                        <span class="flex flex-col gap-0.5">
                            <span class="text-sm leading-snug font-medium text-foreground">{{ t(`shell.trust.${item.key}.title`) }}</span>
                            <span>{{ t(`shell.trust.${item.key}.body`) }}</span>
                        </span>
                    </li>
                </ul>
                <p><strong :class="tone === 'side' ? 'text-side-foreground' : 'text-foreground'">{{ t('shell.coverage.protects') }}</strong> {{ t('shell.coverage.protectsBody') }}</p>
                <p><strong :class="tone === 'side' ? 'text-side-foreground' : 'text-foreground'">{{ t('shell.coverage.limits') }}</strong> {{ t('shell.coverage.limitsBody') }}</p>
            </div>
        </CollapsibleContent>
    </CollapsibleRoot>
</template>
