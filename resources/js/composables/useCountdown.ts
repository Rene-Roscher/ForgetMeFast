import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

type Translate = (key: string, named: Record<string, number | string>) => string;

/** Verbleibende Zeit bis `until` als "1 Std 02 Min" oder "45 Sek"; null, wenn abgelaufen. Einheiten stehen in der Sprachdatei. */
export function format(ms: number, t: Translate): string | null {
    if (ms <= 0) return null;
    const s = Math.ceil(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const two = (n: number) => String(n).padStart(2, '0');
    if (d > 0) return t('time.days', { d, h });
    if (h > 0) return t('time.hours', { h, m: two(m) });
    if (m > 0) return t('time.minutes', { m, s: two(s % 60) });
    return t('time.seconds', { s });
}

export function useCountdown(until: Ref<Date | null>) {
    const { t } = useI18n();
    const now = ref(Date.now());
    let timer: ReturnType<typeof setInterval> | undefined;
    onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)));
    onBeforeUnmount(() => clearInterval(timer));
    return computed(() => (until.value ? format(until.value.getTime() - now.value, t as Translate) : null));
}
