<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api, ApiError, errorKey } from '@/api';
import AppShell from '@/components/AppShell.vue';
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
    <AppShell variant="view">
        <section class="card-outer max-w-md" aria-live="polite">
            <div v-if="phase === 'loading'" class="flex items-center gap-3 p-6 text-sm text-muted-foreground" data-testid="loading">
                <span class="icon-tile"><Icon name="lock" /></span>{{ de.view.loading }}
            </div>

            <div v-else-if="phase === 'insecure'" class="flex flex-col gap-4 p-6" data-testid="insecure">
                <span class="icon-tile bg-inset text-foreground"><Icon name="alert" /></span>
                <div>
                    <h1 class="text-xl font-bold tracking-tight">{{ de.errors.insecure.title }}</h1>
                    <p class="mt-1 text-sm text-muted-foreground">{{ de.errors.insecure.body }}</p>
                </div>
            </div>

            <div v-else-if="phase === 'incomplete'" class="flex flex-col gap-4 p-6" data-testid="incomplete">
                <span class="icon-tile bg-inset text-foreground"><Icon name="link" /></span>
                <div>
                    <h1 class="text-xl font-bold tracking-tight">{{ de.errors.incomplete.title }}</h1>
                    <p class="mt-1 text-sm text-muted-foreground">{{ de.errors.incomplete.body }}</p>
                </div>
            </div>

            <div v-else-if="phase === 'unavailable'" class="flex flex-col gap-4 p-6" data-testid="unavailable">
                <span class="icon-tile bg-inset text-foreground"><Icon name="ban" /></span>
                <div>
                    <h1 class="text-xl font-bold tracking-tight">{{ de.errors.unavailable.title }}</h1>
                    <p class="mt-1 text-sm text-muted-foreground">{{ de.errors.unavailable.body }}</p>
                </div>
                <p v-if="message" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                <a href="/" class="btn btn-secondary w-fit"><Icon name="plus" />{{ de.errors.home }}</a>
            </div>

            <form v-else-if="phase === 'ready' || phase === 'working'" novalidate @submit.prevent="submit">
                <header class="flex items-start gap-4 border-b border-border p-5 sm:p-6">
                    <span class="icon-tile"><Icon name="lock" /></span>
                    <div>
                        <h1 class="text-xl font-bold tracking-tight">{{ de.view.title }}</h1>
                        <p class="mt-1 text-sm text-muted-foreground">{{ de.view.lead }}</p>
                    </div>
                </header>
                <div class="flex flex-col gap-4 p-5 sm:p-6">
                    <div class="card-inner">
                        <PasswordField id="view-password" ref="passwordInput" v-model="password" :label="de.view.password" autocomplete="current-password" :invalid="message !== null" describedby="view-status" />
                    </div>
                    <div id="view-status" role="alert" data-testid="status">
                        <p v-if="message" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                    </div>
                </div>
                <footer class="rounded-b-xl border-t border-border bg-inset px-5 py-4 sm:px-6">
                    <button type="submit" :disabled="busy || password.length === 0" data-testid="view-submit" class="btn btn-primary btn-lg w-full">
                        {{ busy ? de.view.working : de.view.submit }}<Icon v-if="!busy" name="arrow-right" />
                    </button>
                </footer>
            </form>

            <section v-else data-testid="revealed">
                <header class="flex items-start gap-4 border-b border-border p-5 sm:p-6">
                    <span class="icon-tile"><Icon name="check" /></span>
                    <h1 class="pt-2 text-xl font-bold tracking-tight">{{ de.view.secretLabel }}</h1>
                </header>
                <div class="flex flex-col gap-4 p-5 sm:p-6">
                    <pre :aria-hidden="!shown" class="card-inner max-h-72 overflow-auto font-mono text-sm leading-relaxed break-words whitespace-pre-wrap transition-[filter] motion-reduce:transition-none" :class="shown ? '' : 'blur-md select-none'" data-testid="secret-text">{{ secret }}</pre>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="btn btn-primary" :aria-pressed="shown" data-testid="reveal" @click="reveal"><Icon :name="shown ? 'eye-off' : 'eye'" />{{ shown ? de.view.hideAgain : de.view.reveal }}</button>
                        <button type="button" class="btn btn-secondary" data-testid="copy" @click="copy"><Icon :name="copied ? 'check' : 'copy'" />{{ copied ? de.result.copied : de.view.copy }}</button>
                    </div>
                    <p v-if="message" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ message }}</p>
                </div>
                <footer class="rounded-b-xl border-t border-border bg-inset px-5 py-4 sm:px-6">
                    <ul class="flex flex-col gap-2 text-sm">
                        <li v-if="viewsLeft !== null" class="flex items-center gap-2" data-testid="views-left"><Icon name="eye" />{{ de.view.viewsLeft(viewsLeft) }}</li>
                        <li v-if="remaining" class="flex items-center gap-2" data-testid="countdown"><Icon name="clock" />{{ de.view.expiresIn }} {{ remaining }}</li>
                        <li class="flex items-center gap-2 text-muted-foreground"><Icon name="shield" />{{ de.view.autoHide }}</li>
                    </ul>
                </footer>
            </section>
        </section>
    </AppShell>
</template>
