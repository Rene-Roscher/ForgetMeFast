// Setzt die Klasse "dark" vor dem ersten Zeichnen. Blockierendes externes Skript (script-src 'self'): kein Inline-Skript
// und kein Aufblitzen des falschen Designs. Reihenfolge: gespeicherte Wahl, sonst die Systemeinstellung.
// Gespeichert wird nur "light" oder "dark" in localStorage (Schlüssel fmf-theme), nichts anderes und kein Cookie.
(function () {
    var stored = null;
    try {
        stored = localStorage.getItem('fmf-theme');
    } catch (e) {}
    var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
        document.documentElement.classList.add('dark');
    }
})();
