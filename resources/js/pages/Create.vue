<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { api, ApiError, errorKey } from '@/api';
import AppShell from '@/components/AppShell.vue';
import CopyField from '@/components/CopyField.vue';
import Icon from '@/components/Icon.vue';
import PasswordField from '@/components/PasswordField.vue';
import Modal from '@/components/ui/Modal.vue';
import NumberStepper from '@/components/ui/NumberStepper.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Switch from '@/components/ui/Switch.vue';
import { useCountdown } from '@/composables/useCountdown';
import {
    createSecret, CryptoError, isAcceptablePassword, isCryptoAvailable, MAX_COUNT, MAX_PLAINTEXT_BYTES, TTL_SECONDS,
    type CreatedSecret,
} from '@/crypto';

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

const { t } = useI18n();
const number = new Intl.NumberFormat('de-DE');

const secret = ref('');
const password = ref('');
const source = ref<'typed' | 'words' | 'chars'>('typed');
const ttl = ref<number>(86400);
const views = ref(1);
const attempts = ref(3);
const reviewFirst = ref(false);
const reviewOpen = ref(false);
const submitButton = ref<HTMLButtonElement | null>(null);
const prepared = ref<CreatedSecret | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);
const result = ref<Result | null>(null);
const destroyOpen = ref(false);
const destroyed = ref(false);

const secure = isCryptoAvailable();
const bytes = computed(() => new TextEncoder().encode(secret.value).length);
const tooLarge = computed(() => bytes.value > MAX_PLAINTEXT_BYTES);
const passwordOk = computed(() => isAcceptablePassword(password.value));
const canSubmit = computed(() => secure && !busy.value && secret.value.length > 0 && !tooLarge.value && passwordOk.value);
const expiryOptions = TTL_SECONDS.map((value) => ({ value: value as number, label: t(`expiryShort.${value}`), title: t(`expiry.${value}`) }));
const expiresAt = computed(() => result.value?.expiresAt ?? null);
const remaining = useCountdown(expiresAt);

// Schließt der Prüfen-Dialog ohne Senden, kehrt der Fokus zur Aktion zurück (der Button war während des Verschlüsselns deaktiviert).
watch(reviewOpen, async (open) => {
    if (!open && !result.value) {
        await nextTick();
        submitButton.value?.focus();
    }
});

// Eine vorbereitete Verschlüsselung gilt nur für genau diese Eingaben.
watch([secret, password, ttl, views, attempts], () => (prepared.value = null));

const reviewBody = computed(() => {
    const body = prepared.value?.body;
    if (!body) return '';
    const c = body.ciphertext;
    return JSON.stringify({ ...body, ciphertext: `${c.slice(0, 48)}${t('create.review.truncated', { length: c.length })}` }, null, 2);
});

function message(e: unknown): string {
    if (e instanceof CryptoError) {
        const map: Record<string, string> = {
            InsecureContext: t('errors.insecure.body'),
            InvalidPassword: t('errors.passwordTooShort'),
            EmptySecret: t('errors.secretEmpty'),
            SecretTooLarge: t('errors.secretTooLarge', { max: number.format(MAX_PLAINTEXT_BYTES) }),
        };
        return map[e.code] ?? t('errors.server');
    }
    if (e instanceof ApiError) {
        const map: Record<string, string> = {
            network: t('errors.network'), throttled: t('errors.throttled'), conflict: t('errors.conflict'), invalidInput: t('errors.invalidInput'),
        };
        return map[errorKey(e)] ?? t('errors.server');
    }
    return t('errors.server');
}

async function send(p: CreatedSecret): Promise<void> {
    busy.value = true;
    try {
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
        reviewOpen.value = false;
        window.addEventListener('beforeunload', warn);
    } catch (e) {
        reviewOpen.value = false;
        error.value = message(e);
    } finally {
        busy.value = false;
    }
}

async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    error.value = null;
    busy.value = true;
    try {
        prepared.value = await createSecret({ secret: secret.value, password: password.value, settings: { ttl: ttl.value, maxViews: views.value, maxAttempts: attempts.value } });
    } catch (e) {
        error.value = message(e);
        busy.value = false;
        return;
    }
    busy.value = false;
    if (reviewFirst.value) {
        reviewOpen.value = true; // erst zeigen, dann auf die Bestätigung warten
        return;
    }
    await send(prepared.value);
}

async function destroy(): Promise<void> {
    if (!result.value) return;
    try {
        await api.destroy(result.value.id, result.value.manageToken);
        destroyed.value = true;
    } catch (e) {
        error.value = message(e);
    } finally {
        destroyOpen.value = false;
    }
}

function warn(event: BeforeUnloadEvent): void {
    event.preventDefault();
}
function reset(): void {
    window.removeEventListener('beforeunload', warn);
    result.value = null;
    destroyed.value = false;
    error.value = null;
    source.value = 'typed';
}
onBeforeUnmount(() => window.removeEventListener('beforeunload', warn));
</script>

<template>
    <AppShell variant="create">
        <template #header>
            <template v-if="result">
                <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('result.title') }}</h1>
                <p class="max-w-xl text-base text-muted-foreground">{{ t('result.lead') }}</p>
            </template>
            <template v-else>
                <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('create.title') }}</h1>
                <p class="max-w-xl text-base text-muted-foreground">{{ t('create.lead') }}</p>
            </template>
        </template>

        <div v-if="!secure" role="alert" class="notice card-outer max-w-2xl" data-testid="insecure">
            <Icon name="alert" class="mt-0.5" />
            <div>
                <h2 class="font-semibold">{{ t('errors.insecure.title') }}</h2>
                <p>{{ t('errors.insecure.body') }}</p>
            </div>
        </div>

        <!-- Ergebnis: die Box passt sich dem Inhalt an -->
        <section v-else-if="result" class="card-outer max-w-2xl" data-testid="result">
            <div class="flex flex-col gap-5 p-5 sm:p-7">
                <ul class="flex flex-wrap gap-2">
                    <li class="chip"><Icon name="clock" />{{ t('result.chips.expiry', { label: t(`expiry.${result.ttl}`) }) }}</li>
                    <li class="chip"><Icon name="eye" />{{ t('result.chips.views', result.views) }}</li>
                    <li class="chip"><Icon name="shield" />{{ t('result.chips.attempts', result.attempts) }}</li>
                    <li class="chip" data-testid="countdown"><Icon name="clock" />{{ remaining ? t('result.chips.remaining', { time: remaining }) : t('result.chips.expired') }}</li>
                </ul>

                <template v-if="!destroyed">
                    <CopyField :step="1" icon="link" break-anywhere :label="t('result.link.title')" :value="result.link" :hint="t('result.link.hint')" testid="result-link" />
                    <CopyField :step="2" icon="key" :label="t('result.password.title')" :value="result.password" :hint="t('result.password.hint')" testid="result-password" />
                    <p class="hint flex items-center gap-2"><Icon name="lock" />{{ t('result.leaveNotice') }}</p>
                </template>
                <p v-else role="status" class="notice" data-testid="destroyed"><Icon name="check-circle" class="mt-0.5" />{{ t('result.destroy.done') }}</p>
                <p v-if="error" role="alert" class="notice"><Icon name="alert" class="mt-0.5" />{{ error }}</p>
            </div>

            <footer class="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-border bg-inset px-5 py-4 sm:px-7">
                <button v-if="!destroyed" type="button" class="btn btn-quiet" data-testid="destroy" @click="destroyOpen = true"><Icon name="trash" />{{ t('result.destroy.button') }}</button>
                <span v-else />
                <button type="button" class="btn btn-secondary" data-testid="new-secret" @click="reset"><Icon name="plus" />{{ t('result.newSecret') }}</button>
            </footer>

            <Modal v-model:open="destroyOpen" :title="t('result.destroy.title')" :description="t('result.destroy.body')" testid="destroy-dialog">
                <template #footer>
                    <button type="button" class="btn btn-secondary" @click="destroyOpen = false">{{ t('result.destroy.cancel') }}</button>
                    <button type="button" class="btn bg-foreground text-background hover:opacity-90" data-testid="destroy-confirm" @click="destroy"><Icon name="trash" />{{ t('result.destroy.confirm') }}</button>
                </template>
            </Modal>
        </section>

        <!-- Formular: Inhalt links, Einstellungen als eigene Karte daneben, die Aktion schwebt unten -->
        <form v-else class="w-full max-w-6xl pb-28" novalidate @submit.prevent="submit">
            <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
                <section class="card-outer flex flex-col gap-4 p-5 sm:p-7" aria-labelledby="secret-title">
                    <div class="flex items-start gap-4">
                        <span class="icon-tile"><Icon name="lock" /></span>
                        <div>
                            <h2 id="secret-title" class="text-lg font-semibold">{{ t('create.secret.title') }}</h2>
                            <p class="hint mt-0.5">{{ t('create.secret.lead') }}</p>
                        </div>
                    </div>
                    <label for="secret" class="sr-only">{{ t('create.secret.title') }}</label>
                    <textarea
                        id="secret"
                        v-model="secret"
                        spellcheck="false"
                        autocomplete="off"
                        :placeholder="t('create.secret.placeholder')"
                        :aria-invalid="tooLarge || undefined"
                        aria-describedby="secret-count"
                        class="field min-h-72 resize-y p-4 font-mono text-[0.9375rem] leading-relaxed lg:min-h-[24rem]"
                    />
                    <p id="secret-count" class="flex items-center justify-end gap-2 text-sm tabular-nums" :class="tooLarge ? 'font-semibold text-foreground' : 'text-muted-foreground'">
                        <Icon v-if="tooLarge" name="alert" />{{ t('create.secret.counter', { used: number.format(bytes), max: number.format(MAX_PLAINTEXT_BYTES) }) }}
                    </p>
                    <p v-if="error" role="alert" class="notice" data-testid="error"><Icon name="alert" class="mt-0.5" />{{ error }}</p>
                </section>

                <section class="card-outer flex flex-col gap-6 p-5 sm:p-7" aria-labelledby="settings-title">
                    <div>
                        <h2 id="settings-title" class="text-lg font-semibold">{{ t('create.settings.title') }}</h2>
                        <p class="hint mt-0.5">{{ t('create.settings.lead') }}</p>
                    </div>
                    <SegmentedControl id="ttl" v-model="ttl" :label="t('create.settings.expiry')" :options="expiryOptions" />
                    <div class="grid grid-cols-2 gap-4">
                        <NumberStepper id="views" v-model="views" :label="t('create.settings.views')" :min="1" :max="MAX_COUNT" />
                        <NumberStepper id="attempts" v-model="attempts" :label="t('create.settings.attempts')" :min="1" :max="MAX_COUNT" />
                    </div>
                    <p class="hint -mt-3">{{ t('create.settings.viewsHint') }} {{ t('create.settings.attemptsHint') }}</p>
                    <hr class="border-border" />
                    <PasswordField id="password" v-model="password" v-model:source="source" :label="t('create.password.label')" :hint="t('create.password.hint')" generator autocomplete="new-password" />
                    <p v-if="password.length > 0 && !passwordOk" class="notice" role="status"><Icon name="alert" class="mt-0.5" />{{ t('errors.passwordTooShort') }}</p>
                    <hr class="border-border" />
                    <Switch id="review" v-model="reviewFirst" :label="t('create.settings.review')" :hint="t('create.settings.reviewHint')" />
                </section>
            </div>

            <!-- Schwebende Aktionsleiste -->
            <div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6 sm:pb-5 lg:left-[24rem] lg:px-10 xl:left-[28rem]" data-testid="dock">
                <div class="pointer-events-auto mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-border-strong bg-card/90 p-3 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <ul class="hidden flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground sm:flex" :aria-label="t('create.settings.title')">
                        <li class="flex items-center gap-2"><Icon name="clock" />{{ t('create.dock.expiresAfter', { time: t(`expiryShort.${ttl}`) }) }}</li>
                        <li class="flex items-center gap-2"><Icon name="eye" />{{ t('create.dock.views', views) }}</li>
                        <li class="flex items-center gap-2"><Icon name="shield" />{{ t('create.dock.attempts', attempts) }}</li>
                    </ul>
                    <button ref="submitButton" type="submit" :disabled="!canSubmit" data-testid="submit" class="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-80">
                        {{ busy ? t('create.dock.submitting') : t('create.dock.submit') }}<Icon v-if="!busy" name="arrow-right" />
                    </button>
                </div>
            </div>
        </form>

        <Modal v-model:open="reviewOpen" wide :title="t('create.review.title')" :description="t('create.review.lead')" testid="review-dialog">
            <pre class="max-h-80 overflow-auto rounded-lg border border-border-strong bg-inset p-4 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap" data-testid="server-body">{{ reviewBody }}</pre>
            <template #footer>
                <button type="button" class="btn btn-secondary" @click="reviewOpen = false">{{ t('create.review.back') }}</button>
                <button type="button" class="btn btn-primary" :disabled="busy" data-testid="review-send" @click="prepared && send(prepared)">{{ busy ? t('create.review.sending') : t('create.review.send') }}<Icon v-if="!busy" name="arrow-right" /></button>
            </template>
        </Modal>
    </AppShell>
</template>
