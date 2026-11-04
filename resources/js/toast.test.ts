import { beforeEach, describe, expect, it, vi } from 'vitest';

const custom = vi.fn();
vi.mock('vue-sonner', () => ({ toast: { custom, dismiss: vi.fn() } }));
vi.mock('@/components/ToastCard.vue', () => ({ default: { name: 'ToastCard' } }));

describe('toast', () => {
    beforeEach(() => custom.mockClear());

    it.each([
        ['error', 8000], ['success', 3500], ['info', 3500],
    ] as const)('%s: ein Aufruf mit Text, Art und Dauer, ohne Titel', async (kind, duration) => {
        const { toast } = await import('@/toast');
        toast[kind]('Hallo');
        expect(custom).toHaveBeenCalledTimes(1);
        const [, data] = custom.mock.calls[0]!;
        expect(data.duration).toBe(duration);
        expect(data.componentProps).toEqual({ id: `${kind}:Hallo`, kind, message: 'Hallo', duration });
        expect('title' in data.componentProps).toBe(false);
    });

    it('gleiche Meldung bekommt dieselbe id (wird aktualisiert statt gestapelt), andere nicht', async () => {
        const { toast } = await import('@/toast');
        toast.error('A');
        toast.error('A');
        toast.error('B');
        const ids = custom.mock.calls.map(([, d]) => d.id);
        expect(ids[0]).toBe(ids[1]);
        expect(ids[2]).not.toBe(ids[0]);
    });
});
