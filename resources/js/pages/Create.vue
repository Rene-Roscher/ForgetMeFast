<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHistory } from '@/history';
import { usePrefs } from '@/prefs';
import { toast } from '@/toast';
import { api, ApiError, errorKey } from '@/api';
import AppShell from '@/components/AppShell.vue';
import CopyField from '@/components/CopyField.vue';
import Icon from '@/components/Icon.vue';
import PasswordField from '@/components/PasswordField.vue';
import DockStepper from '@/components/ui/DockStepper.vue';
import Modal from '@/components/ui/Modal.vue';
import Tip from '@/components/ui/Tip.vue';
import SelectMenu from '@/components/ui/SelectMenu.vue';
import ToggleButton from '@/components/ui/ToggleButton.vue';
import { useCountdown } from '@/composables/useCountdown';
import { useRotatingPlaceholder } from '@/composables/useRotatingPlaceholder';
import {
    createSecret, CryptoError, EFF_LARGE_WORDLIST, isAcceptablePassword, isCryptoAvailable, MAX_COUNT, MAX_PLAINTEXT_BYTES, randomChars, randomPassphrase,
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
const prefs = usePrefs();
const secret = ref('');
// Das Passwort wird schon beim Laden erzeugt (bei jedem Neuladen ein neues, in der zuletzt gewählten Art) und ist sofort sichtbar.
const fresh = () => (prefs.value.mode === 'chars' ? randomChars() : randomPassphrase(EFF_LARGE_WORDLIST));
const password = ref(secure ? fresh() : '');
const source = ref<'typed' | 'words' | 'chars'>(prefs.value.mode);
watch(source, (value) => {
    if (value === 'words' || value === 'chars') prefs.value.mode = value;
});
// Die Regeln leben in prefs (und damit im Browser-Speicher); diese Ansichten halten das Formular einfach.
const ttl = computed({ get: () => prefs.value.ttl, set: (v: number) => (prefs.value.ttl = v) });
const views = computed({ get: () => prefs.value.views, set: (v: number) => (prefs.value.views = v) });
const attempts = computed({ get: () => prefs.value.attempts, set: (v: number) => (prefs.value.attempts = v) });
const oneTime = computed({ get: () => prefs.value.oneTime, set: (v: boolean) => (prefs.value.oneTime = v) });
// "Einmalig" heißt genau ein Abruf; dann entfällt die Auswahl.
const maxViews = computed(() => (oneTime.value ? 1 : views.value));
const busy = ref(false);
const result = ref<Result | null>(null);
const destroyOpen = ref(false);
const destroyed = ref(false);
const dragging = ref(false);
const secretFocused = ref(false);
const placeholderActive = computed(() => secret.value === '' && !secretFocused.value);
const placeholder = useRotatingPlaceholder(placeholderActive, '');
const secretInput = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

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

// Das Feld wächst mit dem Inhalt (bis 60 % der Fensterhöhe), danach scrollt es.
function autosize(): void {
    const el = secretInput.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, Math.round(window.innerHeight * 0.6))}px`;
}
watch(secret, () => nextTick(autosize));
onMounted(autosize);

// Strg+S (am Mac Cmd+S) erstellt das Secret, statt dass der Browser die Seite speichern will.
function onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's' || event.altKey || result.value) return;
    event.preventDefault();
    if (secret.value === '') secretInput.value?.focus();
    void submit();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

// Textdatei laden: nur reiner Text, nur bis zum Limit, nur im Browser (nichts wird hochgeladen).
async function loadFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > MAX_PLAINTEXT_BYTES) return void toast.error(t('create.secret.fileTooBig', { n: number.format(Math.floor(MAX_PLAINTEXT_BYTES / 100) * 100) }));
    const text = await file.text();
    // Binärdaten enthalten Nullbytes oder werden beim Dekodieren zu U+FFFD.
    if (text.includes('\u0000') || text.includes('\uFFFD')) return void toast.error(t('create.secret.fileNotText'));
    secret.value = text;
}
function onDrop(event: DragEvent): void {
    dragging.value = false;
    void loadFile(event.dataTransfer?.files?.[0]);
}
function onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    void loadFile(input.files?.[0]);
    input.value = '';
}
function dragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        dragging.value = true;
    }
}

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
            views: maxViews.value,
            attempts: attempts.value,
        };
        // Klartext und Eingabe-Passwort verlassen den Zustand; Link und Passwort bleiben nur in `result`.
        secret.value = '';
        password.value = '';
        history.add({ id: p.body.id, link: result.value.link, manageToken: p.manageToken, createdAt: Date.now(), expiresAt: result.value.expiresAt.getTime(), ttl: ttl.value, maxViews: maxViews.value });
        window.addEventListener('beforeunload', warn);
    } catch (e) {
        toast.error(message(e));
    } finally {
        busy.value = false;
    }
}

async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    busy.value = true;
    try {
        const created = await createSecret({ secret: secret.value, password: password.value, settings: { ttl: ttl.value, maxViews: maxViews.value, maxAttempts: attempts.value } });
        await send(created);
    } catch (e) {
        toast.error(message(e));
        busy.value = false;
    }
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
    password.value = fresh();
    source.value = prefs.value.mode;
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
                    <li class="chip" data-testid="countdown"><Icon name="clock" />{{ destroyed ? t('result.chips.destroyed') : remaining ? t('result.chips.remaining', { time: remaining }) : t('result.chips.expired') }}</li>
                </ul>
            </div>

            <div class="card-inner flex flex-col gap-4" :class="destroyed ? 'items-center py-10 text-center' : ''">
                <template v-if="!destroyed">
                    <CopyField :step="1" icon="link" break-anywhere :label="t('result.link.title')" :value="result.link" :hint="t('result.link.hint')" :copied-message="t('toast.linkCopied')" testid="result-link" />
                    <CopyField :step="2" icon="key" :label="t('result.password.title')" :value="result.password" :hint="t('result.password.hint')" :copied-message="t('toast.passwordCopied')" testid="result-password" />
                    <p class="hint flex items-center gap-2"><Icon name="lock" />{{ t('result.leaveNotice') }}</p>
                </template>
                <div v-else role="status" class="destroyed-in flex flex-col items-center gap-3" data-testid="destroyed">
                    <span class="flex size-12 items-center justify-center rounded-full bg-inset text-foreground"><Icon name="trash" class="size-5" /></span>
                    <div class="flex flex-col gap-1">
                        <h2 class="text-base font-semibold tracking-tight">{{ t('result.destroy.doneTitle') }}</h2>
                        <p class="max-w-xs text-sm text-muted-foreground">{{ t('result.destroy.doneBody') }}</p>
                    </div>
                </div>
            </div>

            <footer class="card-foot" :class="destroyed ? 'justify-end' : ''">
                <button v-if="!destroyed" type="button" class="btn btn-quiet" data-testid="destroy" @click="destroyOpen = true"><Icon name="trash" />{{ t('result.destroy.button') }}</button>
                <button type="button" class="btn" :class="destroyed ? 'btn-primary w-full' : 'btn-secondary'" data-testid="new-secret" @click="reset"><Icon name="plus" />{{ t('result.newSecret') }}</button>
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
                <section class="card-outer relative flex flex-col" aria-labelledby="secret-title" @dragenter="dragOver" @dragover="dragOver" @dragleave.self="dragging = false" @drop.prevent="onDrop">
                    <div class="card-head">
                        <h2 id="secret-title" class="text-sm font-semibold">{{ t('create.secret.title') }}</h2>
                        <div class="flex items-center gap-1">
                            <span class="hidden items-center gap-1.5 pr-1 text-xs font-medium text-positive sm:inline-flex"><Icon name="shield" />{{ t('create.secret.badge') }}</span>
                            <Tip :text="t('create.secret.pickHint')"><button type="button" class="btn btn-quiet btn-sm" data-testid="file-pick" @click="fileInput?.click()"><Icon name="upload" />{{ t('create.secret.pick') }}</button></Tip>
                            <input ref="fileInput" type="file" accept="text/*,.txt,.md,.json,.env,.yml,.yaml,.pem,.key,.conf,.ini,.csv" class="sr-only" tabindex="-1" aria-hidden="true" data-testid="file-input" @change="onPick" />
                        </div>
                    </div>
                    <label for="secret" class="sr-only">{{ t('create.secret.title') }}</label>
                    <div class="relative">
                        <textarea
                            id="secret"
                            ref="secretInput"
                            v-model="secret"
                            data-card-field
                            spellcheck="false"
                            autocomplete="off"
                            :placeholder="placeholder || t('create.secret.placeholder')"
                            :aria-invalid="tooLarge || undefined"
                            aria-describedby="secret-limit"
                            class="card-inner no-ring block min-h-52 w-full resize-none p-3.5 pb-9 font-mono text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground sm:text-sm lg:min-h-72"
                            @input="autosize"
                            @focus="secretFocused = true"
                            @blur="secretFocused = false"
                        />
                        <p id="secret-limit" class="pointer-events-none absolute right-3.5 bottom-2.5 flex items-center gap-1.5 rounded-md bg-card px-1.5 text-xs" :class="limitHint?.over ? 'font-semibold text-foreground' : 'text-muted-foreground'" data-testid="secret-limit">
                            <template v-if="limitHint"><Icon v-if="limitHint.over" name="alert" />{{ limitHint.text }}</template>
                        </p>
                    </div>
                    <!-- Ablegen einer Textdatei -->
                    <div v-if="dragging" class="pointer-events-none absolute inset-1.5 z-10 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand bg-card/95 text-center" data-testid="drop-overlay">
                        <Icon name="upload" class="size-6 text-brand" />
                        <p class="text-sm font-medium">{{ t('create.secret.drop') }}</p>
                        <p class="text-xs text-muted-foreground">{{ t('create.secret.dropSub') }}</p>
                    </div>
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
                        <ToggleButton v-model="oneTime" icon="flame" :label="t('create.dock.oneTime')" :hint="t('create.dock.oneTimeHint')" testid="onetime-toggle" tone="danger" />
                        <DockStepper v-if="!oneTime" id="views" v-model="views" :label="t('create.dock.views')" icon="eye" :min="1" :max="MAX_COUNT" />
                        <DockStepper id="attempts" v-model="attempts" :label="t('create.dock.attempts')" icon="shield" :min="1" :max="MAX_COUNT" />
                    </div>
                    <div class="flex items-center gap-2">
                        <Tip :text="t('create.dock.shortcut')" side="top">
                            <button type="submit" :disabled="!canSubmit" data-testid="submit" aria-keyshortcuts="Control+S Meta+S" class="btn btn-primary btn-lg flex-1 sm:min-w-60 sm:flex-none">
                                {{ busy ? t('create.dock.submitting') : t('create.dock.submit') }}<Icon v-if="!busy" name="arrow-right" />
                            </button>
                        </Tip>
                    </div>
                </div>
            </div>
        </form>

    </AppShell>
</template>
