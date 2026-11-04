import { describe, expect, it } from 'vitest';
import { MAX_PLAINTEXT_BYTES } from '@/crypto';
import { readTextFile } from '@/textfile';

const file = (content: string | Uint8Array, size?: number) => {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    return { size: size ?? bytes.length, text: async () => new TextDecoder('utf-8').decode(bytes) };
};

describe('readTextFile', () => {
    it('reads plain UTF-8 text including umlauts and newlines', async () => {
        expect(await readTextFile(file('DB_PASS=äöü-123\nX=1'))).toEqual({ ok: true, text: 'DB_PASS=äöü-123\nX=1' });
    });

    it('accepts exactly the protocol limit and rejects one byte more, before reading', async () => {
        let read = false;
        const ok = { size: MAX_PLAINTEXT_BYTES, text: async () => ((read = true), 'x') };
        expect((await readTextFile(ok)).ok).toBe(true);
        read = false;
        const big = { size: MAX_PLAINTEXT_BYTES + 1, text: async () => ((read = true), 'x') };
        expect(await readTextFile(big)).toEqual({ ok: false, reason: 'tooBig' });
        expect(read, 'zu große Dateien werden gar nicht erst gelesen').toBe(false);
    });

    it('rejects binary data: null bytes and invalid UTF-8', async () => {
        expect(await readTextFile(file(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2])))).toEqual({ ok: false, reason: 'notText' });
        expect(await readTextFile(file(new Uint8Array([0xff, 0xfe, 0xfd])))).toEqual({ ok: false, reason: 'notText' });
    });

    it('accepts an empty file as empty text', async () => {
        expect(await readTextFile(file(''))).toEqual({ ok: true, text: '' });
    });

    it('honours a custom limit', async () => {
        expect(await readTextFile(file('abcdef'), 5)).toEqual({ ok: false, reason: 'tooBig' });
        expect((await readTextFile(file('abcde'), 5)).ok).toBe(true);
    });
});
