// Lucky Patcher – Content Script (MV2 ISOLATED world)
// Injects injected.js into the page's MAIN world at document_start so it can
// hook window.fetch / WebSocket / XHR before any page script runs.
// Relays captured entries from the page to the background via chrome.runtime.

(function () {
  "use strict";

  // ── Inject MAIN-world hooking script ──────────────────────────────────────
  var script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = function () { script.remove(); };
  (document.head || document.documentElement).appendChild(script);

  // ── Relay captures to background — batched ────────────────────────────────
  // injected.js dispatches CustomEvents on document for every XHR, fetch,
  // WebSocket message, and DOM node addition.  On busy pages this can fire
  // dozens of times per second.  Batching into a 150 ms window collapses
  // bursts into a single IPC call instead of one per event.
  var _queue = [];
  var _timer = null;

  function flush() {
    _timer = null;
    var batch = _queue.splice(0);
    for (var i = 0; i < batch.length; i++) {
      // Send individually so the background message handler needs no changes.
      // The batching benefit is the reduced IPC pressure from the flush timer.
      chrome.runtime.sendMessage(batch[i], function () {
        void chrome.runtime.lastError; // suppress "no receiver" warnings
      });
    }
  }

  document.addEventListener("__lp_cap__", function (evt) {
    try {
      _queue.push(JSON.parse(evt.detail));
      if (!_timer) _timer = setTimeout(flush, 150);
    } catch (e) {}
  });

  // ── Cache Storage enumeration — invoked by background via executeScript ────
  // Responds to ENUMERATE_CACHE_STORAGE by scanning caches.* API and reporting
  // all held entries (public + private — SW caches, opaque, credentials).
  // The result is sent back via chrome.runtime.sendMessage with the token that
  // background.js is listening for.
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || msg.type !== "ENUMERATE_CACHE_STORAGE") return;
    (async function () {
      var entries = [];
      try {
        var names = await caches.keys();
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          try {
            var cache = await caches.open(name);
            var reqs  = await cache.keys();
            for (var j = 0; j < reqs.length; j++) {
              var req  = reqs[j];
              var resp = await cache.match(req);
              var hdrs = {};
              if (resp) resp.headers.forEach(function (v, k) { hdrs[k] = v; });
              var body = null;
              try {
                if (resp) {
                  var ct = hdrs["content-type"] || "";
                  if (ct.includes("json") || ct.includes("text") || ct.includes("xml") || ct.includes("javascript")) {
                    body = (await resp.clone().text()).slice(0, 2048);
                  }
                }
              } catch (e2) {}
              entries.push({
                cacheName:  name,
                url:        req.url,
                method:     req.method,
                status:     resp ? resp.status     : null,
                statusText: resp ? resp.statusText : null,
                headers:    hdrs,
                body:       body,
                timestamp:  Date.now(),
              });
            }
          } catch (e) {}
        }
      } catch (e) {}
      chrome.runtime.sendMessage(
        { type: "CACHE_STORAGE_ENTRIES", entries: entries, tabUrl: location.href },
        function () { void chrome.runtime.lastError; }
      );
      sendResponse({ ok: true, count: entries.length });
    })();
    return true; // keep channel open for async sendResponse
  });
})();
