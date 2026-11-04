<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api, ApiError, errorKey } from '@/api';
import AppHeader from '@/components/AppHeader.vue';
import Icon from '@/components/Icon.vue';
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
    <div class="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-4 py-6 sm:py-8">
        <AppHeader />

        <main class="flex flex-1 flex-col justify-center" aria-live="polite">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-(--elevation-raised) sm:p-8">
                <div v-if="phase === 'loading'" class="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground" data-testid="loading">
                    <Icon name="lock" class="text-3xl" />{{ de.view.loading }}
                </div>

                <div v-else-if="phase === 'insecure'" class="flex flex-col items-center gap-3 text-center" data-testid="insecure">
                    <span class="flex size-12 items-center justify-center rounded-xl bg-surface-sunken text-2xl"><Icon name="alert" /></span>
                    <h1 class="text-xl font-bold tracking-tight">{{ de.errors.insecure.title }}</h1>
                    <p class="text-sm text-muted-foreground">{{ de.errors.insecure.body }}</p>
                </div>

                <div v-else-if="phase === 'incomplete'" class="flex flex-col items-center gap-3 text-center" data-testid="incomplete">
                    <span class="flex size-12 items-center justify-center rounded-xl bg-surface-sunken text-2xl"><Icon name="link" /></span>
                    <h1 class="text-xl font-bold tracking-tight">{{ de.errors.incomplete.title }}</h1>
                    <p class="text-sm text-muted-foreground">{{ de.errors.incomplete.body }}</p>
                </div>

                <div v-else-if="phase === 'unavailable'" class="flex flex-col items-center gap-3 text-center" data-testid="unavailable">
                    <span class="flex size-12 items-center justify-center rounded-xl bg-surface-sunken text-2xl"><Icon name="ban" /></span>
                    <h1 class="text-xl font-bold tracking-tight">{{ de.errors.unavailable.title }}</h1>
                    <p v-if="message" role="alert" class="notice w-full text-left"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                    <p class="text-sm text-muted-foreground">{{ de.errors.unavailable.body }}</p>
                    <a href="/" class="btn btn-secondary mt-2"><Icon name="plus" />{{ de.errors.home }}</a>
                </div>

                <form v-else-if="phase === 'ready' || phase === 'working'" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
                    <div class="flex flex-col items-center gap-3 text-center">
                        <span class="flex size-12 items-center justify-center rounded-xl bg-primary text-2xl text-primary-foreground"><Icon name="lock" /></span>
                        <h1 class="text-xl font-bold tracking-tight">{{ de.view.title }}</h1>
                        <p class="text-sm text-muted-foreground">{{ de.view.lead }}</p>
                    </div>
                    <PasswordField id="view-password" ref="passwordInput" v-model="password" :label="de.view.password" autocomplete="current-password" :invalid="message !== null" describedby="view-status" />
                    <div id="view-status" role="alert" data-testid="status">
                        <p v-if="message" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                    </div>
                    <button type="submit" :disabled="busy || password.length === 0" data-testid="view-submit" class="btn btn-primary btn-lg w-full">
                        {{ busy ? de.view.working : de.view.submit }}<Icon v-if="!busy" name="arrow-right" />
                    </button>
                </form>

                <section v-else class="flex flex-col gap-5" data-testid="revealed">
                    <div class="flex flex-col items-center gap-3 text-center">
                        <span class="flex size-12 items-center justify-center rounded-xl bg-primary text-2xl text-primary-foreground"><Icon name="check" /></span>
                        <h1 class="text-xl font-bold tracking-tight">{{ de.view.secretLabel }}</h1>
                    </div>
                    <pre :aria-hidden="!shown" class="max-h-72 overflow-auto rounded-xl border border-border-strong bg-surface-sunken p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap transition-[filter] motion-reduce:transition-none" :class="shown ? '' : 'blur-md select-none'" data-testid="secret-text">{{ secret }}</pre>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="btn btn-primary" :aria-pressed="shown" data-testid="reveal" @click="reveal"><Icon :name="shown ? 'eye-off' : 'eye'" />{{ shown ? de.view.hideAgain : de.view.reveal }}</button>
                        <button type="button" class="btn btn-secondary" data-testid="copy" @click="copy"><Icon :name="copied ? 'check' : 'copy'" />{{ copied ? de.result.copied : de.view.copy }}</button>
                    </div>
                    <p v-if="message" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                    <ul class="flex flex-col gap-2 border-t border-border pt-4 text-sm">
                        <li v-if="viewsLeft !== null" class="flex items-center gap-2" data-testid="views-left"><Icon name="eye" />{{ de.view.viewsLeft(viewsLeft) }}</li>
                        <li v-if="remaining" class="flex items-center gap-2" data-testid="countdown"><Icon name="clock" />{{ de.view.expiresIn }} {{ remaining }}</li>
                        <li class="flex items-center gap-2 text-muted-foreground"><Icon name="shield" />{{ de.view.autoHide }}</li>
                    </ul>
                </section>
            </div>
        </main>

        <footer class="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Icon name="shield" />{{ de.app.footer }}</footer>
    </div>
</template>
