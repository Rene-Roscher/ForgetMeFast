// Sets the dark class before first paint. Loaded as a blocking external script (script-src 'self'),
// so there is no inline script and no flash of the wrong theme. Follows the system setting only;
// nothing is stored.
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
