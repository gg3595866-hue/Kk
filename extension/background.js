// ─── 1xBet Game Proxy – background service v2 ────────────────────────────────
// Manifest V2. Handles:
//   • webRequest interception (frame unlock, CDN CORS, header spoofing)
//   • chrome.proxy PAC-script routing for 1x-bet.mobi traffic

const TARGET   = 'https://1x-bet.mobi';
const CDN_HOST = 'traincdn.com';

const FRAME_BLOCK_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-content-security-policy',
  'x-webkit-csp',
  'frame-options',
]);

// ─── Proxy PAC management ────────────────────────────────────────────────────

function buildPac(type, host, port) {
  // PAC keyword: PROXY = HTTP proxy, SOCKS = SOCKS4, SOCKS5 = SOCKS5
  const proxyStr = (type === 'socks5')
    ? `SOCKS5 ${host}:${port}`
    : `PROXY ${host}:${port}`;

  return `
    function FindProxyForURL(url, host) {
      if (
        shExpMatch(host, "*.1x-bet.mobi") ||
        shExpMatch(host, "1x-bet.mobi")   ||
        shExpMatch(host, "*.1xbet.com")   ||
        shExpMatch(host, "1xbet.com")     ||
        shExpMatch(host, "*.traincdn.com")||
        shExpMatch(host, "traincdn.com")
      ) {
        return "${proxyStr}; DIRECT";
      }
      return "DIRECT";
    }
  `;
}

function applyProxy(config) {
  if (!config || !config.enabled || !config.host || !config.port) {
    // Clear proxy — go direct
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      console.log('[1xBet Proxy] proxy cleared – using DIRECT');
    });
    return;
  }

  const pac = buildPac(config.type || 'http', config.host, config.port);
  chrome.proxy.settings.set(
    {
      value: { mode: 'pac_script', pacScript: { data: pac } },
      scope: 'regular',
    },
    () => {
      console.log('[1xBet Proxy] PAC applied →', config.type, config.host + ':' + config.port);
    }
  );
}

// Load saved proxy config on startup
chrome.storage.local.get(['proxyConfig'], (result) => {
  if (result.proxyConfig) applyProxy(result.proxyConfig);
});

// Re-apply whenever the user saves new settings from the popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.proxyConfig) applyProxy(changes.proxyConfig.newValue);
});

// ─── 1. Strip framing-prevention headers from 1x-bet.mobi responses ─────────
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    const responseHeaders = (details.responseHeaders || []).filter(
      h => !FRAME_BLOCK_HEADERS.has(h.name.toLowerCase())
    );
    responseHeaders.push({ name: 'Access-Control-Allow-Origin',  value: '*' });
    responseHeaders.push({ name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' });
    responseHeaders.push({ name: 'Access-Control-Allow-Headers', value: '*' });
    return { responseHeaders };
  },
  { urls: [`${TARGET}/*`, 'https://*.1x-bet.mobi/*', 'https://*.1xbet.com/*'] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// ─── 2. Add CORS headers to CDN image responses ──────────────────────────────
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    const responseHeaders = (details.responseHeaders || []);
    responseHeaders.push({ name: 'Access-Control-Allow-Origin', value: '*' });
    return { responseHeaders };
  },
  { urls: [`https://${CDN_HOST}/*`, `https://*.${CDN_HOST}/*`] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// ─── 3. Spoof Referer & Origin for 1x-bet.mobi requests ─────────────────────
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    const headers = (details.requestHeaders || []).map(h => {
      const name = h.name.toLowerCase();
      if (name === 'referer') return { name: h.name, value: `${TARGET}/` };
      if (name === 'origin')  return { name: h.name, value: TARGET };
      return h;
    });
    const hasUA = headers.some(h => h.name.toLowerCase() === 'user-agent');
    if (!hasUA) {
      headers.push({
        name: 'User-Agent',
        value: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      });
    }
    return { requestHeaders: headers };
  },
  { urls: [`${TARGET}/*`, 'https://*.1x-bet.mobi/*', 'https://*.1xbet.com/*'] },
  ['blocking', 'requestHeaders', 'extraHeaders']
);

console.log('[1xBet Proxy] background v2 active');
