<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { api, ApiError } from '@/api';
import Icon from '@/components/Icon.vue';
import Modal from '@/components/ui/Modal.vue';
import Tip from '@/components/ui/Tip.vue';
import { format } from '@/composables/useCountdown';
import { type HistoryEntry, type HistoryState, useHistory } from '@/history';
import { toast } from '@/toast';

// Verlauf der eigenen Secrets (nur dieser Browser). Der Status kommt vom Server über das Verwaltungstoken: Abrufe und Ablauf.
// "Abgelaufen" weiß der Browser selbst. Ein 404 vor dem Ablauf heißt: gelesen oder vernichtet (mehr unterscheidet der Server nicht).
const { t } = useI18n();
const history = useHistory();
const statuses = ref<Record<string, { state: HistoryState; viewsUsed: number }>>({});
const now = ref(Date.now());
const busy = ref(false);
const destroyTarget = ref<HistoryEntry | null>(null);
const destroyOpen = ref(false);
const clearOpen = ref(false);
let tick: ReturnType<typeof setInterval> | undefined;

const when = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function refreshOne(entry: HistoryEntry): Promise<void> {
    if (Date.now() >= entry.expiresAt) {
        statuses.value = { ...statuses.value, [entry.id]: { state: 'expired', viewsUsed: statuses.value[entry.id]?.viewsUsed ?? 0 } };
        return;
    }
    try {
        const s = await api.status(entry.id, entry.manageToken.toString());
        statuses.value = { ...statuses.value, [entry.id]: { state: 'active', viewsUsed: s.views_used } };
    } catch (e) {
        const gone = e instanceof ApiError && e.status === 404;
        statuses.value = { ...statuses.value, [entry.id]: { state: gone ? 'gone' : 'unknown', viewsUsed: statuses.value[entry.id]?.viewsUsed ?? 0 } };
    }
}

async function refreshAll(): Promise<void> {
    busy.value = true;
    try {
        for (const entry of history.entries.value) await refreshOne(entry);
    } finally {
        busy.value = false;
    }
}

onMounted(() => {
    void refreshAll();
    tick = setInterval(() => (now.value = Date.now()), 30_000);
});
onBeforeUnmount(() => clearInterval(tick));
// Neuer Eintrag (nach dem Erstellen): nur dessen Status holen.
watch(() => history.entries.value.map((e) => e.id).join(','), () => {
    for (const e of history.entries.value) if (!statuses.value[e.id]) void refreshOne(e);
});

const rows = computed(() => history.entries.value.map((entry) => {
    const status = statuses.value[entry.id];
    const expired = now.value >= entry.expiresAt;
    const state: HistoryState = expired ? 'expired' : status?.state ?? 'unknown';
    return {
        entry,
        state,
        used: status?.viewsUsed ?? 0,
        created: when.format(new Date(entry.createdAt)),
        left: format(entry.expiresAt - now.value, t as never),
    };
}));

async function copyLink(entry: HistoryEntry): Promise<void> {
    try {
        await navigator.clipboard.writeText(entry.link);
        toast.success(t('toast.linkCopied'));
    } catch {
        toast.error(t('result.copyFailed'));
    }
}

function askDestroy(entry: HistoryEntry): void {
    destroyTarget.value = entry;
    destroyOpen.value = true;
}
async function destroy(): Promise<void> {
    const entry = destroyTarget.value;
    if (!entry) return;
    destroyOpen.value = false;
    try {
        await api.destroy(entry.id, entry.manageToken);
        toast.success(t('toast.destroyed'));
    } catch {
        // 404: war schon weg. Der Status wird ohnehin neu geholt.
    }
    await refreshOne(entry);
}
function clearAll(): void {
    history.clear();
    statuses.value = {};
    clearOpen.value = false;
    toast.info(t('toast.historyCleared'));
}

const stateTone: Record<HistoryState, string> = {
    active: 'border-l-brand text-foreground',
    expired: 'border-l-caption text-muted-foreground',
    gone: 'border-l-caption text-muted-foreground',
    unknown: 'border-l-caption text-muted-foreground',
};
</script>

<template>
    <section class="flex flex-col gap-3" data-testid="history">
        <div v-if="rows.length > 0" class="flex items-center justify-between gap-2">
            <Tip :text="t('history.refresh')"><button type="button" class="btn btn-quiet btn-sm" :aria-label="t('history.refresh')" :disabled="busy" data-testid="history-refresh" @click="refreshAll"><Icon name="refresh" />{{ t('history.refresh') }}</button></Tip>
            <button type="button" class="btn btn-quiet btn-sm" data-testid="history-clear" @click="clearOpen = true">{{ t('history.clear') }}</button>
        </div>
        <p v-else class="rounded-md border border-dashed border-border-strong p-4 text-center text-sm text-muted-foreground" data-testid="history-empty">{{ t('history.empty') }}</p>

        <ul class="flex flex-col gap-2">
            <li v-for="row in rows" :key="row.entry.id" class="flex flex-col gap-2 rounded-md border border-border bg-inset p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="history-row">
                <div class="flex min-w-0 flex-col gap-1.5">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="chip border-l-[3px]" :class="stateTone[row.state]" data-testid="history-state">{{ t(`history.state.${row.state}`) }}</span>
                        <span class="text-sm font-medium">{{ t('history.created', { when: row.created }) }}</span>
                    </div>
                    <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span class="flex items-center gap-1.5" data-testid="history-views"><Icon name="eye" />{{ t('history.views', { used: row.used, max: row.entry.maxViews }) }}</span>
                        <span v-if="row.state === 'active' && row.left" class="flex items-center gap-1.5"><Icon name="clock" />{{ t('history.expiresIn', { time: row.left }) }}</span>
                    </p>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                    <Tip :text="t('history.copyLink')"><button type="button" class="icon-btn border border-border-strong bg-card" :aria-label="t('history.copyLink')" data-testid="history-copy" @click="copyLink(row.entry)"><Icon name="copy" /></button></Tip>
                    <Tip v-if="row.state === 'active'" :text="t('history.destroy')"><button type="button" class="icon-btn border border-border-strong bg-card" :aria-label="t('history.destroy')" data-testid="history-destroy" @click="askDestroy(row.entry)"><Icon name="trash" /></button></Tip>
                    <Tip :text="t('history.remove')"><button type="button" class="icon-btn" :aria-label="t('history.remove')" data-testid="history-remove" @click="history.remove(row.entry.id)"><Icon name="close" /></button></Tip>
                </div>
            </li>
        </ul>

        <Modal v-model:open="destroyOpen" :title="t('result.destroy.title')" :description="t('result.destroy.body')" testid="history-destroy-dialog">
            <template #footer>
                <button type="button" class="btn btn-secondary" @click="destroyOpen = false">{{ t('result.destroy.cancel') }}</button>
                <button type="button" class="btn bg-foreground text-background hover:opacity-90" data-testid="history-destroy-confirm" @click="destroy"><Icon name="trash" />{{ t('result.destroy.confirm') }}</button>
            </template>
        </Modal>
        <Modal v-model:open="clearOpen" :title="t('history.clearTitle')" :description="t('history.clearBody')" testid="history-clear-dialog">
            <template #footer>
                <button type="button" class="btn btn-secondary" @click="clearOpen = false">{{ t('result.destroy.cancel') }}</button>
                <button type="button" class="btn btn-primary" data-testid="history-clear-confirm" @click="clearAll">{{ t('history.clearConfirm') }}</button>
            </template>
        </Modal>
    </section>
</template>
