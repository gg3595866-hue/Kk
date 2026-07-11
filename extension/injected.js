// Lucky Patcher – Injected Script (MAIN world)
// Inlined into the page by content-script.js so it can hook window.fetch,
// window.WebSocket, and window.XMLHttpRequest before any page code runs.
// Communicates back to the content-script via CustomEvent on document.

(function () {
  "use strict";

  // Dispatch a capture entry to the content-script relay
  const EVT = "__lp_cap__";
  const send = (entry) => {
    try {
      document.dispatchEvent(new CustomEvent(EVT, { detail: JSON.stringify(entry) }));
    } catch {}
  };

  const ts = () => Date.now();
  const getUrl = () => { try { return location.href; } catch { return ""; } };
  const getDomain = (url) => { try { return new URL(url).hostname; } catch { return url; } };

  // ── WebSocket Interceptor ─────────────────────────────────────────────────
  const NativeWebSocket = window.WebSocket;
  let wsId = 0;

  window.WebSocket = function (url, protocols) {
    const id = ++wsId;
    const ws = protocols ? new NativeWebSocket(url, protocols) : new NativeWebSocket(url);

    send({ captureType: "websocket", event: "open", wsId: id, url, domain: getDomain(url), pageUrl: getUrl(), protocols: protocols || [], timestamp: ts() });

    const origSend = ws.send.bind(ws);
    ws.send = function (data) {
      let payload = null;
      try {
        if (typeof data === "string") payload = data.length > 2048 ? data.slice(0, 2048) + "\u2026" : data;
        else if (data instanceof ArrayBuffer) payload = "[ArrayBuffer " + data.byteLength + "b]";
        else if (data instanceof Blob) payload = "[Blob " + data.size + "b]";
      } catch {}
      send({ captureType: "websocket", event: "send", wsId: id, url, domain: getDomain(url), pageUrl: getUrl(), payload, timestamp: ts() });
      return origSend(data);
    };

    ws.addEventListener("message", (evt) => {
      let payload = null;
      try {
        if (typeof evt.data === "string") payload = evt.data.length > 2048 ? evt.data.slice(0, 2048) + "\u2026" : evt.data;
        else payload = "[Binary " + (evt.data && evt.data.size != null ? evt.data.size : "?") + "b]";
      } catch {}
      send({ captureType: "websocket", event: "message", wsId: id, url, domain: getDomain(url), pageUrl: getUrl(), payload, timestamp: ts() });
    });

    ws.addEventListener("close", (evt) => {
      send({ captureType: "websocket", event: "close", wsId: id, url, domain: getDomain(url), pageUrl: getUrl(), code: evt.code, reason: evt.reason, timestamp: ts() });
    });

    ws.addEventListener("error", () => {
      send({ captureType: "websocket", event: "error", wsId: id, url, domain: getDomain(url), pageUrl: getUrl(), timestamp: ts() });
    });

    return ws;
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

  // ── Fetch Interceptor ─────────────────────────────────────────────────────
  const nativeFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url ? input.url : String(input));
    const method = ((init && init.method) || (typeof input === "object" && input && input.method) || "GET").toUpperCase();
    const start = ts();

    let reqBody = null;
    try {
      if (init && init.body) {
        if (typeof init.body === "string") reqBody = init.body.slice(0, 512);
        else if (init.body instanceof FormData) reqBody = "[FormData]";
        else if (init.body instanceof URLSearchParams) reqBody = init.body.toString().slice(0, 512);
        else reqBody = "[Binary]";
      }
    } catch {}

    const reqHeaders = {};
    try {
      const h = (init && init.headers) || (typeof input === "object" && input && input.headers) || null;
      if (h instanceof Headers) h.forEach(function (v, k) { reqHeaders[k] = v; });
      else if (Array.isArray(h)) h.forEach(function (pair) { reqHeaders[pair[0]] = pair[1]; });
      else if (h) Object.assign(reqHeaders, h);
    } catch {}

    let response, status = null, respBody = null, respHeaders = {};

    try {
      response = await nativeFetch(input, init);
      status = response.status;

      try {
        const clone = response.clone();
        const ct = response.headers.get("content-type") || "";
        if (ct.includes("json") || ct.includes("text") || ct.includes("xml") || ct.includes("html")) {
          respBody = await clone.text().then(function (t) { return t.slice(0, 4096); }).catch(function () { return null; });
        }
      } catch {}

      try { response.headers.forEach(function (v, k) { respHeaders[k] = v; }); } catch {}
    } catch (e) {
      send({ captureType: "fetch", url, domain: getDomain(url), pageUrl: getUrl(), method, requestBody: reqBody, requestHeaders: reqHeaders, status: "error", error: (e && e.message) || "NetworkError", duration: ts() - start, timestamp: start });
      throw e;
    }

    send({ captureType: "fetch", url, domain: getDomain(url), pageUrl: getUrl(), method, requestBody: reqBody, requestHeaders: reqHeaders, status: "completed", statusCode: status, responseBody: respBody, responseHeaders: respHeaders, duration: ts() - start, timestamp: start });
    return response;
  };

  // ── XMLHttpRequest Interceptor ────────────────────────────────────────────
  const NativeXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new NativeXHR();
    let xhrMethod = "GET", xhrUrl = "", xhrHeaders = {}, xhrStart = 0;

    const origOpen = xhr.open.bind(xhr);
    xhr.open = function (method, url) {
      xhrMethod = (method || "GET").toUpperCase();
      xhrUrl = url || "";
      xhrStart = ts();
      return origOpen.apply(xhr, arguments);
    };

    const origSetHeader = xhr.setRequestHeader.bind(xhr);
    xhr.setRequestHeader = function (name, value) {
      xhrHeaders[name] = value;
      return origSetHeader(name, value);
    };

    const origSend = xhr.send.bind(xhr);
    xhr.send = function (body) {
      let payload = null;
      try {
        if (typeof body === "string") payload = body.slice(0, 512);
        else if (body instanceof FormData) payload = "[FormData]";
        else if (body instanceof URLSearchParams) payload = body.toString().slice(0, 512);
        else if (body) payload = "[Binary]";
      } catch {}

      xhr.addEventListener("loadend", function () {
        let respBody = null;
        let respHeaders = {};
        try {
          const ct = xhr.getResponseHeader("content-type") || "";
          if (ct.includes("json") || ct.includes("text") || ct.includes("xml") || ct.includes("html")) {
            respBody = (typeof xhr.responseText === "string" ? xhr.responseText : "").slice(0, 4096);
          }
          const raw = xhr.getAllResponseHeaders();
          if (raw) {
            raw.trim().split(/[\r\n]+/).forEach(function (line) {
              const idx = line.indexOf(": ");
              if (idx > -1) respHeaders[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2);
            });
          }
        } catch {}

        send({
          captureType: "xhr",
          url: xhrUrl,
          domain: getDomain(xhrUrl),
          pageUrl: getUrl(),
          method: xhrMethod,
          requestBody: payload,
          requestHeaders: xhrHeaders,
          status: xhr.status === 0 ? "error" : "completed",
          statusCode: xhr.status || null,
          responseBody: respBody,
          responseHeaders: respHeaders,
          duration: ts() - xhrStart,
          timestamp: xhrStart,
        });
      });

      return origSend(body);
    };

    return xhr;
  };

  // ── iframe Tracker ────────────────────────────────────────────────────────
  function trackIframe(node) {
    const src = node.src || (node.getAttribute && node.getAttribute("src")) || "";
    const srcdoc = node.srcdoc || (node.getAttribute && node.getAttribute("srcdoc")) || null;
    if (!src && !srcdoc) return;

    send({
      captureType: "iframe",
      event: "created",
      src: src,
      srcdoc: srcdoc ? srcdoc.slice(0, 300) : null,
      domain: src ? getDomain(src) : "srcdoc",
      sandbox: (node.getAttribute && node.getAttribute("sandbox")) || null,
      allow: (node.getAttribute && node.getAttribute("allow")) || null,
      pageUrl: getUrl(),
      timestamp: ts(),
    });

    node.addEventListener("load", function () {
      let innerUrl = null;
      try { innerUrl = node.contentWindow && node.contentWindow.location && node.contentWindow.location.href; } catch {}
      send({ captureType: "iframe", event: "load", src: node.src || src, innerUrl: innerUrl, domain: src ? getDomain(src) : "srcdoc", pageUrl: getUrl(), timestamp: ts() });
    });
  }

  document.querySelectorAll && document.querySelectorAll("iframe, frame").forEach(trackIframe);

  // ── DOM MutationObserver ──────────────────────────────────────────────────
  const INTERESTING = { SCRIPT: 1, LINK: 1, IFRAME: 1, FRAME: 1, IMG: 1, META: 1, FORM: 1, INPUT: 1, OBJECT: 1, EMBED: 1 };

  function getAttrs(node) {
    const out = {};
    try {
      const KEEP = ["src","href","id","class","type","name","action","content","rel","integrity","crossorigin","nonce"];
      for (let i = 0; i < (node.attributes || []).length; i++) {
        const attr = node.attributes[i];
        if (KEEP.indexOf(attr.name) !== -1) out[attr.name] = attr.value ? attr.value.slice(0, 300) : attr.value;
      }
    } catch {}
    return out;
  }

  // Only watch for new nodes being added — attribute observation fires
  // hundreds of times per second on React/SPA apps and adds no useful info
  // beyond what the initial node capture already records.
  const observer = new MutationObserver(function (mutations) {
    for (let m = 0; m < mutations.length; m++) {
      const added = mutations[m].addedNodes;
      for (let n = 0; n < added.length; n++) {
        const node = added[n];
        if (node.nodeType !== 1) continue;
        const tag = (node.tagName || "").toUpperCase();
        if (tag === "IFRAME" || tag === "FRAME") trackIframe(node);
        if (INTERESTING[tag]) {
          const src = node.src || node.href || node.action
            || (node.getAttribute && (node.getAttribute("src") || node.getAttribute("href"))) || null;
          send({ captureType: "dom", event: "node-added", tag: tag, src: src, domain: src ? getDomain(src) : null, id: node.id || null, className: (typeof node.className === "string" ? node.className.slice(0, 100) : null), attrs: getAttrs(node), pageUrl: getUrl(), timestamp: ts() });
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    // attributes: false (default) — omitted intentionally for performance
  });

})();
