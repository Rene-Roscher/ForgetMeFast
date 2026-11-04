<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api, ApiError, errorKey } from '@/api';
import AppHeader from '@/components/AppHeader.vue';
import CopyField from '@/components/CopyField.vue';
import Icon from '@/components/Icon.vue';
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
const expiryOptions = TTL_SECONDS.map((value) => ({ value: value as number, label: de.expiryShort[value] ?? String(value), title: de.expiry[value] ?? String(value) }));
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
    <div class="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <AppHeader />

        <main class="flex-1">
            <h1 class="sr-only">{{ de.create.title }}</h1>
            <div v-if="!secure" role="alert" class="notice" data-testid="insecure">
                <Icon name="alert" class="mt-0.5" />
                <div>
                    <h2 class="font-semibold">{{ de.errors.insecure.title }}</h2>
                    <p>{{ de.errors.insecure.body }}</p>
                </div>
            </div>

            <!-- Ergebnis -->
            <section v-else-if="result" class="mx-auto flex max-w-3xl flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-(--elevation-raised) sm:p-8" data-testid="result">
                <div class="flex flex-col items-center gap-3 text-center">
                    <span class="flex size-12 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground"><Icon name="check" /></span>
                    <h2 class="text-2xl font-bold tracking-tight">{{ de.result.title }}</h2>
                    <p class="max-w-md text-sm text-muted-foreground">{{ de.result.lead }}</p>
                </div>

                <ul class="flex flex-wrap justify-center gap-2">
                    <li class="chip"><Icon name="clock" />{{ de.result.chipExpiry(de.expiry[result.ttl] ?? '') }}</li>
                    <li class="chip"><Icon name="eye" />{{ de.result.chipViews(result.views) }}</li>
                    <li class="chip"><Icon name="shield" />{{ de.result.chipAttempts(result.attempts) }}</li>
                    <li class="chip" data-testid="countdown"><Icon name="clock" />{{ remaining ? `${de.result.expiresIn} ${remaining}` : de.result.expired }}</li>
                </ul>

                <div v-if="!destroyed" class="grid gap-4 md:grid-cols-2">
                    <CopyField :step="1" icon="link" break-anywhere :label="de.result.stepLink" :value="result.link" :hint="de.result.linkHint" testid="result-link" />
                    <CopyField :step="2" icon="key" :label="de.result.stepPassword" :value="result.password" :hint="de.result.passwordHint" testid="result-password" />
                </div>
                <p v-else role="status" class="notice" data-testid="destroyed"><Icon name="check-circle" class="mt-0.5" />{{ de.result.destroyed }}</p>

                <p v-if="!destroyed" class="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><Icon name="lock" />{{ de.result.leaveNotice }}</p>
                <p v-if="error" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ error }}</p>

                <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                    <template v-if="!destroyed">
                        <button v-if="!destroyAsk" type="button" class="btn btn-quiet" data-testid="destroy" @click="destroyAsk = true"><Icon name="trash" />{{ de.result.destroy }}</button>
                        <div v-else role="alertdialog" aria-labelledby="destroy-text" class="flex w-full flex-col gap-3 rounded-xl border-2 border-destructive bg-surface-sunken p-4 sm:w-auto sm:max-w-sm">
                            <p id="destroy-text" class="flex items-start gap-2 text-sm"><Icon name="alert" class="mt-0.5" />{{ de.result.destroyConfirm }}</p>
                            <div class="flex gap-2">
                                <button type="button" class="btn bg-foreground text-background hover:opacity-90" data-testid="destroy-confirm" @click="destroy"><Icon name="trash" />{{ de.result.destroyYes }}</button>
                                <button type="button" class="btn btn-secondary" @click="destroyAsk = false">{{ de.result.destroyNo }}</button>
                            </div>
                        </div>
                    </template>
                    <span v-else />
                    <button type="button" class="btn btn-secondary" data-testid="new-secret" @click="reset"><Icon name="plus" />{{ de.result.newSecret }}</button>
                </div>
            </section>

            <!-- Formular -->
            <form v-else class="overflow-hidden rounded-2xl border border-border bg-card shadow-(--elevation-raised)" novalidate @submit.prevent="submit">
                <div class="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                    <section class="order-2 flex flex-col gap-6 border-t border-border bg-surface-panel p-5 sm:p-6 lg:order-1 lg:border-t-0 lg:border-r" :aria-label="de.create.settings">
                        <div>
                            <h2 class="text-base font-semibold">{{ de.create.settings }}</h2>
                            <p class="hint mt-0.5">{{ de.create.settingsLead }}</p>
                        </div>
                        <SegmentControl id="ttl" v-model="ttl" :label="de.create.expiry" :options="expiryOptions" />
                        <div class="grid grid-cols-2 gap-4">
                            <Stepper id="views" v-model="views" :label="de.create.views" :min="1" :max="MAX_COUNT" />
                            <Stepper id="attempts" v-model="attempts" :label="de.create.attempts" :min="1" :max="MAX_COUNT" />
                        </div>
                        <p class="hint -mt-3">{{ de.create.attemptsHint }}</p>
                        <PasswordField id="password" v-model="password" v-model:source="source" :label="de.create.password" :hint="de.create.passwordHint" generator autocomplete="new-password" />
                    </section>

                    <section class="order-1 flex flex-col gap-3 p-5 sm:p-6 lg:order-2">
                        <div>
                            <label for="secret" class="text-base font-semibold">{{ de.create.secretLabel }}</label>
                            <p class="hint mt-0.5">{{ de.create.secretLead }}</p>
                        </div>
                        <textarea
                            id="secret"
                            v-model="secret"
                            spellcheck="false"
                            autocomplete="off"
                            :placeholder="de.create.secretPlaceholder"
                            :aria-invalid="tooLarge || undefined"
                            aria-describedby="secret-hint secret-count"
                            class="field min-h-56 flex-1 resize-y p-4 font-mono leading-relaxed lg:min-h-[22rem]"
                        />
                        <div class="flex items-center justify-between gap-3 text-xs">
                            <span id="secret-hint" class="flex items-center gap-1.5 text-muted-foreground"><Icon name="lock" />{{ de.create.secretHint }}</span>
                            <span id="secret-count" class="flex items-center gap-1.5 whitespace-nowrap tabular-nums" :class="tooLarge ? 'font-semibold text-foreground' : 'text-muted-foreground'">
                                <Icon v-if="tooLarge" name="alert" />{{ de.create.counter(bytes, MAX_PLAINTEXT_BYTES) }}
                            </span>
                        </div>
                    </section>
                </div>

                <div class="flex flex-col gap-3 border-t border-border p-5 sm:p-6">
                    <ServerView v-model:open="serverViewOpen" :body="prepared?.body ?? null" />
                    <p v-if="password.length > 0 && !passwordOk" class="notice" role="status"><Icon name="alert" class="mt-0.5" />{{ de.errors.passwordTooShort }}</p>
                    <p v-if="error" role="alert" class="notice" data-testid="error"><Icon name="alert" class="mt-0.5" />{{ error }}</p>
                    <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <button type="submit" :disabled="!canSubmit" data-testid="submit" class="btn btn-primary btn-lg sm:min-w-80">
                            {{ buttonLabel }}<Icon v-if="!busy" name="arrow-right" />
                        </button>
                    </div>
                </div>
            </form>
        </main>

        <footer class="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Icon name="shield" />{{ de.app.footer }}</footer>
    </div>
</template>
