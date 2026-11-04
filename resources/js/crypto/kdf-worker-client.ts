// Läuft nur im Browser (Web Worker aus einer eigenen Datei vom eigenen Ursprung, ADR 0004 Punkt 5). Wird in
// vitest nicht ausgeführt; die Abdeckung liefert der Playwright-Test (e2e/).
import type { Deriver } from './kdf';
import { CryptoError } from './errors';

export function workerDeriver(): Deriver {
    return (password, salt, params) =>
        new Promise((resolve, reject) => {
            const worker = new Worker(new URL('./kdf.worker.ts', import.meta.url), { type: 'module' });
            worker.onmessage = (e: MessageEvent<{ ok: boolean; key?: Uint8Array }>) => {
                worker.terminate();
                if (e.data.ok && e.data.key) resolve(e.data.key);
                else reject(new CryptoError('KdfFailed'));
            };
            worker.onerror = () => {
                worker.terminate();
                reject(new CryptoError('KdfFailed'));
            };
            worker.postMessage({ password, salt, params });
        });
}
