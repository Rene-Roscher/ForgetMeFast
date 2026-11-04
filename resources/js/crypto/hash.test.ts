import { afterEach, describe, expect, it, vi } from 'vitest';
import { CryptoError } from './errors';
import { concat, sha256 } from './hash';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

afterEach(() => vi.unstubAllGlobals());

describe('sha256', () => {
    it('stimmt mit dem FIPS-180-4-Vektor für "abc" überein', async () => {
        expect(hex(await sha256(new TextEncoder().encode('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    it('meldet InsecureContext, wenn Web Crypto fehlt', async () => {
        vi.stubGlobal('crypto', undefined);
        await expect(sha256(new Uint8Array([1]))).rejects.toMatchObject({ code: 'InsecureContext' });
        await expect(sha256(new Uint8Array([1]))).rejects.toBeInstanceOf(CryptoError);
    });
});

describe('concat', () => {
    it('hängt Teile in Reihenfolge aneinander, auch leere', () => {
        expect(Array.from(concat(new Uint8Array([1, 2]), new Uint8Array(), new Uint8Array([3])))).toEqual([1, 2, 3]);
        expect(concat().length).toBe(0);
    });
});
