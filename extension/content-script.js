// Injected into every page at document_start.
// Sets a flag the app checks to know the extension is installed.
(function () {
  try {
    window.__1XBET_EXT__ = true;
    // Also expose it via a custom event so React code behind strict CSPs can
    // detect it through addEventListener instead of window property access.
    document.dispatchEvent(new CustomEvent('1xbet-ext-ready'));
  } catch (_) {}
})();
