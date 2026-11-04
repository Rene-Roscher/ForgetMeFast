import { MAX_PLAINTEXT_BYTES } from '@/crypto';

export type TextFileResult = { ok: true; text: string } | { ok: false; reason: 'tooBig' | 'notText' };

/**
 * Liest eine ausgewählte oder abgelegte Datei als Text für das Secret-Feld. Es bleibt im Browser, nichts wird hochgeladen.
 * Abgelehnt werden Dateien über dem Limit des Protokolls (geprüft vor dem Lesen, an der Dateigröße) und alles, was kein
 * gültiges UTF-8 ohne Nullbytes ist: Binärdaten enthalten Nullbytes oder werden beim Dekodieren zu U+FFFD.
 */
export async function readTextFile(file: Pick<File, 'size' | 'text'>, maxBytes: number = MAX_PLAINTEXT_BYTES): Promise<TextFileResult> {
    if (file.size > maxBytes) return { ok: false, reason: 'tooBig' };
    const text = await file.text();
    if (text.includes('\u0000') || text.includes('�')) return { ok: false, reason: 'notText' };
    return { ok: true, text };
}
