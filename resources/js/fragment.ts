// Das URL-Fragment (der Link-Key) wird genau einmal gelesen und sofort per history.replaceState aus der Adresse
// entfernt (CLAUDE.md, Invarianten). Dieses Modul muss vor Inertia laufen: Inertia merkt sich beim Start die Adresse
// samt Fragment und stellt sie sonst später wieder her (im E2E-Test gesehen). Es wird nie geloggt, gespeichert oder
// gesendet.
const raw = typeof location === 'undefined' ? '' : location.hash.slice(1);

if (raw !== '') {
    history.replaceState(history.state, '', location.pathname + location.search);
}

export const initialFragment: string = raw;
