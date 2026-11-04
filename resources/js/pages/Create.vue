<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHistory } from '@/history';
import { toast } from '@/toast';
import { api, ApiError, errorKey } from '@/api';
import AppShell from '@/components/AppShell.vue';
import CopyField from '@/components/CopyField.vue';
import Icon from '@/components/Icon.vue';
import PasswordField from '@/components/PasswordField.vue';
import DockStepper from '@/components/ui/DockStepper.vue';
import Modal from '@/components/ui/Modal.vue';
import SelectMenu from '@/components/ui/SelectMenu.vue';
import ToggleButton from '@/components/ui/ToggleButton.vue';
import { useCountdown } from '@/composables/useCountdown';
import {
    createSecret, CryptoError, EFF_LARGE_WORDLIST, isAcceptablePassword, isCryptoAvailable, MAX_COUNT, MAX_PLAINTEXT_BYTES, randomPassphrase,
    TTL_SECONDS, type CreatedSecret,
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

const secure = isCryptoAvailable();
const history = useHistory();
const secret = ref('');
// Das Passwort wird schon beim Laden erzeugt (bei jedem Neuladen ein neues) und ist sofort sichtbar.
const password = ref(secure ? randomPassphrase(EFF_LARGE_WORDLIST) : '');
const source = ref<'typed' | 'words' | 'chars'>('words');
const ttl = ref<number>(86400);
const views = ref(1);
const attempts = ref(3);
const reviewFirst = ref(false);
const reviewOpen = ref(false);
const submitButton = ref<HTMLButtonElement | null>(null);
const prepared = ref<CreatedSecret | null>(null);
const busy = ref(false);
const result = ref<Result | null>(null);
const destroyOpen = ref(false);
const destroyed = ref(false);

const bytes = computed(() => new TextEncoder().encode(secret.value).length);
const tooLarge = computed(() => bytes.value > MAX_PLAINTEXT_BYTES);
// Das Limit (65.532 Byte) sagt einem Menschen nichts. Gezeigt wird nur, wenn es eng wird, und in Zeichen, ungefähr (Umlaute und Emoji brauchen mehr Byte).
const limitLeft = computed(() => MAX_PLAINTEXT_BYTES - bytes.value);
const limitHint = computed(() => {
    if (bytes.value > MAX_PLAINTEXT_BYTES) return { over: true, text: t('create.secret.overLimit', { n: number.format(Math.round(-limitLeft.value / 10) * 10 || 10) }) };
    if (bytes.value >= MAX_PLAINTEXT_BYTES * 0.85) return { over: false, text: t('create.secret.nearLimit', { n: number.format(Math.floor(limitLeft.value / 100) * 100) }) };
    return null;
});
const passwordOk = computed(() => isAcceptablePassword(password.value));
const canSubmit = computed(() => secure && !busy.value && secret.value.length > 0 && !tooLarge.value && passwordOk.value);
const expiryOptions = TTL_SECONDS.map((value) => ({ value: value as number, label: t(`expiryShort.${value}`), title: t(`expiry.${value}`) }));
const linkCopied = computed(() => t('toast.linkCopied'));
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
            KdfFailed: t('errors.kdfFailed'),
        };
        return map[e.code] ?? t('errors.unknown');
    }
    if (e instanceof ApiError) {
        const map: Record<string, string> = {
            network: t('errors.network'), throttled: t('errors.throttled'), conflict: t('errors.conflict'), invalidInput: t('errors.invalidInput'),
        };
        return map[errorKey(e)] ?? t('errors.server');
    }
    return t('errors.unknown');
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
        history.add({ id: p.body.id, link: result.value.link, manageToken: p.manageToken, createdAt: Date.now(), expiresAt: result.value.expiresAt.getTime(), ttl: ttl.value, maxViews: views.value });
        window.addEventListener('beforeunload', warn);
    } catch (e) {
        reviewOpen.value = false;
        toast.error(message(e));
    } finally {
        busy.value = false;
    }
}

async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    busy.value = true;
    try {
        prepared.value = await createSecret({ secret: secret.value, password: password.value, settings: { ttl: ttl.value, maxViews: views.value, maxAttempts: attempts.value } });
    } catch (e) {
        toast.error(message(e));
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
        toast.success(t('toast.destroyed'));
    } catch (e) {
        toast.error(message(e));
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
    password.value = randomPassphrase(EFF_LARGE_WORDLIST);
    source.value = 'words';
}
onBeforeUnmount(() => window.removeEventListener('beforeunload', warn));
</script>

<template>
    <AppShell variant="create" :dock="secure && !result" center>
        <template #header>
            <template v-if="result">
                <h1 class="text-xl font-bold tracking-tight sm:text-2xl">{{ t('result.title') }}</h1>
                <p class="text-sm text-muted-foreground">{{ t('result.lead') }}</p>
            </template>
            <template v-else>
                <h1 class="text-xl font-bold tracking-tight sm:text-2xl">{{ t('create.title') }}</h1>
                <p class="text-sm text-muted-foreground">{{ t('create.lead') }}</p>
            </template>
        </template>

        <div v-if="!secure" role="alert" class="notice card-flat max-w-2xl" data-testid="insecure">
            <Icon name="alert" class="mt-0.5" />
            <div>
                <h2 class="font-semibold">{{ t('errors.insecure.title') }}</h2>
                <p>{{ t('errors.insecure.body') }}</p>
            </div>
        </div>

        <!-- Ergebnis: die Box passt sich dem Inhalt an -->
        <section v-else-if="result" class="card-outer max-w-xl" data-testid="result">
            <div class="card-head">
                <ul class="flex flex-wrap gap-1.5">
                    <li class="chip"><Icon name="clock" />{{ t('result.chips.expiry', { label: t(`expiry.${result.ttl}`) }) }}</li>
                    <li class="chip"><Icon name="eye" />{{ t('result.chips.views', result.views) }}</li>
                    <li class="chip"><Icon name="shield" />{{ t('result.chips.attempts', result.attempts) }}</li>
                    <li class="chip" data-testid="countdown"><Icon name="clock" />{{ remaining ? t('result.chips.remaining', { time: remaining }) : t('result.chips.expired') }}</li>
                </ul>
            </div>

            <div class="card-inner flex flex-col gap-4">
                <template v-if="!destroyed">
                    <CopyField :step="1" icon="link" break-anywhere :label="t('result.link.title')" :value="result.link" :hint="t('result.link.hint')" :copied-message="t('toast.linkCopied')" testid="result-link" />
                    <CopyField :step="2" icon="key" :label="t('result.password.title')" :value="result.password" :hint="t('result.password.hint')" :copied-message="t('toast.passwordCopied')" testid="result-password" />
                    <p class="hint flex items-center gap-2"><Icon name="lock" />{{ t('result.leaveNotice') }}</p>
                </template>
                <p v-else role="status" class="notice" data-testid="destroyed"><Icon name="check-circle" class="mt-0.5" />{{ t('result.destroy.done') }}</p>
            </div>

            <footer class="card-foot">
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

        <!-- Formular: Inhalt links, Passwort als eigene Karte daneben, die Regeln und die Aktion schweben unten -->
        <form v-else class="w-full max-w-5xl" novalidate @submit.prevent="submit">
            <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <section class="card-outer flex flex-col" aria-labelledby="secret-title">
                    <div class="card-head">
                        <h2 id="secret-title" class="text-sm font-semibold">{{ t('create.secret.title') }}</h2>
                        <span class="hint hidden items-center gap-1.5 sm:inline-flex"><Icon name="shield" />{{ t('create.secret.badge') }}</span>
                    </div>
                    <label for="secret" class="sr-only">{{ t('create.secret.title') }}</label>
                    <textarea
                        id="secret"
                        data-card-field
                        v-model="secret"
                        spellcheck="false"
                        autocomplete="off"
                        :placeholder="t('create.secret.placeholder')"
                        :aria-invalid="tooLarge || undefined"
                        aria-describedby="secret-limit"
                        class="card-inner no-ring block min-h-52 w-full resize-y p-3.5 font-mono text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground sm:text-sm lg:min-h-72"
                    />
                    <p id="secret-limit" class="flex min-h-4 items-center justify-end gap-1.5 px-2.5 pt-2 pb-1 text-xs" :class="limitHint?.over ? 'font-semibold text-foreground' : 'text-muted-foreground'" data-testid="secret-limit">
                        <template v-if="limitHint"><Icon v-if="limitHint.over" name="alert" />{{ limitHint.text }}</template>
                    </p>
                </section>

                <section class="card-outer flex flex-col" aria-labelledby="password-title">
                    <div class="card-head"><h2 id="password-title" class="text-sm font-semibold">{{ t('create.password.title') }}</h2></div>
                    <div class="card-inner flex flex-col gap-4">
                    <PasswordField id="password" v-model="password" v-model:source="source" :label="t('create.password.label')" :hint="t('create.password.hint')" generator autocomplete="new-password" />
                    <p v-if="password.length > 0 && !passwordOk" class="notice" role="status"><Icon name="alert" class="mt-0.5" />{{ t('errors.passwordTooShort') }}</p>
                    </div>
                </section>
            </div>

            <!-- Schwebende Leiste: Ablauf, Abrufe und Fehlversuche sind hier direkt die Auswahl -->
            <div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4 lg:left-[17rem] lg:px-8 xl:left-[19rem]" data-testid="dock">
                <div class="pointer-events-auto mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-xl border border-border bg-card/95 p-1.5 shadow-[0_12px_36px_-12px_rgb(0_0_0/0.5)] backdrop-blur sm:flex-row sm:items-center sm:gap-2 sm:p-2.5" role="group" :aria-label="t('create.dock.label')">
                    <div class="grid grid-cols-3 gap-1.5 sm:mr-auto sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                        <SelectMenu id="ttl" v-model="ttl" :label="t('create.dock.expiry')" icon="clock" :options="expiryOptions" />
                        <DockStepper id="views" v-model="views" :label="t('create.dock.views')" icon="eye" :min="1" :max="MAX_COUNT" />
                        <DockStepper id="attempts" v-model="attempts" :label="t('create.dock.attempts')" icon="shield" :min="1" :max="MAX_COUNT" />
                    </div>
                    <div class="flex items-center gap-2">
                        <ToggleButton v-model="reviewFirst" icon="file-search" :label="t('create.dock.review')" testid="review-toggle" />
                        <button ref="submitButton" type="submit" :disabled="!canSubmit" data-testid="submit" class="btn btn-primary btn-lg flex-1 sm:min-w-60 sm:flex-none">
                            {{ busy ? t('create.dock.submitting') : t('create.dock.submit') }}<Icon v-if="!busy" name="arrow-right" />
                        </button>
                    </div>
                </div>
            </div>
        </form>

        <Modal v-model:open="reviewOpen" wide :title="t('create.review.title')" :description="t('create.review.lead')" testid="review-dialog">
            <pre class="max-h-80 overflow-auto rounded-md border border-border-strong bg-inset p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap" data-testid="server-body">{{ reviewBody }}</pre>
            <template #footer>
                <button type="button" class="btn btn-secondary" @click="reviewOpen = false">{{ t('create.review.back') }}</button>
                <button type="button" class="btn btn-primary" :disabled="busy" data-testid="review-send" @click="prepared && send(prepared)">{{ busy ? t('create.review.sending') : t('create.review.send') }}<Icon v-if="!busy" name="arrow-right" /></button>
            </template>
        </Modal>
    </AppShell>
</template>
