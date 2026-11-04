<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api, ApiError, errorKey } from '@/api';
import CopyField from '@/components/CopyField.vue';
import PasswordField from '@/components/PasswordField.vue';
import SegmentControl from '@/components/SegmentControl.vue';
import ServerView from '@/components/ServerView.vue';
import Stepper from '@/components/Stepper.vue';
import { useCountdown } from '@/composables/useCountdown';
import {
    createSecret, CryptoError, isAcceptablePassword, isCryptoAvailable, MAX_COUNT, MAX_PLAINTEXT_BYTES, TTL_SECONDS,
    type CreatedSecret,
} from '@/crypto';
import { de } from '@/lang/de';

interface Result {
    id: string;
    link: string;
    password: string;
    manageToken: string;
    expiresAt: Date;
    ttl: number;
    views: number;
    attempts: number;
}

const secret = ref('');
const password = ref('');
const source = ref<'typed' | 'words' | 'chars'>('typed');
const ttl = ref<number>(86400);
const views = ref(1);
const attempts = ref(3);
const serverViewOpen = ref(false);
const prepared = ref<CreatedSecret | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);
const result = ref<Result | null>(null);
const destroyAsk = ref(false);
const destroyed = ref(false);

const secure = isCryptoAvailable();
const bytes = computed(() => new TextEncoder().encode(secret.value).length);
const tooLarge = computed(() => bytes.value > MAX_PLAINTEXT_BYTES);
const passwordOk = computed(() => isAcceptablePassword(password.value));
const canSubmit = computed(() => secure && !busy.value && secret.value.length > 0 && !tooLarge.value && passwordOk.value);
const expiryOptions = TTL_SECONDS.map((value) => ({ value: value as number, label: de.expiry[value] ?? String(value) }));
const expiresAt = computed(() => result.value?.expiresAt ?? null);
const remaining = useCountdown(expiresAt);

// Eine vorbereitete Verschlüsselung gilt nur für genau diese Eingaben.
watch([secret, password, ttl, views, attempts], () => (prepared.value = null));

const buttonLabel = computed(() => (busy.value ? de.create.submitting : prepared.value && serverViewOpen.value ? de.create.sendExact : de.create.submit));

function message(e: unknown): string {
    if (e instanceof CryptoError) {
        const map: Record<string, string> = {
            InsecureContext: de.errors.insecure.body,
            InvalidPassword: de.errors.passwordTooShort,
            EmptySecret: de.errors.secretEmpty,
            SecretTooLarge: de.errors.secretTooLarge,
        };
        return map[e.code] ?? de.errors.server;
    }
    if (e instanceof ApiError) {
        const key = errorKey(e);
        const map: Record<string, string> = {
            network: de.errors.network, throttled: de.errors.throttled, conflict: de.errors.conflict, invalidInput: de.errors.invalidInput,
        };
        return map[key] ?? de.errors.server;
    }
    return de.errors.server;
}

async function send(p: CreatedSecret): Promise<void> {
    const res = await api.create(p.body);
    result.value = {
        id: p.body.id,
        link: `${location.origin}/s/${p.body.id}#${p.linkKey}`,
        password: password.value,
        manageToken: p.manageToken,
        expiresAt: new Date(res.expires_at),
        ttl: ttl.value,
        views: views.value,
        attempts: attempts.value,
    };
    // Klartext und Eingabe-Passwort verlassen den Zustand; Link und Passwort bleiben nur in `result`.
    secret.value = '';
    password.value = '';
    prepared.value = null;
    window.addEventListener('beforeunload', warn);
}

async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    error.value = null;
    busy.value = true;
    try {
        if (!prepared.value) {
            prepared.value = await createSecret({ secret: secret.value, password: password.value, settings: { ttl: ttl.value, maxViews: views.value, maxAttempts: attempts.value } });
            if (serverViewOpen.value) return; // erst zeigen, dann auf den zweiten Klick warten
        }
        await send(prepared.value);
    } catch (e) {
        error.value = message(e);
    } finally {
        busy.value = false;
    }
}

async function destroy(): Promise<void> {
    if (!result.value) return;
    try {
        await api.destroy(result.value.id, result.value.manageToken);
        destroyed.value = true;
        destroyAsk.value = false;
    } catch (e) {
        error.value = message(e);
    }
}

function warn(event: BeforeUnloadEvent): void {
    event.preventDefault();
}
function reset(): void {
    window.removeEventListener('beforeunload', warn);
    result.value = null;
    destroyed.value = false;
    destroyAsk.value = false;
    error.value = null;
    source.value = 'typed';
}
onBeforeUnmount(() => window.removeEventListener('beforeunload', warn));
</script>

<template>
    <div class="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header class="flex flex-col items-center gap-1 text-center">
            <h1 class="text-2xl font-bold tracking-tight">{{ de.app.name }}</h1>
            <p class="text-sm text-muted-foreground">{{ de.app.tagline }}</p>
        </header>

        <main class="rounded-2xl border border-border-strong bg-card p-4 shadow-(--elevation-raised) sm:p-6">
            <div v-if="!secure" role="alert" class="rounded-xl border-2 border-destructive p-4" data-testid="insecure">
                <h2 class="font-semibold">⚠ {{ de.errors.insecure.title }}</h2>
                <p class="text-sm">{{ de.errors.insecure.body }}</p>
            </div>

            <!-- Ergebnis -->
            <section v-else-if="result" class="mx-auto flex max-w-2xl flex-col gap-4" data-testid="result">
                <h2 class="text-center text-xl font-semibold">{{ de.result.title }}</h2>
                <ul class="flex flex-wrap justify-center gap-2 text-xs font-medium">
                    <li class="rounded-full border border-caption px-3 py-1">{{ de.result.chipExpiry(de.expiry[result.ttl] ?? '') }}</li>
                    <li class="rounded-full border border-caption px-3 py-1">{{ de.result.chipViews(result.views) }}</li>
                    <li class="rounded-full border border-caption px-3 py-1">{{ de.result.chipAttempts(result.attempts) }}</li>
                    <li class="rounded-full border border-caption px-3 py-1" data-testid="countdown">{{ remaining ? `${de.result.expiresIn} ${remaining}` : de.result.expired }}</li>
                </ul>
                <template v-if="!destroyed">
                    <CopyField :label="de.result.link" :value="result.link" :hint="de.result.linkHint" testid="result-link" />
                    <CopyField :label="de.result.password" :value="result.password" :hint="de.result.passwordHint" testid="result-password" />
                    <p class="text-center text-xs text-muted-foreground">{{ de.result.leaveNotice }}</p>
                </template>
                <p v-else role="status" class="rounded-xl border border-caption p-4 text-center font-medium" data-testid="destroyed">{{ de.result.destroyed }}</p>

                <p v-if="error" role="alert" class="rounded-lg border-l-4 border-destructive bg-surface-sunken p-3 text-sm">⚠ {{ error }}</p>

                <div class="flex flex-wrap items-center justify-center gap-3">
                    <template v-if="!destroyed">
                        <button v-if="!destroyAsk" type="button" class="min-h-11 rounded-lg border-2 border-destructive px-4 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-testid="destroy" @click="destroyAsk = true">{{ de.result.destroy }}</button>
                        <div v-else role="alertdialog" aria-labelledby="destroy-text" class="flex flex-col items-center gap-2 rounded-xl border-2 border-destructive p-3">
                            <p id="destroy-text" class="text-sm">{{ de.result.destroyConfirm }}</p>
                            <div class="flex gap-2">
                                <button type="button" class="min-h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-testid="destroy-confirm" @click="destroy">{{ de.result.destroyYes }}</button>
                                <button type="button" class="min-h-10 rounded-lg border border-caption px-4 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" @click="destroyAsk = false">{{ de.result.destroyNo }}</button>
                            </div>
                        </div>
                    </template>
                    <button type="button" class="min-h-11 rounded-lg border border-caption px-4 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-testid="new-secret" @click="reset">{{ de.result.newSecret }}</button>
                </div>
            </section>

            <!-- Formular -->
            <form v-else class="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" novalidate @submit.prevent="submit">
                <section class="order-2 flex flex-col gap-5 md:order-1" :aria-label="de.create.settings">
                    <SegmentControl id="ttl" v-model="ttl" :label="de.create.expiry" :options="expiryOptions" />
                    <Stepper id="views" v-model="views" :label="de.create.views" :min="1" :max="MAX_COUNT" />
                    <Stepper id="attempts" v-model="attempts" :label="de.create.attempts" :min="1" :max="MAX_COUNT" :hint="de.create.attemptsHint" />
                    <PasswordField id="password" v-model="password" v-model:source="source" :label="de.create.password" :hint="de.create.passwordHint" generator autocomplete="new-password" />
                </section>

                <section class="order-1 flex flex-col gap-2 md:order-2">
                    <label for="secret" class="text-sm font-medium">{{ de.create.secretLabel }}</label>
                    <textarea
                        id="secret"
                        v-model="secret"
                        rows="12"
                        spellcheck="false"
                        autocomplete="off"
                        :placeholder="de.create.secretPlaceholder"
                        :aria-invalid="tooLarge || undefined"
                        aria-describedby="secret-hint secret-count"
                        class="min-h-60 w-full resize-y rounded-xl border border-caption bg-input p-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                    <div class="flex items-center justify-between gap-2 text-xs">
                        <span id="secret-hint" class="text-muted-foreground">🔒 {{ de.create.secretHint }}</span>
                        <span id="secret-count" class="tabular-nums" :class="tooLarge ? 'font-semibold' : 'text-muted-foreground'">{{ tooLarge ? '⚠ ' : '' }}{{ de.create.counter(bytes, MAX_PLAINTEXT_BYTES) }}</span>
                    </div>
                </section>

                <div class="order-3 flex flex-col gap-3 md:col-span-2">
                    <ServerView v-model:open="serverViewOpen" :body="prepared?.body ?? null" />
                    <p v-if="password.length > 0 && !passwordOk" class="text-sm" role="status">⚠ {{ de.errors.passwordTooShort }}</p>
                    <p v-if="error" role="alert" class="rounded-lg border-l-4 border-destructive bg-surface-sunken p-3 text-sm" data-testid="error">⚠ {{ error }}</p>
                    <button type="submit" :disabled="!canSubmit" data-testid="submit" class="min-h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-(--primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60">
                        {{ buttonLabel }}
                    </button>
                </div>
            </form>
        </main>
    </div>
</template>
