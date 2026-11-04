import { describe, expect, it } from 'vitest';
import * as c from './constants';

describe('constants', () => {
    it('hält die in docs/SPEC.md und docs/CRYPTO-NOTES.md festgelegten Werte', () => {
        expect(c.KDF_DEFAULT).toEqual({ m: 19456, t: 2, p: 1 });
        expect(c.KDF_LIMITS).toEqual({ mMin: 19456, mMax: 65536, tMin: 2, tMax: 6, p: 1 });
        expect(c.BUCKETS).toEqual([1024, 4096, 16384, 65536]);
        expect(c.MAX_PLAINTEXT_BYTES).toBe(65532);
        expect(c.INFO_ENC).toBe('fmf/v1/enc');
        expect(c.INFO_AUTH).toBe('fmf/v1/auth');
        expect(c.HEADER_BYTES).toBe(3 + 1 + c.ID_BYTES + 1 + 4 + 4 + 4 + c.SALT_BYTES);
        expect([...c.MAGIC]).toEqual([0x46, 0x4d, 0x46]);
        expect(c.PASSWORD_ALPHABET).toHaveLength(62);
        expect(new Set(c.PASSWORD_ALPHABET).size).toBe(62);
    });
});
