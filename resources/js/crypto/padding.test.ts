import { describe, expect, it } from 'vitest';
import { bucketFor, pad, unpad } from './padding';

const code = (fn: () => unknown) => {
    try {
        fn();
    } catch (e) {
        return (e as { code?: string }).code;
    }
    return undefined;
};
const bytes = (n: number) => new Uint8Array(n).fill(0x41);

describe('padding', () => {
    it('wählt den kleinsten Bucket, das Längenpräfix zählt mit', () => {
        const cases: [number, number][] = [[1, 1024], [1020, 1024], [1021, 4096], [4092, 4096], [4093, 16384], [16380, 16384], [16381, 65536], [65532, 65536]];
        for (const [len, bucket] of cases) {
            expect(bucketFor(len), `len ${len}`).toBe(bucket);
            expect(pad(bytes(len))).toHaveLength(bucket);
        }
    });

    it('lehnt leer und zu groß ab', () => {
        expect(code(() => pad(new Uint8Array(0)))).toBe('EmptySecret');
        expect(code(() => pad(bytes(65533)))).toBe('SecretTooLarge');
        expect(code(() => bucketFor(65533))).toBe('SecretTooLarge');
    });

    it('Round-Trip über alle Grenzen', () => {
        for (const len of [1, 2, 1020, 1021, 4092, 4093, 16380, 16381, 65532]) {
            const plain = Uint8Array.from({ length: len }, (_, i) => (i * 7) & 0xff);
            expect(unpad(pad(plain))).toEqual(plain);
        }
    });

    it('speichert das Längenpräfix big-endian', () => {
        const p = pad(bytes(0x0102 - 4 + 4 > 1020 ? 1 : 258));
        expect([...p.subarray(0, 4)]).toEqual([0, 0, 1, 2]);
    });

    it('unpad lehnt ab: falsche Bucketgröße, Länge 0, zu große Länge, nicht kleinster Bucket, Füllbytes ungleich null', () => {
        expect(code(() => unpad(new Uint8Array(1000)))).toBe('DecryptFailed');

        const zero = new Uint8Array(1024);
        expect(code(() => unpad(zero))).toBe('DecryptFailed');

        const tooBig = new Uint8Array(1024);
        new DataView(tooBig.buffer).setUint32(0, 1021);
        expect(code(() => unpad(tooBig))).toBe('DecryptFailed');

        const notMinimal = new Uint8Array(4096);
        new DataView(notMinimal.buffer).setUint32(0, 10);
        expect(code(() => unpad(notMinimal))).toBe('DecryptFailed');

        const dirty = pad(bytes(10));
        dirty[500] = 1;
        expect(code(() => unpad(dirty))).toBe('DecryptFailed');

        const huge = new Uint8Array(1024);
        new DataView(huge.buffer).setUint32(0, 0xffffffff);
        expect(code(() => unpad(huge))).toBe('DecryptFailed');
    });
});
