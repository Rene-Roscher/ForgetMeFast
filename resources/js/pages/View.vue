<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { api, ApiError, errorKey } from '@/api';
import AppShell from '@/components/AppShell.vue';
import Icon from '@/components/Icon.vue';
import PasswordField from '@/components/PasswordField.vue';
import { useCountdown } from '@/composables/useCountdown';
import { CryptoError, isCryptoAvailable, prepareOpen } from '@/crypto';
import { initialFragment } from '@/fragment';

type Phase = 'loading' | 'insecure' | 'incomplete' | 'unavailable' | 'ready' | 'working' | 'revealed';

const { t } = useI18n();
const phase = ref<Phase>('loading');
const password = ref('');
const message = ref<string | null>(null);
const secret = ref('');
const shown = ref(false);
const viewsLeft = ref<number | null>(null);
const expiresAt = ref<Date | null>(null);
const remaining = useCountdown(expiresAt);
const passwordInput = ref<HTMLElement | null>(null);

// Der Link-Key kommt aus fragment.ts und liegt nur hier im Speicher.
let linkKey = '';
let id = '';
let params: unknown = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(async () => {
    id = location.pathname.split('/').filter(Boolean).pop() ?? '';
    linkKey = initialFragment; // schon aus der Adresse entfernt, bevor Inertia startete (fragment.ts)

    if (!isCryptoAvailable()) return void (phase.value = 'insecure');
    if (linkKey === '') return void (phase.value = 'incomplete');
    try {
        params = await api.params(id);
        phase.value = 'ready';
    } catch (e) {
        message.value = e instanceof ApiError && errorKey(e) === 'unavailable' ? null : fail(e);
        phase.value = e instanceof ApiError && errorKey(e) === 'unavailable' ? 'unavailable' : 'ready';
    }
});
onBeforeUnmount(() => clearTimeout(hideTimer));

function fail(e: unknown): string {
    if (e instanceof ApiError) {
        const map: Record<string, string> = { network: t('errors.network'), throttled: t('errors.throttled'), invalidInput: t('errors.invalidInput') };
        return map[errorKey(e)] ?? t('errors.server');
    }
    if (e instanceof CryptoError) {
        const map: Record<string, string> = { DecryptFailed: t('errors.decryptFailed'), InsecureContext: t('errors.insecure.body'), InvalidPassword: t('errors.passwordTooShort') };
        return map[e.code] ?? t('errors.server');
    }
    return t('errors.server');
}

async function submit(): Promise<void> {
    if (phase.value !== 'ready' || password.value.length === 0) return;
    message.value = null;
    phase.value = 'working';
    try {
        if (params === null) params = await api.params(id);
        const prepared = await prepareOpen({ id, linkKey, password: password.value, params });
        const response = await api.open(id, prepared.proof);
        secret.value = await prepared.finish(response);
        viewsLeft.value = response.views_left;
        expiresAt.value = new Date(response.expires_at);
        password.value = '';
        shown.value = false;
        phase.value = 'revealed';
    } catch (e) {
        if (e instanceof ApiError && errorKey(e) === 'unavailable') return void (phase.value = 'unavailable');
        if (e instanceof ApiError && errorKey(e) === 'invalid') {
            const left = e.attemptsLeft ?? 0;
            message.value = left > 0 ? t('view.wrong', left) : t('view.lastFailed');
            if (left === 0) return void (phase.value = 'unavailable');
        } else {
            message.value = fail(e);
        }
        phase.value = 'ready';
        queueMicrotask(() => document.getElementById('view-password')?.focus());
    }
}

function reveal(): void {
    shown.value = !shown.value;
    clearTimeout(hideTimer);
    if (shown.value) hideTimer = setTimeout(() => (shown.value = false), 60_000);
}

const copied = ref(false);
async function copy(): Promise<void> {
    try {
        await navigator.clipboard.writeText(secret.value);
        copied.value = true;
    } catch {
        copied.value = false;
        message.value = t('result.copyFailed');
    }
    setTimeout(() => (copied.value = false), 2500);
}

const busy = computed(() => phase.value === 'working');
</script>

<template>
    <AppShell variant="view">
        <section class="card-outer max-w-lg" aria-live="polite">
            <div v-if="phase === 'loading'" class="flex items-center gap-4 p-7 text-base text-muted-foreground" data-testid="loading">
                <span class="icon-tile"><Icon name="lock" /></span>{{ t('view.loading') }}
            </div>

            <div v-else-if="phase === 'insecure'" class="flex flex-col gap-5 p-7" data-testid="insecure">
                <span class="icon-tile bg-inset text-foreground"><Icon name="alert" /></span>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">{{ t('errors.insecure.title') }}</h1>
                    <p class="mt-2 text-base text-muted-foreground">{{ t('errors.insecure.body') }}</p>
                </div>
            </div>

            <div v-else-if="phase === 'incomplete'" class="flex flex-col gap-5 p-7" data-testid="incomplete">
                <span class="icon-tile bg-inset text-foreground"><Icon name="link" /></span>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">{{ t('errors.incomplete.title') }}</h1>
                    <p class="mt-2 text-base text-muted-foreground">{{ t('errors.incomplete.body') }}</p>
                </div>
            </div>

            <div v-else-if="phase === 'unavailable'" class="flex flex-col gap-5 p-7" data-testid="unavailable">
                <span class="icon-tile bg-inset text-foreground"><Icon name="ban" /></span>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">{{ t('errors.unavailable.title') }}</h1>
                    <p class="mt-2 text-base text-muted-foreground">{{ t('errors.unavailable.body') }}</p>
                </div>
                <p v-if="message" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                <a href="/" class="btn btn-secondary w-fit"><Icon name="plus" />{{ t('errors.unavailable.cta') }}</a>
            </div>

            <form v-else-if="phase === 'ready' || phase === 'working'" novalidate @submit.prevent="submit">
                <div class="flex flex-col gap-6 p-5 sm:p-7">
                    <div class="flex items-start gap-4">
                        <span class="icon-tile"><Icon name="lock" /></span>
                        <div>
                            <h1 class="text-2xl font-bold tracking-tight">{{ t('view.title') }}</h1>
                            <p class="mt-1 text-base text-muted-foreground">{{ t('view.lead') }}</p>
                        </div>
                    </div>
                    <div class="card-inner">
                        <PasswordField id="view-password" ref="passwordInput" v-model="password" :label="t('view.password')" autocomplete="current-password" :invalid="message !== null" describedby="view-status" />
                    </div>
                    <div id="view-status" role="alert" data-testid="status">
                        <p v-if="message" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                    </div>
                </div>
                <footer class="rounded-b-2xl border-t border-border bg-inset px-5 py-4 sm:px-7">
                    <button type="submit" :disabled="busy || password.length === 0" data-testid="view-submit" class="btn btn-primary btn-lg w-full">
                        {{ busy ? t('view.working') : t('view.submit') }}<Icon v-if="!busy" name="arrow-right" />
                    </button>
                </footer>
            </form>

            <section v-else data-testid="revealed">
                <div class="flex flex-col gap-5 p-5 sm:p-7">
                    <div class="flex items-center gap-4">
                        <span class="icon-tile"><Icon name="check" /></span>
                        <h1 class="text-2xl font-bold tracking-tight">{{ t('view.revealedTitle') }}</h1>
                    </div>
                    <pre :aria-hidden="!shown" class="card-inner max-h-80 overflow-auto font-mono text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap transition-[filter] motion-reduce:transition-none" :class="shown ? '' : 'blur-md select-none'" data-testid="secret-text">{{ secret }}</pre>
                    <div class="grid grid-cols-2 gap-3">
                        <button type="button" class="btn btn-primary" :aria-pressed="shown" data-testid="reveal" @click="reveal"><Icon :name="shown ? 'eye-off' : 'eye'" />{{ shown ? t('view.hide') : t('view.reveal') }}</button>
                        <button type="button" class="btn btn-secondary" data-testid="copy" @click="copy"><Icon :name="copied ? 'check' : 'copy'" />{{ copied ? t('result.copied') : t('view.copy') }}</button>
                    </div>
                    <p v-if="message" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                </div>
                <footer class="rounded-b-2xl border-t border-border bg-inset px-5 py-4 sm:px-7">
                    <ul class="flex flex-col gap-2.5 text-base">
                        <li v-if="viewsLeft !== null" class="flex items-center gap-3" data-testid="views-left"><Icon name="eye" />{{ viewsLeft === 0 ? t('view.lastView') : t('view.viewsLeft', viewsLeft) }}</li>
                        <li v-if="remaining" class="flex items-center gap-3" data-testid="countdown"><Icon name="clock" />{{ t('view.expiresIn', { time: remaining }) }}</li>
                        <li class="flex items-center gap-3 text-muted-foreground"><Icon name="shield" />{{ t('view.autoHide') }}</li>
                    </ul>
                </footer>
            </section>
        </section>
    </AppShell>
</template>
