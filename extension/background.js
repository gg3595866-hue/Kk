// ─── 1xBet Game Proxy – background service ───────────────────────────────────
// Manifest V2 background script (required for webRequestBlocking on Kiwi Browser)

const TARGET   = 'https://1x-bet.mobi';
const CDN_HOST = 'v3.traincdn.com';

// Headers we remove from 1x-bet.mobi responses so the game page can be
// embedded inside an <iframe> on any origin.
const FRAME_BLOCK_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-content-security-policy',
  'x-webkit-csp',
  'frame-options',
]);

// ─── 1. Redirect /api/proxy/* → https://1x-bet.mobi/* ───────────────────────
// The app uses /api/proxy/en/games/crash as the iframe src.
// The extension silently redirects it straight to the real site so the
// request comes from the user's own IP (not Replit's blocked server IP).
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const match = details.url.match(/\/api\/proxy\/(.*)$/);
    if (match) {
      const redirectUrl = `${TARGET}/${match[1]}`;
      return { redirectUrl };
    }
  },
  { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'other'] },
  ['blocking']
);

// ─── 2. Spoof Referer & Origin for requests going to 1x-bet.mobi ────────────
// Some WAFs reject requests whose Referer differs from the target site.
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    const headers = details.requestHeaders || [];
    const out = headers.map(h => {
      const name = h.name.toLowerCase();
      if (name === 'referer')  return { name: h.name, value: `${TARGET}/` };
      if (name === 'origin')   return { name: h.name, value: TARGET };
      return h;
    });
    // Add a mobile User-Agent if none present
    const hasUA = out.some(h => h.name.toLowerCase() === 'user-agent');
    if (!hasUA) {
      out.push({
        name: 'User-Agent',
        value: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      });
    }
    return { requestHeaders: out };
  },
  { urls: [`${TARGET}/*`, `https://*.1x-bet.mobi/*`] },
  ['blocking', 'requestHeaders', 'extraHeaders']
);

// ─── 3. Strip framing-prevention headers from 1x-bet.mobi responses ─────────
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    const responseHeaders = (details.responseHeaders || []).filter(
      h => !FRAME_BLOCK_HEADERS.has(h.name.toLowerCase())
    );

    // Also inject permissive CORS so fetch/XHR from the app can read responses
    responseHeaders.push({ name: 'Access-Control-Allow-Origin',  value: '*' });
    responseHeaders.push({ name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' });
    responseHeaders.push({ name: 'Access-Control-Allow-Headers', value: '*' });

    return { responseHeaders };
  },
  { urls: [`${TARGET}/*`, `https://*.1x-bet.mobi/*`] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// ─── 4. Add CORS headers to CDN image responses ──────────────────────────────
// Game thumbnails come from traincdn.com; adding CORS lets the app use them.
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    const responseHeaders = (details.responseHeaders || []);
    responseHeaders.push({ name: 'Access-Control-Allow-Origin', value: '*' });
    return { responseHeaders };
  },
  { urls: [`https://${CDN_HOST}/*`, `https://www.${CDN_HOST}/*`] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// ─── 5. Handle OPTIONS pre-flight requests ───────────────────────────────────
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.method === 'OPTIONS') {
      return { cancel: false };
    }
  },
  { urls: [`${TARGET}/*`, `https://*.1x-bet.mobi/*`] },
  ['blocking']
);

console.log('[1xBet Proxy] background script active');
