import { Router, type Request, type Response } from 'express';
import https from 'node:https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { isTorReady } from '../lib/tor.js';
import { logger } from '../lib/logger.js';

const router = Router();

const TARGET_HOST = '1x-bet.mobi';
const TARGET_ORIGIN = `https://${TARGET_HOST}`;
const SOCKS_AGENT = new SocksProxyAgent('socks5://127.0.0.1:9050');

// Headers we must not forward to the upstream or back to the client
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
  'content-length',   // will be re-computed
  'content-encoding', // we decode on our side
  'accept-encoding',  // we ask for plain text only
]);

/**
 * Rewrite absolute + root-relative 1x-bet.mobi URLs so the browser
 * fetches them through our proxy instead of going direct.
 */
function rewriteBody(text: string, contentType: string): string {
  // absolute origin
  let out = text.replace(new RegExp(`https?:\\/\\/${TARGET_HOST}`, 'g'), '/api/proxy');

  if (contentType.includes('html') || contentType.includes('javascript')) {
    // root-relative href / src / action / data-src / content= URL
    out = out.replace(/(href|src|action|data-src|data-href|content)=(["'])\//g, '$1=$2/api/proxy/');
    // import() / fetch() / XMLHttpRequest with root-relative paths
    out = out.replace(/(["'`])(\/)(?!api\/proxy)/g, '$1/api/proxy/');
  }

  if (contentType.includes('css')) {
    out = out.replace(/url\((["']?)\//g, 'url($1/api/proxy/');
  }

  return out;
}

// Match /api/proxy/* — note: Express strips /proxy when mounted below
router.use('/', async (req: Request, res: Response) => {
  if (!isTorReady()) {
    res.status(503).json({ error: 'Tor is not ready yet — please retry in a moment.' });
    return;
  }

  // req.url includes the sub-path + query string from the /proxy mount point
  const upstreamPath = req.url || '/';
  const upstreamUrl = `${TARGET_ORIGIN}${upstreamPath}`;

  // Build upstream request headers
  const upstreamHeaders: Record<string, string> = {
    host: TARGET_HOST,
    'user-agent':
      'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    accept: req.headers['accept'] as string ?? '*/*',
    'accept-language': req.headers['accept-language'] as string ?? 'en-US,en;q=0.9',
    // ask for plain (no gzip/br) so we can rewrite without decompressing
    'accept-encoding': 'identity',
  };

  if (req.headers['cookie']) upstreamHeaders['cookie'] = req.headers['cookie'] as string;
  if (req.headers['referer']) {
    upstreamHeaders['referer'] = (req.headers['referer'] as string)
      .replace(/^https?:\/\/[^/]+\/api\/proxy/, TARGET_ORIGIN);
  }

  const parsedUrl = new URL(upstreamUrl);

  logger.info({ method: req.method, url: upstreamUrl }, 'proxy →');

  const proxyReq = https.request(
    {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method,
      headers: upstreamHeaders,
      agent: SOCKS_AGENT,
    },
    (proxyRes) => {
      const status = proxyRes.statusCode ?? 200;
      const contentType = (proxyRes.headers['content-type'] ?? '').toLowerCase();

      // Forward safe response headers
      for (const [key, val] of Object.entries(proxyRes.headers)) {
        if (HOP_BY_HOP.has(key)) continue;
        if (!val) continue;

        if (key === 'location' && typeof val === 'string') {
          // Rewrite redirects through our proxy
          res.setHeader(key, val.replace(new RegExp(`https?:\\/\\/${TARGET_HOST}`), '/api/proxy'));
          continue;
        }
        if (key === 'set-cookie') {
          // Strip domain/secure so the cookie is sent back to us
          const cookies = (Array.isArray(val) ? val : [val]).map((c) =>
            c.replace(/;\s*domain=[^;]*/gi, '').replace(/;\s*secure/gi, ''),
          );
          res.setHeader(key, cookies);
          continue;
        }
        res.setHeader(key, val);
      }

      // For text-based content we buffer, rewrite, then send
      const isText =
        contentType.includes('html') ||
        contentType.includes('javascript') ||
        contentType.includes('css') ||
        contentType.includes('json') ||
        contentType.includes('text/');

      res.status(status);

      if (isText) {
        const chunks: Buffer[] = [];
        proxyRes.on('data', (c: Buffer) => chunks.push(c));
        proxyRes.on('end', () => {
          const body = rewriteBody(Buffer.concat(chunks).toString('utf8'), contentType);
          res.end(body);
        });
      } else {
        // Binary (images, fonts, wasm, etc.) — pipe straight through
        proxyRes.pipe(res);
      }
    },
  );

  proxyReq.on('error', (err) => {
    logger.error({ err, url: upstreamUrl }, 'proxy request error');
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upstream request failed', detail: err.message });
    }
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

export default router;
