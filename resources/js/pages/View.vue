<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api, ApiError, errorKey } from '@/api';
import PasswordField from '@/components/PasswordField.vue';
import { useCountdown } from '@/composables/useCountdown';
import { CryptoError, isCryptoAvailable, prepareOpen } from '@/crypto';
import { initialFragment } from '@/fragment';
import { de } from '@/lang/de';

type Phase = 'loading' | 'insecure' | 'incomplete' | 'unavailable' | 'ready' | 'working' | 'revealed';

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
        const map: Record<string, string> = { network: de.errors.network, throttled: de.errors.throttled, invalidInput: de.errors.invalidInput };
        return map[errorKey(e)] ?? de.errors.server;
    }
    if (e instanceof CryptoError) {
        const map: Record<string, string> = { DecryptFailed: de.errors.decryptFailed, InsecureContext: de.errors.insecure.body, InvalidPassword: de.errors.passwordTooShort };
        return map[e.code] ?? de.errors.server;
    }
    return de.errors.server;
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
            message.value = left > 0 ? de.view.wrongPassword(left) : de.view.lastFailed;
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
        message.value = de.result.copyFailed;
    }
    setTimeout(() => (copied.value = false), 2500);
}

const busy = computed(() => phase.value === 'working');
</script>

<template>
    <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
        <header class="text-center">
            <p class="text-sm font-semibold text-muted-foreground">{{ de.app.name }}</p>
        </header>

        <main class="rounded-2xl border border-border-strong bg-card p-6 shadow-(--elevation-raised)" aria-live="polite">
            <div v-if="phase === 'loading'" class="text-center text-sm text-muted-foreground" data-testid="loading">{{ de.view.loading }}</div>

            <div v-else-if="phase === 'insecure'" class="text-center" data-testid="insecure">
                <h1 class="text-lg font-semibold">⚠ {{ de.errors.insecure.title }}</h1>
                <p class="mt-2 text-sm">{{ de.errors.insecure.body }}</p>
            </div>

            <div v-else-if="phase === 'incomplete'" class="text-center" data-testid="incomplete">
                <h1 class="text-lg font-semibold">⚠ {{ de.errors.incomplete.title }}</h1>
                <p class="mt-2 text-sm">{{ de.errors.incomplete.body }}</p>
            </div>

            <div v-else-if="phase === 'unavailable'" class="flex flex-col items-center gap-3 text-center" data-testid="unavailable">
                <h1 class="text-lg font-semibold">{{ de.errors.unavailable.title }}</h1>
                <p v-if="message" role="alert" class="text-sm font-medium">⚠ {{ message }}</p>
                <p class="text-sm text-muted-foreground">{{ de.errors.unavailable.body }}</p>
                <a href="/" class="min-h-11 rounded-lg border border-caption px-4 py-2.5 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{{ de.errors.home }}</a>
            </div>

            <form v-else-if="phase === 'ready' || phase === 'working'" class="flex flex-col gap-4" novalidate @submit.prevent="submit">
                <div class="text-center">
                    <p class="text-3xl" aria-hidden="true">🔒</p>
                    <h1 class="text-lg font-semibold">{{ de.view.title }}</h1>
                    <p class="mt-1 text-sm text-muted-foreground">{{ de.view.lead }}</p>
                </div>
                <PasswordField id="view-password" ref="passwordInput" v-model="password" :label="de.view.password" autocomplete="current-password" :invalid="message !== null" describedby="view-status" />
                <p id="view-status" role="alert" class="min-h-5 rounded-lg text-sm font-medium" :class="message ? 'border-l-4 border-destructive bg-surface-sunken p-3' : ''" data-testid="status">
                    <template v-if="message">⚠ {{ message }}</template>
                </p>
                <button type="submit" :disabled="busy || password.length === 0" data-testid="view-submit" class="min-h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-(--primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60">
                    {{ busy ? de.view.working : de.view.submit }}
                </button>
            </form>

            <section v-else class="flex flex-col gap-4" data-testid="revealed">
                <h1 class="text-center text-lg font-semibold">{{ de.view.secretLabel }}</h1>
                <div class="relative">
                    <pre :aria-hidden="!shown" class="max-h-72 overflow-auto rounded-xl bg-surface-sunken p-3 font-mono text-sm break-words whitespace-pre-wrap transition-[filter]" :class="shown ? '' : 'blur-md select-none'" data-testid="secret-text">{{ secret }}</pre>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="min-h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-(--primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" :aria-pressed="shown" data-testid="reveal" @click="reveal">{{ shown ? de.view.hideAgain : de.view.reveal }}</button>
                    <button type="button" class="min-h-11 flex-1 rounded-lg border border-caption px-4 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-testid="copy" @click="copy">{{ copied ? '✓ ' + de.result.copied : de.view.copy }}</button>
                </div>
                <p class="text-xs text-muted-foreground">{{ de.view.autoHide }}</p>
                <p v-if="message" role="alert" class="text-sm">⚠ {{ message }}</p>
                <ul class="flex flex-col gap-1 text-sm">
                    <li v-if="viewsLeft !== null" data-testid="views-left">{{ de.view.viewsLeft(viewsLeft) }}</li>
                    <li v-if="remaining" data-testid="countdown">{{ de.view.expiresIn }} {{ remaining }}</li>
                </ul>
            </section>
        </main>
    </div>
</template>
