import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/** Verbleibende Zeit bis `until` als "1 Std 02 Min" oder "45 Sek"; null, wenn abgelaufen. */
export function format(ms: number): string | null {
    if (ms <= 0) return null;
    const s = Math.ceil(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d} Tg ${h} Std`;
    if (h > 0) return `${h} Std ${String(m).padStart(2, '0')} Min`;
    if (m > 0) return `${m} Min ${String(s % 60).padStart(2, '0')} Sek`;
    return `${s} Sek`;
}

export function useCountdown(until: Ref<Date | null>) {
    const now = ref(Date.now());
    let timer: ReturnType<typeof setInterval> | undefined;
    onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)));
    onBeforeUnmount(() => clearInterval(timer));
    return computed(() => (until.value ? format(until.value.getTime() - now.value) : null));
}
