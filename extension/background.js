// Lucky Patcher – Background Service Worker
// Kiwi-compatible: no ES module imports — db-detector functions are inlined below.
// Intercepts all network requests via webRequest API and aggregates data from content scripts.

// ══════════════════════════════════════════════════════════════════════════════
// INLINED: db-detector.js — Database & Stack Fingerprinter
// ══════════════════════════════════════════════════════════════════════════════

function detectStack(entry) {
  const result = {
    databases: [],
    orm: null,
    framework: null,
    cloud: null,
    apiStyle: null,
    confidence: "low",
    evidence: [],
  };

  const url = (entry.url || "").toLowerCase();
  const domain = (entry.domain || "").toLowerCase();
  const headers = { ...(entry.responseHeaders || {}), ...(entry.requestHeaders || {}) };
  const body = (entry.responseBody || "").toLowerCase();
  const status = entry.statusCode;

  // ── URL / Domain fingerprinting ──────────────────────────────────────────
  const urlChecks = [
    { pattern: /firebaseio\.com|firestore\.googleapis\.com|firebase\.google\.com/, db: "Firebase / Firestore", cloud: "Google Cloud", confidence: "high" },
    { pattern: /\.supabase\.co|supabase\.in/, db: "PostgreSQL", cloud: "Supabase", confidence: "high" },
    { pattern: /\.neon\.tech/, db: "PostgreSQL", cloud: "Neon", confidence: "high" },
    { pattern: /psdb\.cloud|planetscale\.com/, db: "MySQL (PlanetScale)", cloud: "PlanetScale", confidence: "high" },
    { pattern: /cockroachlabs\.cloud|cockroachdb\.com/, db: "CockroachDB (PostgreSQL-compat)", cloud: "CockroachDB", confidence: "high" },
    { pattern: /upstash\.io/, db: "Redis", cloud: "Upstash", confidence: "high" },
    { pattern: /redislabs\.com/, db: "Redis", cloud: "Redis Cloud", confidence: "high" },
    { pattern: /astra\.datastax\.com/, db: "Cassandra", cloud: "DataStax Astra", confidence: "high" },
    { pattern: /dynamodb\.|\.amazonaws\.com.*dynamodb/, db: "DynamoDB", cloud: "AWS", confidence: "high" },
    { pattern: /rds\.amazonaws\.com/, db: "MySQL / PostgreSQL / SQL Server (RDS)", cloud: "AWS RDS", confidence: "high" },
    { pattern: /mongo\.net|mongodb\.net|atlas\.mongodb\.com/, db: "MongoDB Atlas", cloud: "MongoDB Atlas", confidence: "high" },
    { pattern: /elastic\.co|\.es\.io|elasticsearch/, db: "Elasticsearch", cloud: "Elastic Cloud", confidence: "high" },
    { pattern: /influxdata\.com|influxdb/, db: "InfluxDB", confidence: "high" },
    { pattern: /tidbcloud\.com/, db: "TiDB (MySQL-compat)", cloud: "TiDB Cloud", confidence: "high" },
    { pattern: /turso\.io|\.turso\.tech/, db: "SQLite (libSQL/Turso)", cloud: "Turso", confidence: "high" },
    { pattern: /xata\.io/, db: "PostgreSQL", cloud: "Xata", confidence: "high" },
    { pattern: /convex\.cloud/, db: "Convex (document DB)", cloud: "Convex", confidence: "high" },
    { pattern: /appwrite\.io/, db: "Appwrite (document DB)", cloud: "Appwrite", confidence: "high" },
    { pattern: /pocketbase\.io/, db: "SQLite (PocketBase)", confidence: "high" },
    { pattern: /hasura\.app|hasura\.io/, db: "PostgreSQL (via Hasura)", confidence: "high" },
    { pattern: /fauna\.com|db\.fauna\.com/, db: "FaunaDB", cloud: "Fauna", confidence: "high" },
    { pattern: /dgraph\.io/, db: "Dgraph (GraphDB)", confidence: "high" },
    { pattern: /\/graphql($|\/)/, apiStyle: "GraphQL" },
    { pattern: /\/_api\/|\/api\/odata/, apiStyle: "OData (likely MSSQL/Azure)" },
    { pattern: /\/rest\/v\d|\/api\/v\d/, apiStyle: "REST" },
    { pattern: /\/trpc\//, apiStyle: "tRPC" },
    { pattern: /\/jsonrpc/, apiStyle: "JSON-RPC" },
  ];

  for (const check of urlChecks) {
    if (check.pattern.test(url) || check.pattern.test(domain)) {
      if (check.db && !result.databases.includes(check.db)) result.databases.push(check.db);
      if (check.cloud) result.cloud = check.cloud;
      if (check.apiStyle) result.apiStyle = check.apiStyle;
      if (check.confidence === "high") result.confidence = "high";
      result.evidence.push("URL match: " + check.pattern.source.slice(0, 60));
    }
  }

  // ── Response header fingerprinting ───────────────────────────────────────
  const headerChecks = [
    { header: "x-powered-by", patterns: [
      { re: /express/i, framework: "Express.js (Node.js)" },
      { re: /next\.js/i, framework: "Next.js" },
      { re: /php/i, framework: "PHP" },
      { re: /asp\.net/i, framework: "ASP.NET" },
      { re: /django/i, framework: "Django (Python)" },
      { re: /rails/i, framework: "Ruby on Rails" },
    ]},
    { header: "server", patterns: [
      { re: /nginx/i, framework: "Nginx" },
      { re: /apache/i, framework: "Apache" },
      { re: /caddy/i, framework: "Caddy" },
      { re: /cloudflare/i, cloud: "Cloudflare" },
      { re: /vercel/i, cloud: "Vercel" },
      { re: /netlify/i, cloud: "Netlify" },
      { re: /heroku/i, cloud: "Heroku" },
    ]},
    { header: "x-vercel-id", exact: true, cloud: "Vercel" },
    { header: "x-amzn-requestid", exact: true, cloud: "AWS" },
    { header: "x-cloud-trace-context", exact: true, cloud: "Google Cloud" },
    { header: "x-ms-request-id", exact: true, cloud: "Azure" },
    { header: "cf-ray", exact: true, cloud: "Cloudflare" },
    { header: "x-hasura-role", exact: true, db: "PostgreSQL (via Hasura)" },
    { header: "x-supabase-api-version", exact: true, db: "PostgreSQL", cloud: "Supabase" },
  ];

  for (const hc of headerChecks) {
    const val = headers[hc.header];
    if (!val) continue;
    if (hc.exact) {
      if (hc.db && !result.databases.includes(hc.db)) result.databases.push(hc.db);
      if (hc.cloud) result.cloud = hc.cloud;
      result.confidence = "high";
      result.evidence.push("Header: " + hc.header);
    } else {
      for (const p of hc.patterns || []) {
        if (p.re.test(val)) {
          if (p.framework) result.framework = p.framework;
          if (p.cloud) result.cloud = p.cloud;
          if (p.db && !result.databases.includes(p.db)) result.databases.push(p.db);
          result.confidence = "high";
          result.evidence.push("Header " + hc.header + ": " + val.slice(0, 40));
        }
      }
    }
  }

  // ── Response body fingerprinting ─────────────────────────────────────────
  if (body) {
    const bodyChecks = [
      { pattern: /postgresql|pg_|psql/, db: "PostgreSQL" },
      { pattern: /mysql|mariadb/, db: "MySQL" },
      { pattern: /sqlite/, db: "SQLite" },
      { pattern: /mongodb|bson/, db: "MongoDB" },
      { pattern: /redis|rediserror|wrongtype operation/, db: "Redis" },
      { pattern: /ora-\d{5}|oracle/, db: "Oracle" },
      { pattern: /mssql|sqlserver|sql server/, db: "SQL Server" },
      { pattern: /cassandra|cql/, db: "Cassandra" },
      { pattern: /dynamodb/, db: "DynamoDB" },
    ];
    const ormChecks = [
      { pattern: /sequelize/, orm: "Sequelize" },
      { pattern: /typeorm|typeormerror/, orm: "TypeORM" },
      { pattern: /prisma/, orm: "Prisma" },
      { pattern: /mongoose/, orm: "Mongoose" },
      { pattern: /sqlalchemy/, orm: "SQLAlchemy" },
      { pattern: /hibernate/, orm: "Hibernate" },
      { pattern: /active.?record/, orm: "ActiveRecord" },
    ];

    for (const bc of bodyChecks) {
      if (bc.pattern.test(body)) {
        if (!result.databases.includes(bc.db)) result.databases.push(bc.db);
        result.confidence = "high";
        result.evidence.push("Body pattern: " + bc.db);
      }
    }
    for (const oc of ormChecks) {
      if (oc.pattern.test(body)) {
        result.orm = oc.orm;
        result.evidence.push("ORM: " + oc.orm);
      }
    }

    const connStringPatterns = [
      { re: /postgres:\/\/|postgresql:\/\//, db: "PostgreSQL", severity: "postgres connection string leaked" },
      { re: /mysql:\/\//, db: "MySQL", severity: "mysql connection string leaked" },
      { re: /mongodb(\+srv)?:\/\//, db: "MongoDB", severity: "mongodb connection string leaked" },
      { re: /redis:\/\//, db: "Redis", severity: "redis connection string leaked" },
    ];
    for (const cp of connStringPatterns) {
      if (cp.re.test(body)) {
        if (!result.databases.includes(cp.db)) result.databases.push(cp.db);
        result.confidence = "high";
        result.evidence.push("⚠ " + cp.severity);
      }
    }
  }

  if (result.databases.length > 0 || result.framework || result.cloud) {
    if (result.confidence === "low") result.confidence = "medium";
  }

  if (result.databases.length === 0 && !result.framework && !result.cloud && !result.apiStyle) {
    return null;
  }

  return result;
}

function stackLabel(stack) {
  if (!stack) return null;
  const parts = [];
  if (stack.databases.length) parts.push(stack.databases[0]);
  if (stack.orm) parts.push(stack.orm);
  if (stack.framework) parts.push(stack.framework);
  if (stack.cloud) parts.push(stack.cloud);
  return parts.join(" · ") || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN BACKGROUND LOGIC
// ══════════════════════════════════════════════════════════════════════════════

const MAX_ENTRIES = 3000;
const STORAGE_KEY = "lp_captures";
const MITM_STORAGE_KEY = "lp_mitm_rules";

// ── In-memory ring buffer ─────────────────────────────────────────────────────
let captures = [];
let idCounter = 0;
let mitmRules = [];

// ── MITM intercept queue: requests held for user inspection/editing ───────────
// Each entry: { queueId, url, method, requestBody, requestHeaders, timestamp, tabId }
let mitmPendingQueue = [];
let mitmQueueIdCounter = 1;

// ── Cache Storage entries collected from content scripts ──────────────────────
let cacheStorageEntries = [];

// Requests that matched an intercept rule in onBeforeRequest and are awaiting
// onBeforeSendHeaders (so we can capture headers before cancelling).
const interceptAwaitingHeaders = new Map(); // requestId → partial info

chrome.storage.local.get([STORAGE_KEY, MITM_STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) {
    captures = result[STORAGE_KEY];
    idCounter = captures.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
  }
  if (result[MITM_STORAGE_KEY]) {
    mitmRules = result[MITM_STORAGE_KEY];
  }
  // Register blocking listener only if saved rules already have active intercepts
  syncInterceptListener();
});

// Debounced save — writes to storage at most once every 3 seconds.
// Previously every single capture triggered a full serialise+write of up
// to 3 000 objects; on busy pages this saturated the storage API.
let _saveTimer = null;
function save() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    chrome.storage.local.set({ [STORAGE_KEY]: captures.slice(-MAX_ENTRIES) });
  }, 3000);
}

function saveMitmRules() {
  chrome.storage.local.set({ [MITM_STORAGE_KEY]: mitmRules });
}

// ── Resource type → captureType mapping ──────────────────────────────────────
// Properly categorises webRequest entries so XHR/Fetch tabs get correct counts.
function resourceTypeToCapture(type) {
  if (type === "xmlhttprequest") return "xhr";
  if (type === "fetch")          return "fetch";
  // websocket connections are captured by content-script; skip here to avoid dups
  if (type === "websocket")      return null;
  // main_frame, sub_frame, script, image, stylesheet, font, object, media, other → http
  return "http";
}

// ── MITM rule matching ────────────────────────────────────────────────────────
function checkMitmRules(url) {
  for (const rule of mitmRules) {
    if (!rule.enabled) continue;
    let matched = false;
    try {
      if (rule.isRegex) {
        matched = new RegExp(rule.pattern, "i").test(url);
      } else {
        matched = url.toLowerCase().includes(rule.pattern.toLowerCase());
      }
    } catch {}
    if (matched) {
      return { id: rule.id, pattern: rule.pattern, action: rule.action, name: rule.name || rule.pattern };
    }
  }
  return null;
}

function addCapture(entry) {
  if (entry.captureType === "http" || entry.captureType === "fetch" || entry.captureType === "xhr") {
    const stack = detectStack(entry);
    if (stack) {
      entry.stackInfo = stack;
      entry.stackLabel = stackLabel(stack);
    }
  }

  const matchedRule = checkMitmRules(entry.url || entry.src || "");
  if (matchedRule && matchedRule.action !== "intercept") {
    entry.mitmRule = matchedRule;
    chrome.runtime.sendMessage({ type: "NEW_MITM_MATCH", entry, rule: matchedRule }, () => { void chrome.runtime.lastError; });
  }

  entry.id = idCounter++;
  captures.push(entry);
  if (captures.length > MAX_ENTRIES) captures.shift();
  save();
  chrome.runtime.sendMessage({ type: "NEW_CAPTURE", entry }, () => { void chrome.runtime.lastError; });
}

// ══════════════════════════════════════════════════════════════════════════════
// webRequest: HTTP/HTTPS observation + optional intercept
//
// Performance design:
//   onBeforeRequest  — NEVER blocking. Requests flow freely at full speed.
//                      Just records state; no round-trip delay per request.
//   onBeforeSendHeaders — blocking, but ONLY registered when at least one
//                      "intercept" rule is enabled. Dynamically added/removed
//                      by syncInterceptListener() whenever rules change.
//
// This means normal browsing (no intercept rules) has zero blocking overhead.
// ══════════════════════════════════════════════════════════════════════════════
const pendingRequests = new Map();
let interceptListenerActive = false;
let interceptBodyListenerActive = false;
// Stores rawBody keyed by requestId for in-flight intercepted requests only.
// Populated by _interceptBodyCapture; consumed and deleted by _interceptBeforeSendHeaders.
const interceptBodyMap = new Map();

// ── Observation listener — always registered, never blocking ─────────────────
// No "requestBody" extra: omitting it prevents Chrome from copying POST/PUT
// body bytes from the network process to the extension process on every request.
// Request bodies for XHR/fetch are still captured by injected.js in the page.
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const captureType = resourceTypeToCapture(details.type);
    if (!captureType) return; // websocket — content script handles it

    // If an intercept rule matches, stash info so the blocking
    // onBeforeSendHeaders listener (when active) can cancel it with headers.
    const interceptRule = mitmRules.find((r) => {
      if (!r.enabled || r.action !== "intercept") return false;
      try {
        return r.isRegex
          ? new RegExp(r.pattern, "i").test(details.url)
          : details.url.toLowerCase().includes(r.pattern.toLowerCase());
      } catch { return false; }
    });

    if (interceptRule) {
      interceptAwaitingHeaders.set(details.requestId, {
        interceptRule,
        url: details.url,
        method: details.method,
        captureType,
        tabId: details.tabId,
        timestamp: Date.now(),
      });
      // Don't add to pendingRequests — this request will be cancelled next stage
      return;
    }

    // Normal observation tracking
    pendingRequests.set(details.requestId, {
      captureType,
      id: null,
      requestId: details.requestId,
      tabId: details.tabId,
      url: details.url,
      domain: extractDomain(details.url),
      method: details.method,
      type: details.type,
      initiator: details.initiator || "unknown",
      timestamp: Date.now(),
      status: "pending",
      statusCode: null,
      requestBody: null,   // bodies captured by injected.js XHR/fetch hooks instead
      responseSize: null,
      duration: null,
    });
  },
  { urls: ["*://*/*"] }
  // ↑ No extras array at all — zero body-copy overhead, zero blocking
);

// ── Body-capture listener — only active when intercept rules are enabled ──────
// Registered with ["requestBody"] extra so Chrome provides request payloads.
// Intentionally does NOT depend on interceptAwaitingHeaders — Chrome does not
// guarantee which onBeforeRequest listener fires first when one has extras and
// one does not, so we evaluate intercept rules here independently.
function _interceptBodyCapture(details) {
  // Only bother decoding if this URL actually matches an intercept rule
  const matches = mitmRules.some(function (r) {
    if (!r.enabled || r.action !== "intercept") return false;
    try {
      return r.isRegex
        ? new RegExp(r.pattern, "i").test(details.url)
        : details.url.toLowerCase().includes(r.pattern.toLowerCase());
    } catch (e) { return false; }
  });
  if (!matches) return;

  const raw = details.requestBody;
  if (!raw) return;

  let bodyText = null;
  if (raw.raw && raw.raw.length > 0) {
    try {
      // Concatenate raw ArrayBuffer chunks → UTF-8 string
      const totalLen = raw.raw.reduce(function (s, c) { return s + (c.bytes ? c.bytes.byteLength : 0); }, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (let i = 0; i < raw.raw.length; i++) {
        const chunk = raw.raw[i];
        if (chunk.bytes) {
          combined.set(new Uint8Array(chunk.bytes), offset);
          offset += chunk.bytes.byteLength;
        }
      }
      bodyText = new TextDecoder("utf-8", { fatal: false }).decode(combined);
    } catch (e) { bodyText = null; }
  } else if (raw.formData) {
    // application/x-www-form-urlencoded style
    const parts = [];
    const keys = Object.keys(raw.formData);
    for (let i = 0; i < keys.length; i++) {
      const vals = raw.formData[keys[i]];
      for (let j = 0; j < vals.length; j++) {
        parts.push(encodeURIComponent(keys[i]) + "=" + encodeURIComponent(vals[j]));
      }
    }
    bodyText = parts.join("&");
  }

  if (bodyText !== null) interceptBodyMap.set(details.requestId, bodyText);
}

// ── Intercept listener — blocking, dynamically added/removed ─────────────────
// Named function so removeListener works (anonymous functions can't be removed).
function _interceptBeforeSendHeaders(details) {
  if (!interceptAwaitingHeaders.has(details.requestId)) return {};

  const info = interceptAwaitingHeaders.get(details.requestId);
  // Read body BEFORE deleting map entries (order matters)
  const rawBody = interceptBodyMap.get(details.requestId) || null;
  interceptAwaitingHeaders.delete(details.requestId);
  interceptBodyMap.delete(details.requestId);

  const requestHeaders = {};
  for (const h of details.requestHeaders || []) {
    requestHeaders[h.name.toLowerCase()] = h.value;
  }

  const queueId = mitmQueueIdCounter++;
  const pending = {
    queueId,
    ruleId: info.interceptRule.id,
    ruleName: info.interceptRule.name || info.interceptRule.pattern,
    url: info.url,
    method: info.method,
    requestBody: rawBody,
    requestHeaders,
    timestamp: info.timestamp,
    tabId: info.tabId,
    captureType: info.captureType,
  };
  mitmPendingQueue.push(pending);

  setTimeout(() => {
    chrome.runtime.sendMessage(
      { type: "NEW_MITM_INTERCEPT", pending },
      () => { void chrome.runtime.lastError; }
    );
  }, 0);

  return { cancel: true };
}

// Call this whenever mitmRules changes to add or remove the blocking listeners.
function syncInterceptListener() {
  const needsBlocking = mitmRules.some((r) => r.enabled && r.action === "intercept");

  if (needsBlocking && !interceptListenerActive) {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      _interceptBeforeSendHeaders,
      { urls: ["*://*/*"] },
      ["blocking", "requestHeaders"]
    );
    interceptListenerActive = true;
  } else if (!needsBlocking && interceptListenerActive) {
    chrome.webRequest.onBeforeSendHeaders.removeListener(_interceptBeforeSendHeaders);
    interceptListenerActive = false;
    interceptAwaitingHeaders.clear(); // discard any stale pending intercepts
  }

  // Body-capture listener: separate registration so "requestBody" extra only
  // applies when intercept rules are active (keeps overhead off normal traffic).
  if (needsBlocking && !interceptBodyListenerActive) {
    chrome.webRequest.onBeforeRequest.addListener(
      _interceptBodyCapture,
      { urls: ["*://*/*"] },
      ["requestBody"]
    );
    interceptBodyListenerActive = true;
  } else if (!needsBlocking && interceptBodyListenerActive) {
    chrome.webRequest.onBeforeRequest.removeListener(_interceptBodyCapture);
    interceptBodyListenerActive = false;
    interceptBodyMap.clear();
  }
}

// ── Server-side cache header parser ──────────────────────────────────────────
// Runs once at capture time; result stored on the capture as `serverCacheInfo`.
function parseServerCacheInfo(headersObj) {
  // Normalise header names to lowercase
  const h = {};
  for (const [k, v] of Object.entries(headersObj || {})) h[k.toLowerCase()] = v;

  // ── Server-Timing parser (RFC 7230 quote-aware) ───────────────────────────
  // Splits on commas that are NOT inside double-quoted strings, handles
  // semicolons inside quoted desc values correctly.
  function parseServerTiming(raw) {
    if (!raw) return [];

    // Tokenise respecting quoted strings: collect top-level comma-separated entries
    function splitTopLevel(str, sep) {
      const parts = [];
      let cur = "", depth = 0, inQ = false;
      for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === "\\" && inQ) { cur += ch + (str[++i] || ""); continue; }
        if (ch === '"') { inQ = !inQ; cur += ch; continue; }
        if (!inQ && ch === sep) { parts.push(cur); cur = ""; continue; }
        cur += ch;
      }
      if (cur) parts.push(cur);
      return parts;
    }

    return splitTopLevel(raw, ",").map((entry) => {
      const segs = splitTopLevel(entry.trim(), ";");
      const name = segs[0].trim();
      if (!name) return null;
      const obj = { name };
      for (let i = 1; i < segs.length; i++) {
        const eq = segs[i].indexOf("=");
        if (eq === -1) continue;
        const key = segs[i].slice(0, eq).toLowerCase().trim();
        const val = segs[i].slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
        if (key === "dur")  obj.dur  = parseFloat(val);
        if (key === "desc") obj.desc = val;
      }
      return obj;
    }).filter(Boolean);
  }

  const info = {
    layers: [],          // detected cache layers in order (CDN → Proxy → RAM → App → Origin)
    cdnProvider: null,
    cdnStatus:   null,   // HIT / MISS / BYPASS / STALE / EXPIRED / DYNAMIC / REVALIDATED
    proxyName:   null,
    proxyStatus: null,
    ramName:     null,
    ramStatus:   null,
    age:         null,   // seconds item has been cached
    ttl:         null,   // max-age from Cache-Control
    cacheControl: h["cache-control"] || null,
    pragma:       h["pragma"]        || null,
    etag:         h["etag"]          || null,
    lastModified: h["last-modified"] || null,
    expires:      h["expires"]       || null,
    via:          h["via"]           || null,
    xCache:       h["x-cache"]       || null,
    serverTiming: parseServerTiming(h["server-timing"]),
  };

  // Age — preserve null for absent/malformed values; don't conflate with 0
  if (h["age"] !== undefined) {
    const parsed = parseInt(h["age"], 10);
    info.age = isNaN(parsed) ? null : parsed;
  }

  // TTL from Cache-Control max-age / s-maxage — case-insensitive matching
  const ccStr = (h["cache-control"] || "").toLowerCase();
  const smatch = ccStr.match(/s-maxage=(\d+)/);
  const mmatch = ccStr.match(/(?:^|[, ])max-age=(\d+)/);
  // Preserve 0 explicitly (means "no caching" — should render as 0% fresh, not be ignored)
  if (smatch) {
    info.ttl = parseInt(smatch[1], 10);
  } else if (mmatch) {
    info.ttl = parseInt(mmatch[1], 10);
  }

  // ── CDN detection (first match wins) ─────────────────────────────────────
  if (h["cf-cache-status"]) {
    info.cdnProvider = "Cloudflare";
    info.cdnStatus   = h["cf-cache-status"];
    info.layers.push({ type: "cdn", name: "Cloudflare",
      status: info.cdnStatus, extra: h["cf-ray"] || null });
  } else if (h["x-amz-cf-id"] || h["x-amz-cf-pop"] ||
             (h["x-cache"] && (h["x-amz-request-id"] || h["x-amz-id-2"]))) {
    info.cdnProvider = "CloudFront";
    const raw = (h["x-cache"] || "").toUpperCase();
    info.cdnStatus = raw.includes("HIT") ? "HIT" : raw.includes("MISS") ? "MISS" : (h["x-cache"] || "UNKNOWN");
    info.layers.push({ type: "cdn", name: "CloudFront",
      status: info.cdnStatus, extra: h["x-amz-cf-pop"] || h["x-amz-cf-id"] || null });
  } else if (h["x-served-by"] && h["x-timer"]) {
    info.cdnProvider = "Fastly";
    const raw = (h["x-cache"] || "").toUpperCase();
    info.cdnStatus = raw.includes("HIT") ? "HIT" : raw.includes("MISS") ? "MISS" : (h["x-cache"] || "UNKNOWN");
    info.layers.push({ type: "cdn", name: "Fastly",
      status: info.cdnStatus,
      extra: h["x-served-by"] || null,
      hits:  h["x-cache-hits"] ? parseInt(h["x-cache-hits"], 10) : null });
  } else if (h["x-check-cacheable"] || (h["via"] && h["via"].toLowerCase().includes("akamai"))) {
    info.cdnProvider = "Akamai";
    info.cdnStatus   = h["x-cache-status"] || h["x-check-cacheable"] || "UNKNOWN";
    info.layers.push({ type: "cdn", name: "Akamai", status: info.cdnStatus, extra: null });
  } else if (h["x-vercel-cache"] || h["x-vercel-id"]) {
    info.cdnProvider = "Vercel Edge";
    info.cdnStatus   = h["x-vercel-cache"] || "UNKNOWN";
    info.layers.push({ type: "cdn", name: "Vercel Edge",
      status: info.cdnStatus, extra: h["x-vercel-id"] || null });
  } else if (h["x-nf-request-id"] || h["netlify-cdn-cache-control"]) {
    info.cdnProvider = "Netlify";
    const raw = (h["x-cache"] || h["netlify-cdn-cache-control"] || "").toUpperCase();
    info.cdnStatus = raw.includes("HIT") ? "HIT" : raw.includes("MISS") ? "MISS" : "UNKNOWN";
    info.layers.push({ type: "cdn", name: "Netlify", status: info.cdnStatus, extra: null });
  } else if (h["x-bunny-id"] || h["cdn-pullzone"] || h["bunny-request-id"]) {
    info.cdnProvider = "BunnyCDN";
    info.cdnStatus   = h["x-cache"] || "UNKNOWN";
    info.layers.push({ type: "cdn", name: "BunnyCDN", status: info.cdnStatus, extra: null });
  } else if (h["x-cache-status"] && !h["cf-cache-status"] && !h["x-varnish"]) {
    // Nginx proxy_cache / CDN edge — only classify when value is a canonical cache directive
    const raw = (h["x-cache-status"] || "").toUpperCase();
    const CANONICAL = new Set(["HIT", "MISS", "BYPASS", "STALE", "UPDATING", "EXPIRED"]);
    if (CANONICAL.has(raw)) {
      // Require a corroborating signal before labelling as CDN vs. simple proxy
      const isCdn = !!(h["via"] || h["age"] !== undefined || h["x-cache-hits"]);
      const label = isCdn
        ? (h["server"] ? h["server"].split("/")[0] + " CDN" : "Edge Cache")
        : "Nginx proxy_cache";
      const layerType = isCdn ? "cdn" : "proxy";
      info.cdnProvider = isCdn ? label : null;
      info.cdnStatus   = isCdn ? raw   : null;
      if (!isCdn) { info.proxyName = label; info.proxyStatus = raw; }
      info.layers.push({ type: layerType, name: label, status: raw, extra: null });
    }
  } else if (h["x-cache"] && !h["x-varnish"]) {
    // Generic X-Cache — only emit a layer when a corroborating CDN/proxy signal is present
    // to reduce false-positive noise from app-level custom headers.
    const hasCorroboration = !!(h["via"] || h["age"] !== undefined || h["x-cache-hits"] ||
                                h["x-served-by"] || h["x-amz-cf-id"]);
    if (hasCorroboration) {
      const raw = (h["x-cache"] || "").toUpperCase();
      const st  = raw.includes("HIT") ? "HIT" : raw.includes("MISS") ? "MISS" : h["x-cache"];
      info.cdnStatus = st;
      info.layers.push({ type: "cdn", name: "Cache Proxy", status: st, extra: null });
    }
  }

  // ── Reverse proxy cache detection ─────────────────────────────────────────
  if (h["x-varnish"] || (h["via"] && h["via"].toLowerCase().includes("varnish"))) {
    info.proxyName   = "Varnish";
    info.proxyStatus = h["x-cache"] || (info.age && info.age > 0 ? "HIT" : "MISS");
    info.layers.push({ type: "proxy", name: "Varnish",
      status: info.proxyStatus, extra: h["x-varnish"] || null });
  } else if ((h["via"] && h["via"].toLowerCase().includes("squid")) || h["x-squid-cache"]) {
    info.proxyName   = "Squid";
    info.proxyStatus = h["x-squid-cache"] || "UNKNOWN";
    info.layers.push({ type: "proxy", name: "Squid", status: info.proxyStatus, extra: null });
  } else if (h["x-cache"] && h["x-cache-detail"]) {
    info.proxyName   = "Apache mod_cache";
    info.proxyStatus = h["x-cache"];
    info.layers.push({ type: "proxy", name: "Apache mod_cache",
      status: info.proxyStatus, extra: h["x-cache-detail"] || null });
  } else if (!info.cdnProvider && h["via"] && h["via"].includes("1.1")) {
    // Generic reverse proxy via HTTP/1.1
    const viaParts = h["via"].split(",").map((s) => s.trim());
    for (const vp of viaParts) {
      if (vp.includes("1.1")) {
        const name = vp.replace(/^1\.1\s+/, "").split(" ")[0] || "HTTP Proxy";
        info.proxyName = name;
        info.proxyStatus = info.age && info.age > 0 ? "HIT" : "PASS";
        info.layers.push({ type: "proxy", name: name, status: info.proxyStatus, extra: h["via"] });
        break;
      }
    }
  }

  // ── LiteSpeed (server-level cache, sits between proxy and app) ────────────
  const ls = h["x-litespeed-cache"] || h["x-lscache"];
  if (ls) {
    info.layers.push({ type: "proxy", name: "LiteSpeed Cache",
      status: ls.toUpperCase().includes("HIT") ? "HIT" : ls, extra: h["x-litespeed-tag"] || null });
  }

  // ── RAM cache detection ───────────────────────────────────────────────────
  // Explicit header markers from popular frameworks
  if (h["x-redis-cache"] || h["x-redis-hit"] || h["x-redis-status"]) {
    info.ramName   = "Redis";
    info.ramStatus = h["x-redis-cache"] || h["x-redis-hit"] || h["x-redis-status"] || "HIT";
    info.layers.push({ type: "ram", name: "Redis", status: info.ramStatus, extra: null });
  } else if (h["x-memcache-hit"] || h["x-memcached"] || h["x-memcache-status"]) {
    info.ramName   = "Memcached";
    info.ramStatus = h["x-memcache-hit"] || h["x-memcached"] || "HIT";
    info.layers.push({ type: "ram", name: "Memcached", status: info.ramStatus, extra: null });
  } else if (h["x-cache"] && /redis|memcache/i.test(h["x-cache"])) {
    const isRedis = /redis/i.test(h["x-cache"]);
    info.ramName   = isRedis ? "Redis" : "Memcached";
    info.ramStatus = /hit/i.test(h["x-cache"]) ? "HIT" : "MISS";
    info.layers.push({ type: "ram", name: info.ramName, status: info.ramStatus, extra: null });
  }
  // Server-Timing RAM cache detection (Redis/Memcached exposed via timing)
  for (const st of info.serverTiming) {
    const lname = st.name.toLowerCase();
    if (lname.includes("redis") || lname.includes("memcach") ||
        (lname.includes("cache") && !lname.includes("cdn"))) {
      if (!info.ramName) {
        const nm = lname.includes("redis") ? "Redis" : lname.includes("memcach") ? "Memcached" : st.name;
        const desc = (st.desc || "").toUpperCase();
        info.ramName   = nm;
        info.ramStatus = desc || (st.dur !== undefined ? st.dur + "ms" : "HIT");
        info.layers.push({ type: "ram", name: nm, status: info.ramStatus,
          extra: st.dur !== undefined ? st.dur + "ms" : null });
      }
    }
  }

  // ── Application-level cache ───────────────────────────────────────────────
  if (h["x-drupal-cache"] || h["x-drupal-dynamic-cache"]) {
    info.layers.push({ type: "app", name: "Drupal",
      status: h["x-drupal-cache"] || h["x-drupal-dynamic-cache"], extra: null });
  }
  if (h["x-wp-total"] && (h["x-cache"] || h["x-cache-enabled"])) {
    info.layers.push({ type: "app", name: "WordPress",
      status: h["x-cache"] || h["x-cache-enabled"] || "HIT", extra: null });
  }

  // ── Server-Timing entries not yet classified — expose them as-is ──────────
  const timingEntries = info.serverTiming.filter((st) => {
    const lname = st.name.toLowerCase();
    return !lname.includes("redis") && !lname.includes("memcach") &&
           !lname.includes("cache") && (st.dur !== undefined || st.desc);
  });
  if (timingEntries.length) {
    info.serverTimingExtra = timingEntries;
  }

  return info;
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const entry = pendingRequests.get(details.requestId);
    if (!entry) return;
    pendingRequests.delete(details.requestId);
    entry.statusCode = details.statusCode;
    entry.status = "completed";
    entry.duration = Date.now() - entry.timestamp;
    entry.responseHeaders = simplifyHeaders(details.responseHeaders || []);
    entry.responseSize = getContentLength(details.responseHeaders || []);
    entry.fromCache = details.fromCache || false;
    entry.serverCacheInfo = parseServerCacheInfo(entry.responseHeaders);
    addCapture(entry);
  },
  { urls: ["*://*/*"] },
  ["responseHeaders"]
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    // Always clean up intercept maps so errored requests don't leak memory
    interceptAwaitingHeaders.delete(details.requestId);
    interceptBodyMap.delete(details.requestId);

    const entry = pendingRequests.get(details.requestId);
    if (!entry) return;
    pendingRequests.delete(details.requestId);
    entry.status = "error";
    entry.error = details.error;
    entry.duration = Date.now() - entry.timestamp;
    addCapture(entry);
  },
  { urls: ["*://*/*"] }
);

// ── Messages from content scripts (WS, DOM, iframes, fetch/XHR with body) ────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Capture types from content script
  if (msg && msg.captureType) {
    const entry = {
      ...msg,
      id: null,
      tabId: sender.tab?.id,
      tabUrl: sender.tab?.url,
      frameId: sender.frameId,
      timestamp: msg.timestamp || Date.now(),
    };
    addCapture(entry);
    return;
  }

  // ── Popup queries ─────────────────────────────────────────────────────────
  if (msg.type === "GET_CAPTURES") {
    const { filter = {}, page = 0, pageSize = 100 } = msg;
    let filtered = [...captures].reverse();

    if (filter.captureType) filtered = filtered.filter((c) => c.captureType === filter.captureType);
    if (filter.stackOnly) filtered = filtered.filter((c) => c.stackInfo);
    if (filter.mitmOnly) filtered = filtered.filter((c) => c.mitmRule);
    if (filter.domain) {
      const q = filter.domain.toLowerCase();
      filtered = filtered.filter(
        (c) => (c.domain || "").toLowerCase().includes(q) || (c.url || "").toLowerCase().includes(q)
      );
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter((c) => JSON.stringify(c).toLowerCase().includes(q));
    }

    const total = filtered.length;
    sendResponse({ captures: filtered.slice(page * pageSize, (page + 1) * pageSize), total });
    return true;
  }

  if (msg.type === "CLEAR_CAPTURES") {
    captures = [];
    mitmPendingQueue = [];
    save();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "EXPORT_CAPTURES") {
    sendResponse({ data: JSON.stringify(captures, null, 2) });
    return true;
  }

  if (msg.type === "GET_STATS") {
    sendResponse(computeStats(captures));
    return true;
  }

  // ── MITM Rule management ──────────────────────────────────────────────────
  if (msg.type === "GET_MITM_RULES") {
    sendResponse({ rules: mitmRules });
    return true;
  }

  if (msg.type === "ADD_MITM_RULE") {
    const rule = {
      id: Date.now(),
      name: msg.rule.name || msg.rule.pattern,
      pattern: msg.rule.pattern,
      isRegex: !!msg.rule.isRegex,
      action: msg.rule.action || "highlight",
      enabled: true,
      matchCount: 0,
      createdAt: Date.now(),
    };
    mitmRules.push(rule);
    saveMitmRules();
    syncInterceptListener();
    sendResponse({ ok: true, rule });
    return true;
  }

  if (msg.type === "UPDATE_MITM_RULE") {
    const idx = mitmRules.findIndex((r) => r.id === msg.id);
    if (idx !== -1) {
      mitmRules[idx] = { ...mitmRules[idx], ...msg.updates };
      saveMitmRules();
      syncInterceptListener();
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "DELETE_MITM_RULE") {
    mitmRules = mitmRules.filter((r) => r.id !== msg.id);
    saveMitmRules();
    syncInterceptListener();
    sendResponse({ ok: true });
    return true;
  }

  // ── MITM Intercept queue management ──────────────────────────────────────
  if (msg.type === "GET_MITM_PENDING") {
    sendResponse({ queue: mitmPendingQueue });
    return true;
  }

  if (msg.type === "MITM_DROP") {
    mitmPendingQueue = mitmPendingQueue.filter((p) => p.queueId !== msg.queueId);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "MITM_FORWARD") {
    // Replay the (possibly user-modified) request.
    //
    // WHY TAB INJECTION instead of background fetch():
    //   fetch() from the extension background page goes out with
    //   Origin: chrome-extension://... which servers reject if their
    //   CORS policy only allows the original page's domain.
    //   Injecting into the original tab makes the request carry the
    //   page's own origin, passing CORS exactly as the original did.
    const { queueId, url, method, body, headers } = msg;
    const queueEntry = mitmPendingQueue.find((p) => p.queueId === queueId);
    mitmPendingQueue = mitmPendingQueue.filter((p) => p.queueId !== queueId);

    // Strip browser-managed forbidden headers — fetch() ignores/errors on them
    const FORBIDDEN_HEADERS = new Set([
      "content-length", "host", "transfer-encoding", "connection",
      "keep-alive", "proxy-connection", "te", "trailer", "upgrade",
    ]);
    const safeHeaders = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (!FORBIDDEN_HEADERS.has(k.toLowerCase())) safeHeaders[k] = v;
    }

    // Auto-detect Content-Type when the user added/edited a body but didn't
    // set one — prevents the browser from defaulting to text/plain and then
    // failing CORS preflight on servers that only allow application/json.
    const bodyStr = (body && method !== "GET" && method !== "HEAD") ? body : null;
    if (bodyStr && !Object.keys(safeHeaders).some((k) => k.toLowerCase() === "content-type")) {
      const trimmed = bodyStr.trimStart();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        safeHeaders["content-type"] = "application/json";
      } else if (/^[\w%+.-]+=/.test(trimmed)) {
        safeHeaders["content-type"] = "application/x-www-form-urlencoded";
      } else {
        safeHeaders["content-type"] = "text/plain;charset=UTF-8";
      }
    }

    // credentials: "same-origin" keeps cookies for same-origin API calls
    // (most common case) while avoiding the extra CORS requirement that
    // "include" imposes on cross-origin requests:
    //   With "include" the server must return Access-Control-Allow-Credentials:true
    //   in its preflight, which many APIs don't — causing the body-carrying
    //   request to fail even when the origin is allowed.
    const fetchInit = { method: method || "GET", headers: safeHeaders, credentials: "same-origin" };
    if (bodyStr) fetchInit.body = bodyStr;

    const tabId = queueEntry?.tabId;

    if (tabId && tabId >= 0) {
      // ── Preferred path: run fetch inside the original tab ─────────────────
      // A unique token correlates the injected script's reply back to this
      // sendResponse call without any shared mutable state.
      const token = `__lp_fwd_${queueId}_${Date.now()}`;

      // Register a one-time listener BEFORE injecting so no race is possible.
      let timeoutHandle;
      const resultListener = (resultMsg) => {
        if (!resultMsg || resultMsg.__lpToken !== token) return;
        clearTimeout(timeoutHandle);
        chrome.runtime.onMessage.removeListener(resultListener);
        sendResponse(resultMsg.payload);
        return true;
      };
      chrome.runtime.onMessage.addListener(resultListener);

      // Safety: clean up if the tab never replies (closed, crashed, etc.)
      timeoutHandle = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(resultListener);
        sendResponse({ ok: false, error: "Forward timed out (tab did not respond within 30 s)" });
      }, 30000);

      // Build the script as a plain string — JSON.stringify handles escaping.
      const code = [
        "(async function(){",
        "  const _u=" + JSON.stringify(url) + ";",
        "  const _i=" + JSON.stringify(fetchInit) + ";",
        "  const _t=" + JSON.stringify(token) + ";",
        "  try {",
        "    const r = await fetch(_u, _i);",
        "    const rh = {};",
        "    r.headers.forEach(function(v,k){ rh[k]=v; });",
        "    let rb = '';",
        "    try { rb = await r.text(); } catch(e) {}",
        "    chrome.runtime.sendMessage({",
        "      __lpToken: _t,",
        "      payload: { ok:true, status:r.status, statusText:r.statusText,",
        "                 headers:rh, body:rb.slice(0,8192), truncated:rb.length>8192 }",
        "    }, function(){ void chrome.runtime.lastError; });",
        "  } catch(err) {",
        "    chrome.runtime.sendMessage({",
        "      __lpToken: _t,",
        "      payload: { ok:false, error: String(err) }",
        "    }, function(){ void chrome.runtime.lastError; });",
        "  }",
        "})();",
      ].join("\n");

      chrome.tabs.executeScript(tabId, { code }, () => {
        if (chrome.runtime.lastError) {
          // Tab gone or restricted page — fall back to background fetch
          clearTimeout(timeoutHandle);
          chrome.runtime.onMessage.removeListener(resultListener);
          _bgFetch(url, fetchInit, sendResponse);
        }
      });

    } else {
      // No valid tab ID — send directly from background (CORS may or may not pass)
      _bgFetch(url, fetchInit, sendResponse);
    }

    return true; // keep channel open for async sendResponse
  }

  // ── Repeater ─────────────────────────────────────────────────────────────────
  // Free-form request builder — fires any hand-crafted request and returns the
  // full response.  Same tab-injection approach as MITM_FORWARD so the request
  // carries the page's own origin and cookies.
  if (msg.type === "REPEATER_SEND") {
    const { url, method, body, headers, tabId } = msg;

    const FORBIDDEN_HEADERS = new Set([
      "content-length", "host", "transfer-encoding", "connection",
      "keep-alive", "proxy-connection", "te", "trailer", "upgrade",
    ]);
    const safeHeaders = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (!FORBIDDEN_HEADERS.has(k.toLowerCase())) safeHeaders[k] = v;
    }

    const bodyStr = (body && method !== "GET" && method !== "HEAD") ? body : null;
    if (bodyStr && !Object.keys(safeHeaders).some((k) => k.toLowerCase() === "content-type")) {
      const trimmed = bodyStr.trimStart();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        safeHeaders["content-type"] = "application/json";
      } else if (/^[\w%+.-]+=/.test(trimmed)) {
        safeHeaders["content-type"] = "application/x-www-form-urlencoded";
      } else {
        safeHeaders["content-type"] = "text/plain;charset=UTF-8";
      }
    }

    const fetchInit = { method: method || "GET", headers: safeHeaders, credentials: "same-origin" };
    if (bodyStr) fetchInit.body = bodyStr;

    if (tabId && tabId >= 0) {
      const token = "__lp_rpt_" + Date.now();
      let rptTimeout;
      const rptListener = (resultMsg) => {
        if (!resultMsg || resultMsg.__lpToken !== token) return;
        clearTimeout(rptTimeout);
        chrome.runtime.onMessage.removeListener(rptListener);
        sendResponse(resultMsg.payload);
        return true;
      };
      chrome.runtime.onMessage.addListener(rptListener);
      rptTimeout = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(rptListener);
        sendResponse({ ok: false, error: "Repeater request timed out (30 s)" });
      }, 30000);

      const code = [
        "(async function(){",
        "  const _u=" + JSON.stringify(url) + ";",
        "  const _i=" + JSON.stringify(fetchInit) + ";",
        "  const _t=" + JSON.stringify(token) + ";",
        "  try {",
        "    const r = await fetch(_u, _i);",
        "    const rh = {};",
        "    r.headers.forEach(function(v,k){ rh[k]=v; });",
        "    var rb = '';",
        "    try { rb = await r.text(); } catch(e) {}",
        "    chrome.runtime.sendMessage({",
        "      __lpToken: _t,",
        "      payload: { ok:true, status:r.status, statusText:r.statusText,",
        "                 headers:rh, body:rb.slice(0,8192), truncated:rb.length>8192 }",
        "    }, function(){ void chrome.runtime.lastError; });",
        "  } catch(err) {",
        "    chrome.runtime.sendMessage({",
        "      __lpToken: _t,",
        "      payload: { ok:false, error:String(err) }",
        "    }, function(){ void chrome.runtime.lastError; });",
        "  }",
        "})();",
      ].join("\n");

      chrome.tabs.executeScript(tabId, { code }, () => {
        if (chrome.runtime.lastError) {
          clearTimeout(rptTimeout);
          chrome.runtime.onMessage.removeListener(rptListener);
          _bgFetch(url, fetchInit, sendResponse);
        }
      });
    } else {
      // No tab context — send from background (user hasn't loaded via "Send to Repeater")
      _bgFetch(url, fetchInit, sendResponse);
    }

    return true;
  }

  // ── Race Attack ─────────────────────────────────────────────────────────────
  // Fires `count` identical copies of the request simultaneously from the
  // original tab so they all reach the server within milliseconds of each other.
  // Used to probe for race conditions / TOCTOU vulnerabilities.
  if (msg.type === "MITM_RACE") {
    const { queueId, url, method, body, headers, count } = msg;
    const raceCount = Math.min(Math.max(parseInt(count) || 10, 2), 50);

    const queueEntry = mitmPendingQueue.find((p) => p.queueId === queueId);
    // Keep the request in the queue — user may want to forward/drop after racing

    // Build safe headers (same logic as MITM_FORWARD)
    const FORBIDDEN_HEADERS = new Set([
      "content-length", "host", "transfer-encoding", "connection",
      "keep-alive", "proxy-connection", "te", "trailer", "upgrade",
    ]);
    const safeHeaders = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (!FORBIDDEN_HEADERS.has(k.toLowerCase())) safeHeaders[k] = v;
    }

    const bodyStr = (body && method !== "GET" && method !== "HEAD") ? body : null;
    if (bodyStr && !Object.keys(safeHeaders).some((k) => k.toLowerCase() === "content-type")) {
      const trimmed = bodyStr.trimStart();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        safeHeaders["content-type"] = "application/json";
      } else if (/^[\w%+.-]+=/.test(trimmed)) {
        safeHeaders["content-type"] = "application/x-www-form-urlencoded";
      } else {
        safeHeaders["content-type"] = "text/plain;charset=UTF-8";
      }
    }

    const fetchInit = { method: method || "GET", headers: safeHeaders, credentials: "same-origin" };
    if (bodyStr) fetchInit.body = bodyStr;

    const tabId = queueEntry ? queueEntry.tabId : -1;
    const token = "__lp_race_" + queueId + "_" + Date.now();

    // Script fired inside the tab — all N fetches are created before any awaits
    // so they enter the network stack in the same JS microtask, hitting the
    // server as simultaneously as the browser allows.
    const raceCode = [
      "(async function(){",
      "  const _u=" + JSON.stringify(url) + ";",
      "  const _i=" + JSON.stringify(fetchInit) + ";",
      "  const _n=" + raceCount + ";",
      "  const _t=" + JSON.stringify(token) + ";",
      "  const start = Date.now();",
      "  // Build ALL promises before awaiting any — launches them simultaneously",
      "  const jobs = [];",
      "  for (var i = 0; i < _n; i++) {",
      "    jobs.push(",
      "      fetch(_u, _i)",
      "        .then(async function(r) {",
      "          var rb = '';",
      "          try { rb = await r.text(); } catch(e) {}",
      "          return { ok:true, status:r.status, statusText:r.statusText,",
      "                   body: rb.slice(0,512), ms: Date.now()-start };",
      "        })",
      "        .catch(function(err) { return { ok:false, error:String(err), ms:Date.now()-start }; })",
      "    );",
      "  }",
      "  var results = await Promise.all(jobs);",
      "  chrome.runtime.sendMessage({",
      "    __lpToken: _t,",
      "    payload: { ok:true, results:results }",
      "  }, function(){ void chrome.runtime.lastError; });",
      "})();",
    ].join("\n");

    if (tabId && tabId >= 0) {
      const raceToken = token;
      let raceTimeout;
      const raceListener = (resultMsg) => {
        if (!resultMsg || resultMsg.__lpToken !== raceToken) return;
        clearTimeout(raceTimeout);
        chrome.runtime.onMessage.removeListener(raceListener);
        sendResponse(resultMsg.payload);
        return true;
      };
      chrome.runtime.onMessage.addListener(raceListener);
      raceTimeout = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(raceListener);
        sendResponse({ ok: false, error: "Race timed out" });
      }, 30000);

      chrome.tabs.executeScript(tabId, { code: raceCode }, () => {
        if (chrome.runtime.lastError) {
          clearTimeout(raceTimeout);
          chrome.runtime.onMessage.removeListener(raceListener);
          // Fallback: fire from background (CORS may limit cross-origin)
          const bgJobs = [];
          for (let i = 0; i < raceCount; i++) {
            const start = Date.now();
            bgJobs.push(
              fetch(url, fetchInit)
                .then(async (r) => {
                  let rb = ""; try { rb = await r.text(); } catch (e) {}
                  return { ok: true, status: r.status, statusText: r.statusText, body: rb.slice(0, 512), ms: Date.now() - start };
                })
                .catch((err) => ({ ok: false, error: String(err), ms: Date.now() - start }))
            );
          }
          Promise.all(bgJobs).then((results) => sendResponse({ ok: true, results }));
        }
      });
    } else {
      // No tab — fire from background directly
      const bgJobs = [];
      for (let i = 0; i < raceCount; i++) {
        const start = Date.now();
        bgJobs.push(
          fetch(url, fetchInit)
            .then(async (r) => {
              let rb = ""; try { rb = await r.text(); } catch (e) {}
              return { ok: true, status: r.status, statusText: r.statusText, body: rb.slice(0, 512), ms: Date.now() - start };
            })
            .catch((err) => ({ ok: false, error: String(err), ms: Date.now() - start }))
        );
      }
      Promise.all(bgJobs).then((results) => sendResponse({ ok: true, results }));
    }

    return true; // keep channel open for async sendResponse
  }

  // ── Cache Reader ──────────────────────────────────────────────────────────
  if (msg.type === "GET_CACHE_READER") {
    const cacheHits = captures.filter((c) => c.fromCache).slice().reverse();
    // Server cache: any capture that hit at least one server-side cache layer
    const serverCache = captures
      .filter((c) => c.serverCacheInfo && c.serverCacheInfo.layers && c.serverCacheInfo.layers.length > 0)
      .slice()
      .reverse()
      .slice(0, 500);
    sendResponse({
      held: mitmPendingQueue,
      cacheHits: cacheHits.slice(0, 300),
      cacheStorage: cacheStorageEntries,
      serverCache,
    });
    return true;
  }

  if (msg.type === "CACHE_STORAGE_ENTRIES") {
    const tabUrl = msg.tabUrl || "";
    try {
      const origin = new URL(tabUrl).origin;
      cacheStorageEntries = cacheStorageEntries.filter((e) => {
        try { return new URL(e.url).origin !== origin; } catch { return true; }
      });
    } catch {}
    cacheStorageEntries.push(...(msg.entries || []));
    if (cacheStorageEntries.length > 5000) cacheStorageEntries = cacheStorageEntries.slice(-5000);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "ENUMERATE_CACHE_STORAGE") {
    const tabId = msg.tabId;
    if (!tabId || tabId < 0) { sendResponse({ ok: false, error: "No tab" }); return true; }
    const token = "__lp_cache_" + Date.now();
    let cacheTimeout;
    const cacheListener = (resultMsg) => {
      if (!resultMsg || resultMsg.__lpToken !== token) return;
      clearTimeout(cacheTimeout);
      chrome.runtime.onMessage.removeListener(cacheListener);
      const entries = resultMsg.entries || [];
      const tabUrl = resultMsg.tabUrl || "";
      try {
        const origin = new URL(tabUrl).origin;
        cacheStorageEntries = cacheStorageEntries.filter((e) => {
          try { return new URL(e.url).origin !== origin; } catch { return true; }
        });
      } catch {}
      cacheStorageEntries.push(...entries);
      if (cacheStorageEntries.length > 5000) cacheStorageEntries = cacheStorageEntries.slice(-5000);
      sendResponse({ ok: true, entries, count: entries.length });
      return true;
    };
    chrome.runtime.onMessage.addListener(cacheListener);
    cacheTimeout = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(cacheListener);
      sendResponse({ ok: false, error: "Cache enumeration timed out (15 s)" });
    }, 15000);

    const cacheCode = [
      "(async function(){",
      "  var _t=" + JSON.stringify(token) + ";",
      "  var entries = [];",
      "  try {",
      "    var names = await caches.keys();",
      "    for (var i = 0; i < names.length; i++) {",
      "      var name = names[i];",
      "      try {",
      "        var cache = await caches.open(name);",
      "        var reqs = await cache.keys();",
      "        for (var j = 0; j < reqs.length; j++) {",
      "          var req = reqs[j];",
      "          var resp = await cache.match(req);",
      "          var hdrs = {};",
      "          if (resp) resp.headers.forEach(function(v,k){ hdrs[k]=v; });",
      "          var body = null;",
      "          try {",
      "            if (resp) {",
      "              var ct = hdrs['content-type'] || '';",
      "              if (ct.includes('json') || ct.includes('text') || ct.includes('xml') || ct.includes('javascript')) {",
      "                body = (await resp.clone().text()).slice(0, 2048);",
      "              }",
      "            }",
      "          } catch(e2) {}",
      "          entries.push({",
      "            cacheName: name,",
      "            url: req.url,",
      "            method: req.method,",
      "            status: resp ? resp.status : null,",
      "            statusText: resp ? resp.statusText : null,",
      "            headers: hdrs,",
      "            body: body,",
      "            timestamp: Date.now()",
      "          });",
      "        }",
      "      } catch(e) {}",
      "    }",
      "  } catch(e) {}",
      "  chrome.runtime.sendMessage({",
      "    __lpToken: _t,",
      "    entries: entries,",
      "    tabUrl: location.href",
      "  }, function(){ void chrome.runtime.lastError; });",
      "})();",
    ].join("\n");

    chrome.tabs.executeScript(tabId, { code: cacheCode }, () => {
      if (chrome.runtime.lastError) {
        clearTimeout(cacheTimeout);
        chrome.runtime.onMessage.removeListener(cacheListener);
        sendResponse({ ok: false, error: "Cannot inject: " + chrome.runtime.lastError.message });
      }
    });
    return true;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Fallback forwarder used when the original tab is unavailable.
// Runs from the extension background so CORS may block cross-origin responses
// if the target server doesn't allow the chrome-extension:// origin.
function _bgFetch(url, fetchInit, sendResponse) {
  fetch(url, fetchInit)
    .then(async (resp) => {
      const respHeaders = {};
      resp.headers.forEach((v, k) => { respHeaders[k] = v; });
      let respBody = "";
      try { respBody = await resp.text(); } catch (e) {}
      sendResponse({
        ok: true,
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
        body: respBody.slice(0, 8192),
        truncated: respBody.length > 8192,
      });
    })
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
}

function extractDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function simplifyHeaders(headers) {
  const out = {};
  for (const h of headers) out[h.name.toLowerCase()] = h.value;
  return out;
}

function getContentLength(headers) {
  for (const h of headers) {
    if (h.name.toLowerCase() === "content-length") return parseInt(h.value, 10) || null;
  }
  return null;
}

function computeStats(caps) {
  const byType = (t) => caps.filter((c) => c.captureType === t);
  const http    = byType("http");
  const ws      = byType("websocket");
  const dom     = byType("dom");
  const iframe  = byType("iframe");
  const xhr     = byType("xhr");
  const fetch_  = byType("fetch");

  const dbHits = {};
  const cloudHits = {};
  const frameworkHits = {};
  for (const c of caps) {
    if (!c.stackInfo) continue;
    for (const db of c.stackInfo.databases || []) {
      dbHits[db] = (dbHits[db] || 0) + 1;
    }
    if (c.stackInfo.cloud) cloudHits[c.stackInfo.cloud] = (cloudHits[c.stackInfo.cloud] || 0) + 1;
    if (c.stackInfo.framework) frameworkHits[c.stackInfo.framework] = (frameworkHits[c.stackInfo.framework] || 0) + 1;
  }

  const topDatabases = Object.entries(dbHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const allHttp = [...http, ...xhr, ...fetch_];
  const domainCounts = {};
  for (const c of allHttp) domainCounts[c.domain] = (domainCounts[c.domain] || 0) + 1;
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  const typeCounts = {};
  for (const c of allHttp) typeCounts[c.type || c.captureType] = (typeCounts[c.type || c.captureType] || 0) + 1;

  const fingerprintedCount = caps.filter((c) => c.stackInfo).length;
  const mitmMatchCount = caps.filter((c) => c.mitmRule).length + mitmPendingQueue.length;
  const cacheHitCount = caps.filter((c) => c.fromCache).length;
  const errorCount = allHttp.filter((c) => c.status === "error" || (c.statusCode && c.statusCode >= 400)).length;
  const durations = allHttp.filter((c) => c.duration).map((c) => c.duration);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    total: caps.length,
    http: http.length,
    websocket: ws.length,
    dom: dom.length,
    iframe: iframe.length,
    xhr: xhr.length,
    fetch: fetch_.length,
    topDomains,
    typeCounts,
    errorCount,
    avgDuration,
    fingerprintedCount,
    mitmMatchCount,
    pendingInterceptCount: mitmPendingQueue.length,
    cacheHitCount,
    cacheStorageCount: cacheStorageEntries.length,
    serverCacheCount:  caps.filter((c) => c.serverCacheInfo && c.serverCacheInfo.layers && c.serverCacheInfo.layers.length > 0).length,
    topDatabases,
    cloudHits,
    frameworkHits,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1xBET GAME PROXY MODULE
// Appended to Lucky Patcher background — intercepts 1x-bet.mobi traffic,
// strips framing headers, routes through user-configured proxy, and pings
// the Replit app so connection messages flow into the project logs.
// ════════════════════════════════════════════════════════════════════════════

const XBET_TARGET = 'https://1x-bet.mobi';
const XBET_CDN    = 'traincdn.com';

const XBET_BLOCK_HEADERS = new Set([
  'x-frame-options', 'content-security-policy',
  'content-security-policy-report-only', 'x-content-security-policy',
  'x-webkit-csp', 'frame-options',
]);

// ── 1. Strip framing headers + inject CORS for 1x-bet.mobi ─────────────────
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    var out = (details.responseHeaders || []).filter(
      function (h) { return !XBET_BLOCK_HEADERS.has(h.name.toLowerCase()); }
    );
    out.push({ name: 'Access-Control-Allow-Origin',  value: '*' });
    out.push({ name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' });
    out.push({ name: 'Access-Control-Allow-Headers', value: '*' });
    return { responseHeaders: out };
  },
  { urls: [XBET_TARGET + '/*', 'https://*.1x-bet.mobi/*', 'https://*.1xbet.com/*'] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// ── 2. CORS for CDN game thumbnails ────────────────────────────────────────
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    var out = (details.responseHeaders || []);
    out.push({ name: 'Access-Control-Allow-Origin', value: '*' });
    return { responseHeaders: out };
  },
  { urls: ['https://' + XBET_CDN + '/*', 'https://*.' + XBET_CDN + '/*'] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// ── 3. Spoof Referer / Origin on outgoing 1x-bet requests ──────────────────
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    var headers = (details.requestHeaders || []).map(function (h) {
      var n = h.name.toLowerCase();
      if (n === 'referer') return { name: h.name, value: XBET_TARGET + '/' };
      if (n === 'origin')  return { name: h.name, value: XBET_TARGET };
      return h;
    });
    return { requestHeaders: headers };
  },
  { urls: [XBET_TARGET + '/*', 'https://*.1x-bet.mobi/*', 'https://*.1xbet.com/*'] },
  ['blocking', 'requestHeaders', 'extraHeaders']
);

// ── 4. chrome.proxy PAC-script routing ─────────────────────────────────────
function _xbetBuildPac(type, host, port) {
  var keyword = type === 'socks5' ? 'SOCKS5' : 'PROXY';
  return 'function FindProxyForURL(url,host){' +
    'if(shExpMatch(host,"*.1x-bet.mobi")||shExpMatch(host,"1x-bet.mobi")||' +
    'shExpMatch(host,"*.1xbet.com")||shExpMatch(host,"1xbet.com")||' +
    'shExpMatch(host,"*.traincdn.com")||shExpMatch(host,"traincdn.com")){' +
    'return "' + keyword + ' ' + host + ':' + port + '; DIRECT";}' +
    'return "DIRECT";}';
}

function _xbetApplyProxy(cfg) {
  if (!chrome.proxy || !chrome.proxy.settings) return;
  if (!cfg || !cfg.enabled || !cfg.host || !cfg.port) {
    try { chrome.proxy.settings.clear({ scope: 'regular' }); } catch (e) {}
    return;
  }
  try {
    chrome.proxy.settings.set({
      value: { mode: 'pac_script', pacScript: { data: _xbetBuildPac(cfg.type || 'http', cfg.host, cfg.port) } },
      scope: 'regular',
    });
    console.log('[1xBet] proxy set →', cfg.type, cfg.host + ':' + cfg.port);
  } catch (e) { console.warn('[1xBet] proxy set failed', e); }
}

// ── 5. App heartbeat — pings /api/ext-ping so logs flow in Replit ──────────
var _xbetPingTimer = null;

function _xbetPing(appUrl) {
  if (!appUrl) return;
  var url = appUrl.replace(/\/$/, '') + '/api/ext-ping';
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ v: '2.0', ts: Date.now() }),
  }).then(function (r) {
    var result = { ok: r.ok, status: r.status, ts: Date.now() };
    chrome.storage.local.set({ xbetLastPing: result });
    chrome.runtime.sendMessage({ type: 'XBET_PING_RESULT', result: result }, function () { void chrome.runtime.lastError; });
  }).catch(function (err) {
    var result = { ok: false, error: String(err), ts: Date.now() };
    chrome.storage.local.set({ xbetLastPing: result });
    chrome.runtime.sendMessage({ type: 'XBET_PING_RESULT', result: result }, function () { void chrome.runtime.lastError; });
  });
}

function _xbetStartPing() {
  chrome.storage.local.get(['xbetAppUrl'], function (r) {
    if (!r.xbetAppUrl) return;
    _xbetPing(r.xbetAppUrl);
    if (_xbetPingTimer) clearInterval(_xbetPingTimer);
    _xbetPingTimer = setInterval(function () { _xbetPing(r.xbetAppUrl); }, 30000);
  });
}

// ── 6. Boot ────────────────────────────────────────────────────────────────
chrome.storage.local.get(['xbetProxyConfig'], function (r) {
  if (r.xbetProxyConfig) _xbetApplyProxy(r.xbetProxyConfig);
});
_xbetStartPing();

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.xbetProxyConfig) _xbetApplyProxy(changes.xbetProxyConfig.newValue);
  if (changes.xbetAppUrl)      { if (_xbetPingTimer) clearInterval(_xbetPingTimer); _xbetStartPing(); }
});

// ── 7. Message handlers for 1xBet popup tab ────────────────────────────────
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || typeof msg.type !== 'string' || msg.type.indexOf('XBET_') !== 0) return;

  if (msg.type === 'XBET_GET_CONFIG') {
    chrome.storage.local.get(['xbetAppUrl', 'xbetProxyConfig', 'xbetLastPing'], function (r) {
      sendResponse(r);
    });
    return true;
  }

  if (msg.type === 'XBET_SAVE') {
    var data = {};
    if (msg.appUrl      !== undefined) data.xbetAppUrl      = msg.appUrl;
    if (msg.proxyConfig !== undefined) data.xbetProxyConfig = msg.proxyConfig;
    chrome.storage.local.set(data, function () {
      if (msg.proxyConfig !== undefined) _xbetApplyProxy(msg.proxyConfig);
      if (msg.appUrl      !== undefined) { if (_xbetPingTimer) clearInterval(_xbetPingTimer); _xbetStartPing(); }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'XBET_PING_NOW') {
    chrome.storage.local.get(['xbetAppUrl'], function (r) { _xbetPing(r.xbetAppUrl); });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'XBET_CLEAR_PROXY') {
    var cleared = { enabled: false };
    chrome.storage.local.set({ xbetProxyConfig: cleared }, function () {
      _xbetApplyProxy(cleared);
      sendResponse({ ok: true });
    });
    return true;
  }
});

console.log('[1xBet Proxy] module loaded');
