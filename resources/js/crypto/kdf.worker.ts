import { argon2id } from '@noble/hashes/argon2.js';

interface Job {
    password: Uint8Array;
    salt: Uint8Array;
    params: { m: number; t: number; p: number };
}

self.onmessage = (e: MessageEvent<Job>) => {
    try {
        const { password, salt, params } = e.data;
        const key = argon2id(password, salt, { t: params.t, m: params.m, p: params.p, dkLen: 32 });
        (self as unknown as Worker).postMessage({ ok: true, key }, [key.buffer]);
    } catch {
        (self as unknown as Worker).postMessage({ ok: false });
    }
};
