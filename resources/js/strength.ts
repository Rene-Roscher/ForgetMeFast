/**
 * Stärkestufe eines Passworts aus Bit: 0 (leer), 1 Schwach (unter 36), 2 Okay (36 bis unter 50), 3 Gut (50 bis unter 64),
 * 4 Stark (ab 64). Bei erzeugten Passwörtern sind die Bit exakt (Zufallswahl), bei getippten eine obere Schätzung
 * (crypto/generator.ts); die Oberfläche beschriftet beides entsprechend.
 */
export function strengthLevel(bits: number, empty: boolean): 0 | 1 | 2 | 3 | 4 {
    if (empty) return 0;
    if (bits < 36) return 1;
    if (bits < 50) return 2;
    if (bits < 64) return 3;
    return 4;
}
