// Lucky Patcher – Popup Script

let currentTab = "all";
let paused = false;
let currentPage = 0;
let allCaptures = [];
let searchQuery = "";
let mitmCaptures = [];

// ── Repeater state ────────────────────────────────────────────────────────────
const repeater = {
  tabId:   null,   // tabId from the most recent "Send to Repeater" source
  history: [],     // [{ url, method, status, ms, timestamp, response }]
};

const PAGE_SIZE = 80;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const captureList   = document.getElementById("captureList");
const panelList     = document.getElementById("panelList");
const panelDetail   = document.getElementById("panelDetail");
const panelStats    = document.getElementById("panelStats");
const panelStack    = document.getElementById("panelStack");
const panelMitm     = document.getElementById("panelMitm");
const panelCache    = document.getElementById("panelCache");
const totalCounter  = document.getElementById("totalCounter");
const searchInput   = document.getElementById("searchInput");
const loadMoreWrap  = document.getElementById("loadMore");

// ── Cache panel sub-tab state ─────────────────────────────────────────────────
let currentCacheSubtab = "held";

document.addEventListener("DOMContentLoaded", () => {
  loadCaptures();
  setupTabs();
  setupButtons();
  setupSearch();
  setupMitm();
  setupRepeater();
  setupCache();
  listenForNew();
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.dataset.tab;
      currentPage = 0;

      panelList.classList.add("hidden");
      panelDetail.classList.add("hidden");
      panelStats.classList.add("hidden");
      panelStack.classList.add("hidden");
      panelMitm.classList.add("hidden");
      panelCache.classList.add("hidden");
      document.getElementById("panelRepeater").classList.add("hidden");

      if (currentTab === "stats")        { panelStats.classList.remove("hidden"); loadStats(); }
      else if (currentTab === "stack")   { panelStack.classList.remove("hidden"); loadStackPanel(); }
      else if (currentTab === "mitm")    { panelMitm.classList.remove("hidden");  loadMitmPanel(); }
      else if (currentTab === "repeater"){ document.getElementById("panelRepeater").classList.remove("hidden"); }
      else if (currentTab === "cache")   { panelCache.classList.remove("hidden"); loadCachePanel(); }
      else { panelList.classList.remove("hidden"); loadCaptures(); }
    });
  });
}

// ── Buttons ───────────────────────────────────────────────────────────────────
function setupButtons() {
  document.getElementById("btnPause").addEventListener("click", () => {
    paused = !paused;
    const btn = document.getElementById("btnPause");
    btn.textContent = paused ? "▶" : "⏸";
    btn.classList.toggle("paused", paused);
  });

  document.getElementById("btnClear").addEventListener("click", () => {
    if (!confirm("Clear all captures?")) return;
    chrome.runtime.sendMessage({ type: "CLEAR_CAPTURES" }, () => {
      allCaptures = [];
      mitmCaptures = [];
      captureList.innerHTML = "";
      document.getElementById("mitmMatchList").innerHTML = "";
      document.getElementById("mitmInterceptList").innerHTML = "";
      document.getElementById("mitmInterceptSection").classList.add("hidden");
      // Clear cache panel lists
      document.getElementById("cacheHeldList").innerHTML = "";
      document.getElementById("cacheHitList").innerHTML = "";
      document.getElementById("cacheStorageGroupList").innerHTML = "";
      updateCounters();
    });
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "EXPORT_CAPTURES" }, (resp) => {
      const blob = new Blob([resp.data], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: "lucky-patcher-" + Date.now() + ".json",
      });
      a.click();
    });
  });

  document.getElementById("btnBack").addEventListener("click", () => {
    panelDetail.classList.add("hidden");
    panelList.classList.remove("hidden");
  });

  document.getElementById("btnLoadMore")?.addEventListener("click", () => {
    currentPage++;
    appendCaptures();
  });
}

// ── Search ────────────────────────────────────────────────────────────────────
function setupSearch() {
  let deb;
  searchInput.addEventListener("input", () => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      currentPage = 0;
      loadCaptures();
    }, 300);
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────
function buildFilter() {
  const f = {};
  const networkTypes = ["http", "xhr", "fetch", "websocket", "iframe", "dom"];
  if (networkTypes.includes(currentTab)) f.captureType = currentTab;
  if (searchQuery) f.search = searchQuery;
  return f;
}

function loadCaptures() {
  chrome.runtime.sendMessage(
    { type: "GET_CAPTURES", filter: buildFilter(), page: 0, pageSize: PAGE_SIZE },
    (resp) => {
      if (!resp) return;
      allCaptures = resp.captures || [];
      renderList(true);
      updateCounters();
    }
  );
}

function appendCaptures() {
  chrome.runtime.sendMessage(
    { type: "GET_CAPTURES", filter: buildFilter(), page: currentPage, pageSize: PAGE_SIZE },
    (resp) => {
      if (!resp) return;
      const items = resp.captures || [];
      allCaptures = [...allCaptures, ...items];
      for (const cap of items) captureList.appendChild(buildCaptureItem(cap));
      loadMoreWrap.classList.toggle("hidden", items.length < PAGE_SIZE);
    }
  );
}

function loadStats() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, renderStats);
}

function loadStackPanel() {
  chrome.runtime.sendMessage(
    { type: "GET_CAPTURES", filter: { stackOnly: true }, page: 0, pageSize: 200 },
    (resp) => renderStackPanel(resp?.captures || [])
  );
}

// ── Rendering: capture list ───────────────────────────────────────────────────
function renderList(fresh = false) {
  if (fresh) captureList.innerHTML = "";

  if (allCaptures.length === 0) {
    captureList.innerHTML = "<div class=\"empty-state\"><div class=\"empty-icon\">&#128373;</div><div>No captures yet</div><div style=\"font-size:10px;color:var(--text3)\">Browse a page to start intercepting</div></div>";
    loadMoreWrap.classList.add("hidden");
    return;
  }

  if (fresh) {
    for (const cap of allCaptures) captureList.appendChild(buildCaptureItem(cap));
  }

  loadMoreWrap.classList.toggle("hidden", allCaptures.length < PAGE_SIZE);
}

function buildCaptureItem(cap) {
  const el = document.createElement("div");
  el.className = "capture-item";
  if (cap.mitmRule) el.classList.add("mitm-" + (cap.mitmRule.action || "highlight"));
  const typeClass = "type-" + cap.captureType;
  const time = formatTime(cap.timestamp);

  if (cap.captureType === "websocket") {
    el.innerHTML =
      "<div class=\"capture-row1\">" +
        "<span class=\"cap-type " + typeClass + "\">WS</span>" +
        "<span class=\"cap-ws-event\">" + (cap.event?.toUpperCase() || "") + "</span>" +
        "<span class=\"cap-domain\">" + esc(cap.domain || cap.url || "") + "</span>" +
        "<span class=\"cap-time\">" + time + "</span>" +
      "</div>" +
      (cap.payload ? "<div class=\"cap-ws-payload\">" + esc(cap.payload) + "</div>" : "");
  } else if (cap.captureType === "dom") {
    el.innerHTML =
      "<div class=\"capture-row1\">" +
        "<span class=\"cap-type " + typeClass + "\">DOM</span>" +
        "<span class=\"cap-ws-event\">&lt;" + esc(cap.tag || "") + "&gt;</span>" +
        "<span class=\"cap-domain\">" + esc(cap.event || "") + "</span>" +
        "<span class=\"cap-time\">" + time + "</span>" +
      "</div>" +
      (cap.src ? "<div class=\"cap-ws-payload\">" + esc(trunc(cap.src, 120)) + "</div>" : "");
  } else if (cap.captureType === "iframe") {
    el.innerHTML =
      "<div class=\"capture-row1\">" +
        "<span class=\"cap-type " + typeClass + "\">FRAME</span>" +
        "<span class=\"cap-domain\">" + esc(cap.domain || cap.src || "") + "</span>" +
        "<span class=\"cap-time\">" + time + "</span>" +
      "</div>";
  } else {
    // http / xhr / fetch
    const statusClass = getStatusClass(cap);
    const method = cap.method || "GET";
    const typeLabel = cap.captureType === "xhr" ? "XHR"
                    : cap.captureType === "fetch" ? "FETCH"
                    : "HTTP";
    const mitmBadge = cap.mitmRule
      ? "<span class=\"mitm-badge mitm-badge-" + cap.mitmRule.action + "\">" + cap.mitmRule.action.toUpperCase() + "</span>"
      : "";
    el.innerHTML =
      "<div class=\"capture-row1\">" +
        "<span class=\"cap-type " + typeClass + "\">" + typeLabel + "</span>" +
        "<span class=\"cap-method\">" + method + "</span>" +
        "<span class=\"cap-status " + statusClass + "\">" + (cap.statusCode || cap.status || "") + "</span>" +
        "<span class=\"cap-domain\">" + esc(cap.domain || "") + "</span>" +
        "<span class=\"cap-time\">" + time + "</span>" +
        mitmBadge +
      "</div>" +
      "<div class=\"capture-row2\">" +
        "<span class=\"cap-url\">" + esc(trunc(cap.url || "", 100)) + "</span>" +
        (cap.duration ? "<span class=\"cap-dur\">" + cap.duration + "ms</span>" : "") +
        (cap.stackLabel ? "<span class=\"cap-stack-badge\">" + esc(cap.stackLabel) + "</span>" : "") +
      "</div>";
  }

  el.addEventListener("click", () => showDetail(cap));
  return el;
}

// ── Detail view ───────────────────────────────────────────────────────────────
function showDetail(cap) {
  panelList.classList.add("hidden");
  panelMitm.classList.add("hidden");
  panelDetail.classList.remove("hidden");

  const dc = document.getElementById("detailContent");

  if (cap.captureType === "websocket") {
    dc.innerHTML = detailRow("Type", "WebSocket") + detailRow("Event", cap.event) +
      detailRow("URL", cap.url) + detailRow("Time", formatTime(cap.timestamp)) +
      (cap.payload ? detailBlock("Payload", cap.payload) : "");
    return;
  }

  if (cap.captureType === "dom" || cap.captureType === "iframe") {
    dc.innerHTML = detailRow("Type", cap.captureType.toUpperCase()) +
      detailRow("Tag", cap.tag || cap.event) + detailRow("Source", cap.src || cap.url) +
      detailRow("Time", formatTime(cap.timestamp)) +
      (cap.attrs ? detailBlock("Attributes", JSON.stringify(cap.attrs, null, 2)) : "");
    return;
  }

  let html = detailRow("Type", (cap.captureType || "http").toUpperCase()) +
    detailRow("Method", cap.method) + detailRow("URL", cap.url) +
    detailRow("Domain", cap.domain) + detailRow("Status", cap.statusCode || cap.status) +
    detailRow("Duration", cap.duration ? cap.duration + " ms" : null) +
    detailRow("Size", formatBytes(cap.responseSize)) +
    detailRow("Time", formatTime(cap.timestamp)) +
    detailRow("Initiator", cap.initiator);

  if (cap.mitmRule) {
    html += "<div class=\"detail-mitm-callout\">" +
      "&#9888; MITM match: <strong>" + esc(cap.mitmRule.name) + "</strong> — " + cap.mitmRule.action.toUpperCase() +
      "</div>";
  }
  if (cap.stackLabel) html += detailRow("Stack", cap.stackLabel);
  if (cap.requestBody) html += detailBlock("Request Body", cap.requestBody);
  if (cap.responseBody) html += detailBlock("Response Body", cap.responseBody);
  if (cap.requestHeaders) html += detailBlock("Request Headers", JSON.stringify(cap.requestHeaders, null, 2));
  if (cap.responseHeaders) html += detailBlock("Response Headers", JSON.stringify(cap.responseHeaders, null, 2));
  if (cap.stackInfo) html += detailBlock("Stack Info", JSON.stringify(cap.stackInfo, null, 2));

  dc.innerHTML = html;
}

function detailRow(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return "<div class=\"detail-row\"><span class=\"detail-label\">" + esc(label) + "</span><span class=\"detail-value\">" + esc(String(value)) + "</span></div>";
}
function detailBlock(label, value) {
  if (!value) return "";
  return "<div class=\"detail-block\"><div class=\"detail-block-label\">" + esc(label) + "</div><pre class=\"detail-pre\">" + esc(String(value)) + "</pre></div>";
}

// ── Stats Panel ───────────────────────────────────────────────────────────────
function renderStats(stats) {
  if (!stats) return;
  const grid = document.getElementById("statsGrid");
  const dl = document.getElementById("domainList");
  const tl = document.getElementById("typeList");
  grid.innerHTML = [
    { label: "Total", value: stats.total },
    { label: "HTTP", value: stats.http },
    { label: "XHR", value: stats.xhr || 0 },
    { label: "Fetch", value: stats.fetch || 0 },
    { label: "WS", value: stats.websocket },
    { label: "iframe", value: stats.iframe },
    { label: "DOM", value: stats.dom },
    { label: "Errors", value: stats.errorCount },
    { label: "Avg ms", value: stats.avgDuration },
    { label: "Stacks", value: stats.fingerprintedCount },
    { label: "MITM", value: stats.mitmMatchCount },
    { label: "Held", value: stats.pendingInterceptCount || 0 },
  ].map((s) =>
    "<div class=\"stat-card\"><div class=\"stat-value\">" + (s.value ?? 0) + "</div><div class=\"stat-label\">" + s.label + "</div></div>"
  ).join("");

  dl.innerHTML = (stats.topDomains || []).map((d) =>
    "<li><span class=\"domain-name\">" + esc(d.domain) + "</span><span class=\"domain-count\">" + d.count + "</span></li>"
  ).join("") || "<li style='color:var(--text3)'>None yet</li>";

  tl.innerHTML = Object.entries(stats.typeCounts || {}).map(([t, c]) =>
    "<li><span class=\"domain-name\">" + esc(t) + "</span><span class=\"domain-count\">" + c + "</span></li>"
  ).join("") || "<li style='color:var(--text3)'>None yet</li>";
}

// ── Stack Panel ───────────────────────────────────────────────────────────────
function renderStackPanel(caps) {
  if (!caps.length) {
    panelStack.innerHTML = "<div class=\"empty-state\"><div class=\"empty-icon\">&#9670;</div><div>No stack fingerprints yet</div></div>";
    return;
  }
  panelStack.innerHTML = caps.map((c) =>
    "<div class=\"stack-item\">" +
      "<div class=\"stack-domain\">" + esc(c.domain || c.url || "") + "</div>" +
      "<div class=\"stack-label\">" + esc(c.stackLabel || "") + "</div>" +
      (c.stackInfo?.evidence?.length
        ? "<div class=\"stack-evidence\">" + c.stackInfo.evidence.slice(0, 3).map(esc).join(" · ") + "</div>"
        : "") +
    "</div>"
  ).join("");
}

// ══════════════════════════════════════════════════════════════════════════════
// MITM Panel
// ══════════════════════════════════════════════════════════════════════════════

function setupMitm() {
  document.getElementById("btnAddRule").addEventListener("click", addMitmRule);
}

function addMitmRule() {
  const pattern = document.getElementById("mitmPattern").value.trim();
  if (!pattern) return;
  const isRegex = document.getElementById("mitmIsRegex").checked;
  const action  = document.getElementById("mitmAction").value;
  const name    = document.getElementById("mitmName").value.trim() || pattern;

  if (isRegex) {
    try { new RegExp(pattern); } catch {
      alert("Invalid regex pattern"); return;
    }
  }

  chrome.runtime.sendMessage({ type: "ADD_MITM_RULE", rule: { pattern, isRegex, action, name } }, (resp) => {
    if (!resp || !resp.ok) return;
    document.getElementById("mitmPattern").value = "";
    document.getElementById("mitmName").value = "";
    loadMitmPanel();
  });
}

function loadMitmPanel() {
  chrome.runtime.sendMessage({ type: "GET_MITM_RULES" }, (resp) => {
    renderMitmRules(resp?.rules || []);
  });
  chrome.runtime.sendMessage(
    { type: "GET_CAPTURES", filter: { mitmOnly: true }, page: 0, pageSize: 200 },
    (resp) => renderMitmMatches(resp?.captures || [])
  );
  chrome.runtime.sendMessage({ type: "GET_MITM_PENDING" }, (resp) => {
    renderMitmPending(resp?.queue || []);
  });
}

function renderMitmRules(rules) {
  const container = document.getElementById("mitmRulesList");
  const empty = document.getElementById("mitmEmpty");

  if (!rules.length) {
    container.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  container.innerHTML = rules.map((rule) => {
    const actionColor = rule.action === "block" ? "var(--red)"
      : rule.action === "log" ? "var(--text3)"
      : rule.action === "intercept" ? "var(--blue)"
      : "var(--mitm)";
    const actionLabel = rule.action === "intercept" ? "&#9654; INTERCEPT" : rule.action.toUpperCase();
    return "<div class=\"mitm-rule-item\" data-id=\"" + rule.id + "\">" +
      "<div class=\"mitm-rule-left\">" +
        "<label class=\"mitm-toggle\"><input type=\"checkbox\" class=\"mitm-toggle-cb\" " + (rule.enabled ? "checked" : "") + " data-id=\"" + rule.id + "\"/><span class=\"mitm-toggle-slider\"></span></label>" +
        "<div class=\"mitm-rule-info\">" +
          "<span class=\"mitm-rule-name\">" + esc(rule.name) + "</span>" +
          "<span class=\"mitm-rule-pattern\">" + (rule.isRegex ? "⟨regex⟩ " : "") + esc(rule.pattern) + "</span>" +
        "</div>" +
      "</div>" +
      "<div class=\"mitm-rule-right\">" +
        "<span class=\"mitm-action-badge\" style=\"color:" + actionColor + "\">" + actionLabel + "</span>" +
        "<button class=\"mitm-btn-del\" data-id=\"" + rule.id + "\">&#10006;</button>" +
      "</div>" +
    "</div>";
  }).join("");

  container.querySelectorAll(".mitm-toggle-cb").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = parseInt(e.target.dataset.id);
      chrome.runtime.sendMessage({ type: "UPDATE_MITM_RULE", id, updates: { enabled: e.target.checked } });
    });
  });

  container.querySelectorAll(".mitm-btn-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = parseInt(e.target.dataset.id);
      chrome.runtime.sendMessage({ type: "DELETE_MITM_RULE", id }, () => loadMitmPanel());
    });
  });
}

function renderMitmMatches(caps) {
  const list = document.getElementById("mitmMatchList");
  const counter = document.getElementById("mitmMatchCount");
  counter.textContent = caps.length;
  if (!caps.length) { list.innerHTML = ""; return; }
  list.innerHTML = "";
  for (const cap of caps) list.appendChild(buildCaptureItem(cap));
}

// ── Intercept queue: held requests awaiting user edit + forward ───────────────
function renderMitmPending(queue) {
  const section = document.getElementById("mitmInterceptSection");
  const list    = document.getElementById("mitmInterceptList");
  const badge   = document.getElementById("interceptQueueCount");

  badge.textContent = queue.length;

  if (!queue.length) {
    section.classList.add("hidden");
    list.innerHTML = "";
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = "";

  for (const p of queue) {
    const card = document.createElement("div");
    card.className = "intercept-card";
    card.dataset.queueId = p.queueId;

    card.innerHTML =
      "<div class=\"intercept-card-header\">" +
        "<span class=\"intercept-rule-badge\">" + esc(p.ruleName) + "</span>" +
        "<span class=\"intercept-method\">" + esc(p.method) + "</span>" +
        "<span class=\"intercept-time\">" + formatTime(p.timestamp) + "</span>" +
      "</div>" +

      // Editable URL
      "<div class=\"intercept-field-label\">URL</div>" +
      "<input class=\"intercept-url-input\" type=\"text\" value=\"" + esc(p.url) + "\" />" +

      // Editable method
      "<div class=\"intercept-field-label\">Method</div>" +
      "<select class=\"intercept-method-select\">" +
        ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map((m) =>
          "<option " + (m === p.method ? "selected" : "") + ">" + m + "</option>"
        ).join("") +
      "</select>" +

      // Editable headers (JSON)
      "<div class=\"intercept-field-label\">Headers <span class=\"intercept-hint\">(JSON)</span></div>" +
      "<textarea class=\"intercept-headers-input\" rows=\"3\">" +
        esc(JSON.stringify(p.requestHeaders || {}, null, 2)) +
      "</textarea>" +

      // Editable body
      "<div class=\"intercept-field-label\">Body / Payload</div>" +
      "<textarea class=\"intercept-body-input\" rows=\"4\" placeholder=\"(empty for GET)\">" +
        esc(p.requestBody || "") +
      "</textarea>" +

      // Buttons + race count
      "<div class=\"intercept-actions\">" +
        "<button class=\"intercept-btn-forward\">&#9654; Forward</button>" +
        "<div class=\"race-group\">" +
          "<button class=\"intercept-btn-race\">&#9889; Race</button>" +
          "<input class=\"race-count-input\" type=\"number\" min=\"2\" max=\"50\" value=\"10\" title=\"Number of simultaneous requests\" />" +
        "</div>" +
        "<button class=\"intercept-btn-repeater\" title=\"Open in Repeater\">&#128225;</button>" +
        "<button class=\"intercept-btn-drop\">&#10006; Drop</button>" +
      "</div>" +

      // Response area (hidden until forwarded)
      "<div class=\"intercept-response hidden\">" +
        "<div class=\"intercept-field-label\">Response</div>" +
        "<pre class=\"intercept-response-body\"></pre>" +
      "</div>" +

      // Race results area (hidden until raced)
      "<div class=\"race-results hidden\">" +
        "<div class=\"intercept-field-label race-results-label\">Race Results <span class=\"intercept-hint race-summary\"></span></div>" +
        "<div class=\"race-results-list\"></div>" +
      "</div>";

    // Wire Forward button
    card.querySelector(".intercept-btn-forward").addEventListener("click", () => {
      const url     = card.querySelector(".intercept-url-input").value.trim();
      const method  = card.querySelector(".intercept-method-select").value;
      const bodyVal = card.querySelector(".intercept-body-input").value;
      let headers   = {};
      try { headers = JSON.parse(card.querySelector(".intercept-headers-input").value); } catch {}

      const btn = card.querySelector(".intercept-btn-forward");
      btn.disabled = true;
      btn.textContent = "Sending…";

      chrome.runtime.sendMessage(
        { type: "MITM_FORWARD", queueId: p.queueId, url, method, body: bodyVal, headers },
        (resp) => {
          btn.textContent = "&#9654; Forward";
          btn.disabled = false;
          const respArea = card.querySelector(".intercept-response");
          const respPre  = card.querySelector(".intercept-response-body");
          respArea.classList.remove("hidden");
          if (!resp) {
            respPre.textContent = "No response (background disconnected?)";
            return;
          }
          if (!resp.ok) {
            respPre.textContent = "Error: " + (resp.error || "unknown");
            return;
          }
          const statusLine = "HTTP " + resp.status + " " + (resp.statusText || "");
          const headersStr = Object.entries(resp.headers || {}).map(([k, v]) => k + ": " + v).join("\n");
          respPre.textContent = statusLine + "\n" + headersStr + "\n\n" +
            (resp.body || "(empty body)") + (resp.truncated ? "\n\n[… truncated at 8 KB]" : "");
          // Remove from queue display after forwarding
          card.classList.add("intercept-done");
          updateQueueBadge(-1);
        }
      );
    });

    // Wire Send to Repeater button
    card.querySelector(".intercept-btn-repeater").addEventListener("click", () => {
      const url     = card.querySelector(".intercept-url-input").value.trim();
      const method  = card.querySelector(".intercept-method-select").value;
      const bodyVal = card.querySelector(".intercept-body-input").value;
      let headers   = {};
      try { headers = JSON.parse(card.querySelector(".intercept-headers-input").value); } catch {}
      loadIntoRepeater({ url, method, headers, body: bodyVal, tabId: p.tabId });
    });

    // Wire Race button
    card.querySelector(".intercept-btn-race").addEventListener("click", () => {
      const url     = card.querySelector(".intercept-url-input").value.trim();
      const method  = card.querySelector(".intercept-method-select").value;
      const bodyVal = card.querySelector(".intercept-body-input").value;
      let headers   = {};
      try { headers = JSON.parse(card.querySelector(".intercept-headers-input").value); } catch {}
      const count = parseInt(card.querySelector(".race-count-input").value) || 10;

      const btn = card.querySelector(".intercept-btn-race");
      btn.disabled = true;
      btn.textContent = "Racing…";

      const resultsArea = card.querySelector(".race-results");
      const resultsList = card.querySelector(".race-results-list");
      const summary     = card.querySelector(".race-summary");
      resultsArea.classList.remove("hidden");
      resultsList.innerHTML = "<div class=\"race-waiting\">Firing " + count + " requests\u2026</div>";

      chrome.runtime.sendMessage(
        { type: "MITM_RACE", queueId: p.queueId, url, method, body: bodyVal, headers, count },
        (resp) => {
          btn.textContent = "\u26A1 Race";
          btn.disabled = false;

          if (!resp || !resp.ok) {
            resultsList.innerHTML = "<div class=\"race-error\">" + esc((resp && resp.error) || "No response") + "</div>";
            return;
          }

          const results = resp.results || [];
          // Tally outcomes
          const ok2xx  = results.filter((r) => r.ok && r.status >= 200 && r.status < 300).length;
          const ok3xx  = results.filter((r) => r.ok && r.status >= 300 && r.status < 400).length;
          const err4xx = results.filter((r) => r.ok && r.status >= 400 && r.status < 500).length;
          const err5xx = results.filter((r) => r.ok && r.status >= 500).length;
          const netErr = results.filter((r) => !r.ok).length;
          const parts  = [];
          if (ok2xx)  parts.push(ok2xx + "\u00d72xx");
          if (ok3xx)  parts.push(ok3xx + "\u00d73xx");
          if (err4xx) parts.push(err4xx + "\u00d74xx");
          if (err5xx) parts.push(err5xx + "\u00d75xx");
          if (netErr) parts.push(netErr + "\u00d7err");
          summary.textContent = "— " + parts.join("  ");

          // Render one row per result
          resultsList.innerHTML = "";
          results.forEach((r, i) => {
            const row = document.createElement("div");
            row.className = "race-row";

            let statusClass = "race-status-err";
            let statusText  = r.error ? ("ERR " + r.error.slice(0, 40)) : "NET ERR";
            if (r.ok) {
              statusText = String(r.status) + " " + (r.statusText || "");
              if (r.status < 300)       statusClass = "race-status-2xx";
              else if (r.status < 400)  statusClass = "race-status-3xx";
              else if (r.status < 500)  statusClass = "race-status-4xx";
              else                      statusClass = "race-status-5xx";
            }

            row.innerHTML =
              "<span class=\"race-index\">#" + (i + 1) + "</span>" +
              "<span class=\"race-status " + statusClass + "\">" + esc(statusText) + "</span>" +
              "<span class=\"race-ms\">" + (r.ms != null ? r.ms + "ms" : "") + "</span>" +
              (r.body ? "<span class=\"race-body-snip\">" + esc(r.body.slice(0, 80)) + "</span>" : "");
            resultsList.appendChild(row);
          });
        }
      );
    });

    // Wire Drop button
    card.querySelector(".intercept-btn-drop").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "MITM_DROP", queueId: p.queueId }, () => {
        card.remove();
        updateQueueBadge(-1);
        if (!document.getElementById("mitmInterceptList").children.length) {
          document.getElementById("mitmInterceptSection").classList.add("hidden");
        }
      });
    });

    list.appendChild(card);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REPEATER
// ══════════════════════════════════════════════════════════════════════════════

function setupRepeater() {
  document.getElementById("rptSendBtn").addEventListener("click", sendRepeaterRequest);
}

// Load a request into the Repeater form and switch to the tab.
// Called from "Send to Repeater" buttons elsewhere in the UI.
function loadIntoRepeater({ url, method, headers, body, tabId }) {
  document.getElementById("rptUrl").value      = url    || "";
  document.getElementById("rptMethod").value   = method || "GET";
  document.getElementById("rptHeaders").value  =
    (headers && typeof headers === "object")
      ? JSON.stringify(headers, null, 2)
      : (headers || "{}");
  document.getElementById("rptBody").value     = body   || "";
  if (tabId != null) repeater.tabId = tabId;

  // Switch to Repeater tab
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelector(".tab[data-tab='repeater']").classList.add("active");
  currentTab = "repeater";
  ["panelList","panelDetail","panelStats","panelStack","panelMitm"].forEach((id) =>
    document.getElementById(id).classList.add("hidden")
  );
  panelCache.classList.add("hidden");
  document.getElementById("panelRepeater").classList.remove("hidden");

  // Hide stale response
  document.getElementById("rptResponseArea").classList.add("hidden");
}

function sendRepeaterRequest() {
  const url     = document.getElementById("rptUrl").value.trim();
  const method  = document.getElementById("rptMethod").value;
  const bodyVal = document.getElementById("rptBody").value;
  let   headers = {};
  try { headers = JSON.parse(document.getElementById("rptHeaders").value); } catch {}

  if (!url) { document.getElementById("rptUrl").focus(); return; }

  const btn = document.getElementById("rptSendBtn");
  btn.disabled = true;
  btn.textContent = "Sending…";

  const respArea   = document.getElementById("rptResponseArea");
  const statusBadge = document.getElementById("rptStatusBadge");
  const timeBadge   = document.getElementById("rptTimeBadge");
  const respPre     = document.getElementById("rptResponseBody");

  const startMs = Date.now();

  chrome.runtime.sendMessage(
    { type: "REPEATER_SEND", url, method, body: bodyVal, headers, tabId: repeater.tabId },
    (resp) => {
      const elapsed = Date.now() - startMs;
      btn.textContent = "&#9654; Send";
      btn.disabled = false;
      respArea.classList.remove("hidden");

      let statusText = "", statusClass = "", bodyText = "";

      if (!resp) {
        statusText = "No response"; statusClass = "rpt-status-err";
        bodyText = "(background disconnected)";
      } else if (!resp.ok) {
        statusText = "Error"; statusClass = "rpt-status-err";
        bodyText = resp.error || "Unknown error";
      } else {
        statusText = resp.status + " " + (resp.statusText || "");
        if      (resp.status < 300) statusClass = "rpt-status-2xx";
        else if (resp.status < 400) statusClass = "rpt-status-3xx";
        else if (resp.status < 500) statusClass = "rpt-status-4xx";
        else                        statusClass = "rpt-status-5xx";

        const headersStr = Object.entries(resp.headers || {}).map(([k,v]) => k + ": " + v).join("\n");
        bodyText = headersStr + "\n\n" + (resp.body || "(empty body)") +
                   (resp.truncated ? "\n\n[… truncated at 8 KB]" : "");
      }

      statusBadge.textContent  = statusText;
      statusBadge.className    = "rpt-status-badge " + statusClass;
      timeBadge.textContent    = elapsed + " ms";
      respPre.textContent      = bodyText;

      // Add to history
      const histEntry = {
        url, method,
        status:    resp ? (resp.ok ? resp.status : "ERR") : "—",
        statusClass,
        ms:        elapsed,
        timestamp: Date.now(),
        response:  { ...(resp || {}) },
        headers:   document.getElementById("rptHeaders").value,
        body:      bodyVal,
      };
      repeater.history.unshift(histEntry);
      if (repeater.history.length > 50) repeater.history.pop();
      renderRepeaterHistory();
    }
  );
}

function renderRepeaterHistory() {
  const list = document.getElementById("rptHistoryList");
  const wrap = document.getElementById("rptHistoryWrap");
  if (!repeater.history.length) { wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  list.innerHTML = "";
  repeater.history.forEach((h, i) => {
    const row = document.createElement("div");
    row.className = "rpt-hist-row";
    row.innerHTML =
      "<span class=\"rpt-hist-method\">" + esc(h.method) + "</span>" +
      "<span class=\"rpt-hist-status " + h.statusClass + "\">" + esc(String(h.status)) + "</span>" +
      "<span class=\"rpt-hist-url\">" + esc(h.url.replace(/^https?:\/\//, "").slice(0, 60)) + "</span>" +
      "<span class=\"rpt-hist-ms\">" + h.ms + "ms</span>";
    row.addEventListener("click", () => {
      // Re-load this history entry into the form
      document.getElementById("rptUrl").value     = h.url;
      document.getElementById("rptMethod").value  = h.method;
      document.getElementById("rptHeaders").value = h.headers || "{}";
      document.getElementById("rptBody").value    = h.body || "";
      // Show its response
      const respArea    = document.getElementById("rptResponseArea");
      const statusBadge = document.getElementById("rptStatusBadge");
      const timeBadge   = document.getElementById("rptTimeBadge");
      const respPre     = document.getElementById("rptResponseBody");
      respArea.classList.remove("hidden");
      statusBadge.textContent = String(h.status);
      statusBadge.className   = "rpt-status-badge " + h.statusClass;
      timeBadge.textContent   = h.ms + " ms";
      const r = h.response;
      if (!r || !r.ok) {
        respPre.textContent = r ? (r.error || "Error") : "(no response)";
      } else {
        const headersStr = Object.entries(r.headers || {}).map(([k,v]) => k + ": " + v).join("\n");
        respPre.textContent = headersStr + "\n\n" + (r.body || "(empty body)") +
                              (r.truncated ? "\n\n[… truncated at 8 KB]" : "");
      }
    });
    list.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE / HELD NETWORK PANEL
// ══════════════════════════════════════════════════════════════════════════════

function setupCache() {
  // Sub-tab switching
  document.querySelectorAll(".cache-subtab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cache-subtab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCacheSubtab = btn.dataset.subtab;
      document.querySelectorAll(".cache-sub-panel").forEach((p) => p.classList.add("hidden"));
      const subId = {
        held:    "cacheSubHeld",
        hits:    "cacheSubHits",
        storage: "cacheSubStorage",
        server:  "cacheSubServer",
      }[currentCacheSubtab];
      if (subId) document.getElementById(subId).classList.remove("hidden");
      loadCachePanel();
    });
  });

  // Scan button — enumerate Cache Storage in the active tab
  document.getElementById("btnEnumCache").addEventListener("click", () => {
    const statusEl = document.getElementById("cacheScanStatus");
    const btn = document.getElementById("btnEnumCache");
    btn.disabled = true;
    statusEl.textContent = "Scanning…";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs && tabs[0] ? tabs[0].id : -1;
      chrome.runtime.sendMessage({ type: "ENUMERATE_CACHE_STORAGE", tabId }, (resp) => {
        btn.disabled = false;
        if (!resp || !resp.ok) {
          statusEl.textContent = resp ? ("Error: " + (resp.error || "unknown")) : "No response";
          return;
        }
        statusEl.textContent = resp.count + " entr" + (resp.count === 1 ? "y" : "ies") + " found";
        if (currentTab === "cache" && currentCacheSubtab === "storage") {
          renderCacheStorage(resp.entries || []);
        }
        updateCounters();
      });
    });
  });
}

function loadCachePanel() {
  chrome.runtime.sendMessage({ type: "GET_CACHE_READER" }, (resp) => {
    if (!resp) return;
    renderCacheHeld(resp.held || []);
    renderCacheHits(resp.cacheHits || []);
    renderCacheStorage(resp.cacheStorage || []);
    renderServerCache(resp.serverCache || []);
  });
}

function renderCacheHeld(queue) {
  const list  = document.getElementById("cacheHeldList");
  const empty = document.getElementById("cacheHeldEmpty");
  document.getElementById("cacheHeldCount").textContent = queue.length;

  list.innerHTML = "";
  if (!queue.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const p of queue) {
    const card = document.createElement("div");
    card.className = "cache-held-card";
    card.innerHTML =
      "<div class=\"cache-held-header\">" +
        "<span class=\"cache-held-rule\">" + esc(p.ruleName || "Intercepted") + "</span>" +
        "<span class=\"cache-held-method\">" + esc(p.method || "GET") + "</span>" +
        "<span class=\"cache-held-time\">" + formatTime(p.timestamp) + "</span>" +
      "</div>" +
      "<div class=\"cache-held-url\">" + esc(trunc(p.url || "", 110)) + "</div>" +
      (Object.keys(p.requestHeaders || {}).length
        ? "<div class=\"cache-held-headers\">" +
            Object.entries(p.requestHeaders).slice(0, 5).map(([k, v]) =>
              "<span class=\"cache-held-hdr\"><b>" + esc(k) + ":</b> " + esc(trunc(String(v), 60)) + "</span>"
            ).join("") +
          "</div>"
        : "") +
      (p.requestBody
        ? "<pre class=\"cache-held-body\">" + esc(trunc(p.requestBody, 300)) + "</pre>"
        : "") +
      "<div class=\"cache-held-actions\">" +
        "<button class=\"cache-held-btn-forward\">&#9654; Forward</button>" +
        "<button class=\"cache-held-btn-repeater\" title=\"Open in Repeater\">&#128225;</button>" +
        "<button class=\"cache-held-btn-drop\">&#10006; Drop</button>" +
      "</div>" +
      "<div class=\"cache-held-response hidden\"><pre class=\"cache-held-response-body\"></pre></div>";

    // Forward
    card.querySelector(".cache-held-btn-forward").addEventListener("click", () => {
      const btn = card.querySelector(".cache-held-btn-forward");
      btn.disabled = true;
      btn.textContent = "Sending…";
      chrome.runtime.sendMessage(
        { type: "MITM_FORWARD", queueId: p.queueId, url: p.url, method: p.method, body: p.requestBody || "", headers: p.requestHeaders || {} },
        (resp) => {
          btn.disabled = false;
          btn.innerHTML = "&#9654; Forward";
          const respArea = card.querySelector(".cache-held-response");
          const respPre  = card.querySelector(".cache-held-response-body");
          respArea.classList.remove("hidden");
          if (!resp || !resp.ok) {
            respPre.textContent = resp ? ("Error: " + (resp.error || "unknown")) : "No response";
            return;
          }
          const headersStr = Object.entries(resp.headers || {}).map(([k, v]) => k + ": " + v).join("\n");
          respPre.textContent = "HTTP " + resp.status + " " + (resp.statusText || "") + "\n" + headersStr + "\n\n" +
            (resp.body || "(empty body)") + (resp.truncated ? "\n[…truncated]" : "");
          card.classList.add("cache-held-done");
          // Re-fetch authoritative queue so count stays accurate after forward
          chrome.runtime.sendMessage({ type: "GET_CACHE_READER" }, (r) => {
            if (r) document.getElementById("cacheHeldCount").textContent = (r.held || []).length;
            updateCounters();
          });
        }
      );
    });

    // Send to Repeater
    card.querySelector(".cache-held-btn-repeater").addEventListener("click", () => {
      loadIntoRepeater({ url: p.url, method: p.method, headers: p.requestHeaders || {}, body: p.requestBody || "", tabId: p.tabId });
    });

    // Drop — re-fetch authoritative queue so held list + count stay in sync
    card.querySelector(".cache-held-btn-drop").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "MITM_DROP", queueId: p.queueId }, () => {
        chrome.runtime.sendMessage({ type: "GET_CACHE_READER" }, (resp) => {
          if (resp) renderCacheHeld(resp.held || []);
          updateCounters();
        });
      });
    });

    list.appendChild(card);
  }
}

function renderCacheHits(caps) {
  const list  = document.getElementById("cacheHitList");
  const empty = document.getElementById("cacheHitEmpty");
  document.getElementById("cacheHitCount").textContent = caps.length;

  list.innerHTML = "";
  if (!caps.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const cap of caps) {
    const item = document.createElement("div");
    item.className = "cache-hit-item";
    const method = cap.method || "GET";
    const statusClass = getStatusClass(cap);
    item.innerHTML =
      "<div class=\"capture-row1\">" +
        "<span class=\"cap-type type-cache\">CACHE</span>" +
        "<span class=\"cap-method\">" + esc(method) + "</span>" +
        "<span class=\"cap-status " + statusClass + "\">" + (cap.statusCode || "") + "</span>" +
        "<span class=\"cap-domain\">" + esc(cap.domain || "") + "</span>" +
        "<span class=\"cap-time\">" + formatTime(cap.timestamp) + "</span>" +
      "</div>" +
      "<div class=\"capture-row2\">" +
        "<span class=\"cap-url\">" + esc(trunc(cap.url || "", 100)) + "</span>" +
        (cap.duration ? "<span class=\"cap-dur\">" + cap.duration + "ms</span>" : "") +
        (cap.responseSize ? "<span class=\"cap-dur\">" + formatBytes(cap.responseSize) + "</span>" : "") +
      "</div>";
    item.addEventListener("click", () => showDetail(cap));
    list.appendChild(item);
  }
}

function renderCacheStorage(entries) {
  const groupList = document.getElementById("cacheStorageGroupList");
  const empty     = document.getElementById("cacheStorageEmpty");
  document.getElementById("cacheStorageCount").textContent = entries.length;

  groupList.innerHTML = "";
  if (!entries.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  // Group by cache name
  const groups = {};
  for (const e of entries) {
    const key = e.cacheName || "(unnamed)";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  for (const [name, items] of Object.entries(groups)) {
    const group = document.createElement("div");
    group.className = "cache-storage-group";
    group.innerHTML =
      "<div class=\"cache-storage-group-header\">" +
        "<span class=\"cache-storage-cache-name\">&#128274; " + esc(name) + "</span>" +
        "<span class=\"cache-storage-count\">" + items.length + " entr" + (items.length === 1 ? "y" : "ies") + "</span>" +
      "</div>";

    const entriesList = document.createElement("div");
    entriesList.className = "cache-storage-entries";

    for (const entry of items) {
      const row = document.createElement("div");
      row.className = "cache-storage-entry";
      const statusColor = entry.status
        ? (entry.status < 300 ? "var(--green)" : entry.status < 400 ? "var(--blue)" : "var(--red)")
        : "var(--text3)";
      row.innerHTML =
        "<div class=\"cache-storage-entry-row1\">" +
          "<span class=\"cache-storage-method\">" + esc(entry.method || "GET") + "</span>" +
          (entry.status
            ? "<span class=\"cache-storage-status\" style=\"color:" + statusColor + "\">" + entry.status + "</span>"
            : "") +
          "<span class=\"cache-storage-url\">" + esc(trunc(entry.url || "", 90)) + "</span>" +
        "</div>" +
        (entry.headers && Object.keys(entry.headers).length
          ? "<div class=\"cache-storage-hdrs\">" +
              ["content-type","cache-control","etag","last-modified","expires"].map((k) =>
                entry.headers[k] ? "<span class=\"cache-hdr-chip\"><b>" + esc(k) + "</b>: " + esc(trunc(entry.headers[k], 40)) + "</span>" : ""
              ).join("") +
            "</div>"
          : "") +
        (entry.body
          ? "<pre class=\"cache-storage-body\">" + esc(trunc(entry.body, 200)) + "</pre>"
          : "");

      // Expand/collapse on click
      row.addEventListener("click", () => {
        const pre = row.querySelector(".cache-storage-body");
        if (pre) pre.classList.toggle("expanded");
      });

      entriesList.appendChild(row);
    }

    group.appendChild(entriesList);
    groupList.appendChild(group);
  }
}

// ── SERVER-SIDE CACHE PANEL ───────────────────────────────────────────────────

const SERVER_CACHE_LAYER_META = {
  cdn:   { label: "CDN",          color: "var(--blue)",   icon: "🌐" },
  proxy: { label: "Proxy Cache",  color: "var(--yellow)", icon: "🔀" },
  ram:   { label: "RAM Cache",    color: "var(--green)",  icon: "⚡" },
  app:   { label: "App Cache",    color: "#a78bfa",       icon: "📦" },
};

const STATUS_COLOR = {
  HIT:         "var(--green)",
  MISS:        "var(--red)",
  BYPASS:      "var(--yellow)",
  STALE:       "var(--yellow)",
  EXPIRED:     "var(--yellow)",
  DYNAMIC:     "#a78bfa",
  REVALIDATED: "var(--blue)",
  UPDATING:    "var(--blue)",
  PASS:        "#888",
  UNKNOWN:     "#888",
};

function statusColor(s) {
  if (!s) return "#888";
  const up = s.toUpperCase();
  if (up in STATUS_COLOR) return STATUS_COLOR[up];
  if (up.includes("HIT"))  return "var(--green)";
  if (up.includes("MISS")) return "var(--red)";
  return "#888";
}

function renderServerCache(caps) {
  const list  = document.getElementById("cacheServerList");
  const empty = document.getElementById("cacheServerEmpty");
  document.getElementById("cacheServerCount").textContent = caps.length;

  list.innerHTML = "";
  if (!caps.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  // Group by domain for readability
  const byDomain = {};
  for (const cap of caps) {
    const domain = cap.domain || "(unknown)";
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(cap);
  }

  for (const [domain, items] of Object.entries(byDomain)) {
    const group = document.createElement("div");
    group.className = "sc-group";

    // Build a quick summary of which CDNs/proxies hit this domain
    const providers = [...new Set(items.map((c) => {
      const sci = c.serverCacheInfo || {};
      return sci.cdnProvider || sci.proxyName || sci.ramName || null;
    }).filter(Boolean))];
    const hits  = items.filter((c) => {
      const sci = c.serverCacheInfo || {};
      const s = sci.cdnStatus || sci.proxyStatus || sci.ramStatus || "";
      return /hit/i.test(s);
    }).length;

    group.innerHTML =
      "<div class=\"sc-group-header\">" +
        "<span class=\"sc-domain\">&#127760; " + esc(domain) + "</span>" +
        "<div class=\"sc-group-pills\">" +
          providers.map((p) => "<span class=\"sc-provider-pill\">" + esc(p) + "</span>").join("") +
          "<span class=\"sc-hit-ratio\">" + hits + "/" + items.length + " HIT</span>" +
        "</div>" +
      "</div>";

    const entriesWrap = document.createElement("div");
    entriesWrap.className = "sc-entries";

    for (const cap of items) {
      const sci = cap.serverCacheInfo || {};
      const layers = sci.layers || [];

      const row = document.createElement("div");
      row.className = "sc-row";

      // Layer badges (CDN → Proxy → RAM → App)
      const layerBadges = layers.map((l) => {
        const meta = SERVER_CACHE_LAYER_META[l.type] || { label: l.type, color: "#888", icon: "◈" };
        const sc = statusColor(l.status);
        return "<span class=\"sc-layer-badge\" style=\"border-color:" + meta.color + ";color:" + meta.color + "\">" +
          meta.icon + " <b>" + esc(l.name) + "</b>" +
          (l.status ? " <span style=\"color:" + sc + "\">" + esc(l.status) + "</span>" : "") +
          (l.extra  ? " <span class=\"sc-layer-extra\">" + esc(trunc(String(l.extra), 24)) + "</span>" : "") +
          (l.hits != null ? " <span class=\"sc-layer-hits\">×" + l.hits + "</span>" : "") +
          "</span>";
      }).join("");

      // Age / TTL bar
      let ageBar = "";
      if (sci.ttl && sci.age != null) {
        const pct = Math.max(0, Math.min(100, Math.round((1 - sci.age / sci.ttl) * 100)));
        const barColor = pct > 60 ? "var(--green)" : pct > 30 ? "var(--yellow)" : "var(--red)";
        ageBar =
          "<div class=\"sc-age-bar-wrap\" title=\"Age " + sci.age + "s / TTL " + sci.ttl + "s — " + pct + "% fresh\">" +
            "<div class=\"sc-age-bar\" style=\"width:" + pct + "%;background:" + barColor + "\"></div>" +
          "</div>" +
          "<span class=\"sc-age-label\">Age " + sci.age + "s / " + sci.ttl + "s TTL</span>";
      } else if (sci.age != null) {
        ageBar = "<span class=\"sc-age-label\">Age " + sci.age + "s</span>";
      }

      // Cache-Control chips
      const ccChips = [];
      if (sci.cacheControl) {
        sci.cacheControl.split(",").map((s) => s.trim()).slice(0, 5).forEach((dir) => {
          ccChips.push("<span class=\"sc-cc-chip\">" + esc(dir) + "</span>");
        });
      }
      if (sci.etag)         ccChips.push("<span class=\"sc-cc-chip\" title=\"ETag\">ETag: " + esc(trunc(sci.etag, 20)) + "</span>");
      if (sci.lastModified) ccChips.push("<span class=\"sc-cc-chip\" title=\"Last-Modified\">LM: " + esc(trunc(sci.lastModified, 28)) + "</span>");

      // Server-Timing summary
      let timingStr = "";
      if (sci.serverTiming && sci.serverTiming.length) {
        timingStr = sci.serverTiming.slice(0, 6).map((st) =>
          "<span class=\"sc-timing-chip\">" + esc(st.name) +
          (st.dur !== undefined ? "=" + st.dur + "ms" : "") +
          (st.desc ? " (" + esc(trunc(st.desc, 18)) + ")" : "") +
          "</span>"
        ).join("");
      }

      row.innerHTML =
        "<div class=\"sc-row-head\">" +
          "<span class=\"sc-method\">" + esc(cap.method || "GET") + "</span>" +
          "<span class=\"sc-status\" style=\"color:" + (cap.statusCode < 400 ? "var(--green)" : "var(--red)") + "\">" + (cap.statusCode || "") + "</span>" +
          "<span class=\"sc-url\">" + esc(trunc(cap.url || "", 90)) + "</span>" +
          "<span class=\"sc-time\">" + formatTime(cap.timestamp) + "</span>" +
        "</div>" +
        (layerBadges ? "<div class=\"sc-layers\">" + layerBadges + "</div>" : "") +
        (ageBar ? "<div class=\"sc-age-row\">" + ageBar + "</div>" : "") +
        (ccChips.length ? "<div class=\"sc-cc-chips\">" + ccChips.join("") + "</div>" : "") +
        (timingStr ? "<div class=\"sc-timing-row\">" + timingStr + "</div>" : "");

      row.addEventListener("click", () => showDetail(cap));
      entriesWrap.appendChild(row);
    }

    group.appendChild(entriesWrap);
    list.appendChild(group);
  }
}

function updateQueueBadge(delta) {
  // Only update the intercept-queue badge, NOT the MITM tab count.
  // The MITM tab count (countMitm) is driven by stats.mitmMatchCount which
  // includes both passive matches AND pending intercepts — updateCounters() owns it.
  const badge = document.getElementById("interceptQueueCount");
  if (!badge) return;
  const cur = parseInt(badge.textContent || "0", 10);
  badge.textContent = Math.max(0, cur + delta);
}

// ── Live updates ──────────────────────────────────────────────────────────────
function listenForNew() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (paused) return;

    // A new request was intercepted and held
    if (msg.type === "NEW_MITM_INTERCEPT") {
      updateCounters();
      if (currentTab === "mitm") {
        // Re-fetch the authoritative queue from background to avoid DOM reconstruction bugs
        chrome.runtime.sendMessage({ type: "GET_MITM_PENDING" }, (resp) => {
          renderMitmPending(resp?.queue || []);
        });
      } else if (currentTab === "cache") {
        // Also refresh the held panel on the Cache tab when a new intercept arrives
        chrome.runtime.sendMessage({ type: "GET_CACHE_READER" }, (resp) => {
          if (resp) renderCacheHeld(resp.held || []);
        });
      }
      return;
    }

    if (msg.type === "NEW_MITM_MATCH") {
      updateCounters();
      if (currentTab === "mitm") {
        const list = document.getElementById("mitmMatchList");
        const empty = document.getElementById("mitmEmpty");
        empty.style.display = "none";
        list.insertBefore(buildCaptureItem(msg.entry), list.firstChild);
        const counter = document.getElementById("mitmMatchCount");
        counter.textContent = parseInt(counter.textContent || "0") + 1;
      }
      return;
    }

    if (msg.type !== "NEW_CAPTURE") return;
    updateCounters();

    const tabs = ["all", "http", "xhr", "fetch", "websocket", "iframe", "dom"];
    if (!tabs.includes(currentTab)) return;
    if (currentTab !== "all" && currentTab !== msg.entry.captureType) return;
    if (searchQuery && !JSON.stringify(msg.entry).toLowerCase().includes(searchQuery.toLowerCase())) return;

    const el = buildCaptureItem(msg.entry);
    captureList.insertBefore(el, captureList.firstChild);
    allCaptures.unshift(msg.entry);
  });
}

// Helper: collect queue IDs currently rendered (to avoid full re-fetch on live push)
function getPendingFromDOM() {
  const cards = document.querySelectorAll("#mitmInterceptList .intercept-card:not(.intercept-done)");
  // We can't reconstruct full pending objects from DOM; just return empty so
  // NEW_MITM_INTERCEPT triggers a full reload from background instead.
  return [];
}

function updateCounters() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (stats) => {
    if (!stats) return;
    totalCounter.textContent = stats.total;
    document.getElementById("countAll").textContent    = stats.total;
    document.getElementById("countHttp").textContent   = stats.http;
    document.getElementById("countXhr").textContent    = stats.xhr || 0;
    document.getElementById("countFetch").textContent  = stats.fetch || 0;
    document.getElementById("countWs").textContent     = stats.websocket;
    document.getElementById("countIframe").textContent = stats.iframe;
    document.getElementById("countDom").textContent    = stats.dom;
    document.getElementById("countStack").textContent  = stats.fingerprintedCount || 0;
    document.getElementById("countMitm").textContent   = stats.mitmMatchCount || 0;
    const badge = document.getElementById("interceptQueueCount");
    if (badge) badge.textContent = stats.pendingInterceptCount || 0;
    // Cache tab: held + http cache hits + storage entries
    const cacheTotal = (stats.pendingInterceptCount || 0) + (stats.cacheHitCount || 0) +
                       (stats.cacheStorageCount || 0) + (stats.serverCacheCount || 0);
    document.getElementById("countCache").textContent = cacheTotal || 0;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function trunc(s, n) { return s.length > n ? s.slice(0, n) + "…" : s; }
function getDomain(url) { try { return new URL(url).hostname; } catch { return url; } }
function formatTime(ts) { if (!ts) return ""; return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" }); }
function formatBytes(b) {
  if (!b) return ""; if (b < 1024) return b + "B"; if (b < 1048576) return (b/1024).toFixed(1)+"KB";
  return (b/1048576).toFixed(1)+"MB";
}
function getStatusClass(cap) {
  if (!cap.statusCode) return cap.status === "error" ? "status-error" : "status-pending";
  if (cap.statusCode < 300) return "status-ok";
  if (cap.statusCode < 400) return "status-redirect";
  return "status-error";
}

// ══════════════════════════════════════════════════════════════════════════════
// 1xBet Proxy Tab
// ══════════════════════════════════════════════════════════════════════════════

(function () {
  // ── Helpers ────────────────────────────────────────────────────────────────
  function xMsg(id, text, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'xbet-msg ' + (type || '');
    if (type === 'ok') setTimeout(function () { el.textContent = ''; el.className = 'xbet-msg'; }, 3000);
  }

  function xbetRenderStatus(cfg) {
    // Connection badge
    var badge = document.getElementById('xbetBadge');
    var connDot = document.getElementById('xbetConnDot');
    var connLabel = document.getElementById('xbetConnLabel');
    var proxyDot = document.getElementById('xbetProxyDot');
    var proxyLabel = document.getElementById('xbetProxyLabel');
    var pingInfo = document.getElementById('xbetLastPingInfo');

    var ping = cfg.xbetLastPing || null;
    if (ping && ping.ok) {
      badge.textContent = 'CONNECTED';
      badge.className = 'xbet-badge ok';
      connDot.className = 'xbet-dot xbet-dot-conn';
      connLabel.textContent = 'OK';
      connLabel.className = 'xbet-val-on';
      var ago = ping.ts ? Math.round((Date.now() - ping.ts) / 1000) : null;
      pingInfo.textContent = ago !== null ? 'Last ping ' + ago + 's ago — HTTP ' + (ping.status || '?') : '';
    } else if (ping && !ping.ok) {
      badge.textContent = 'ERROR';
      badge.className = 'xbet-badge err';
      connDot.className = 'xbet-dot xbet-dot-err';
      connLabel.textContent = 'FAIL';
      connLabel.className = 'xbet-val-off';
      pingInfo.textContent = ping.error ? 'Error: ' + ping.error.slice(0, 60) : 'Connection failed';
    } else {
      badge.textContent = 'NOT SET';
      badge.className = 'xbet-badge';
      connDot.className = 'xbet-dot';
      connLabel.textContent = '–';
      connLabel.className = 'xbet-val-off';
      pingInfo.textContent = 'Enter your app URL below and save';
    }

    // Proxy status
    var px = cfg.xbetProxyConfig || null;
    if (px && px.enabled && px.host && px.port) {
      proxyDot.className = 'xbet-dot xbet-dot-on';
      proxyLabel.textContent = (px.type || 'http').toUpperCase() + ' ' + px.host + ':' + px.port;
      proxyLabel.className = 'xbet-val-on';
    } else {
      proxyDot.className = 'xbet-dot';
      proxyLabel.textContent = 'OFF';
      proxyLabel.className = 'xbet-val-off';
    }
  }

  // ── Load saved config ──────────────────────────────────────────────────────
  function xbetLoad() {
    chrome.runtime.sendMessage({ type: 'XBET_GET_CONFIG' }, function (cfg) {
      if (!cfg) return;
      var urlEl = document.getElementById('xbetAppUrl');
      if (urlEl && cfg.xbetAppUrl) urlEl.value = cfg.xbetAppUrl;

      var px = cfg.xbetProxyConfig || {};
      var enableEl = document.getElementById('xbetProxyEnabled');
      var typeEl   = document.getElementById('xbetProxyType');
      var hostEl   = document.getElementById('xbetProxyHost');
      var portEl   = document.getElementById('xbetProxyPort');
      if (enableEl) enableEl.checked     = !!px.enabled;
      if (typeEl)   typeEl.value         = px.type || 'http';
      if (hostEl)   hostEl.value         = px.host || '';
      if (portEl)   portEl.value         = px.port || '';

      xbetRenderStatus(cfg);
    });
  }

  // ── Wire buttons once DOM is ready ─────────────────────────────────────────
  function xbetSetup() {
    var saveUrlBtn   = document.getElementById('xbetSaveUrl');
    var pingNowBtn   = document.getElementById('xbetPingNow');
    var saveProxyBtn = document.getElementById('xbetSaveProxy');
    var clearProxyBtn= document.getElementById('xbetClearProxy');

    if (saveUrlBtn) saveUrlBtn.addEventListener('click', function () {
      var url = (document.getElementById('xbetAppUrl') || {}).value || '';
      url = url.trim();
      if (!url) { xMsg('xbetUrlMsg', '✗ Enter a URL first', 'err'); return; }
      chrome.runtime.sendMessage({ type: 'XBET_SAVE', appUrl: url }, function (r) {
        if (r && r.ok) xMsg('xbetUrlMsg', '✓ Saved — pinging…', 'ok');
        setTimeout(xbetLoad, 2000); // refresh after ping completes
      });
    });

    if (pingNowBtn) pingNowBtn.addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'XBET_PING_NOW' }, function () {
        xMsg('xbetUrlMsg', '↑ Pinged', 'ok');
        setTimeout(xbetLoad, 1500);
      });
    });

    if (saveProxyBtn) saveProxyBtn.addEventListener('click', function () {
      var host = ((document.getElementById('xbetProxyHost') || {}).value || '').trim();
      var port = parseInt(((document.getElementById('xbetProxyPort') || {}).value || ''), 10);
      if (!host || !port || port < 1 || port > 65535) {
        xMsg('xbetProxyMsg', '✗ Enter valid host and port', 'err');
        return;
      }
      var cfg = {
        enabled: !!(document.getElementById('xbetProxyEnabled') || {}).checked,
        type:    ((document.getElementById('xbetProxyType') || {}).value) || 'http',
        host: host, port: port,
      };
      chrome.runtime.sendMessage({ type: 'XBET_SAVE', proxyConfig: cfg }, function (r) {
        if (r && r.ok) { xMsg('xbetProxyMsg', '✓ Proxy saved & applied', 'ok'); xbetLoad(); }
      });
    });

    if (clearProxyBtn) clearProxyBtn.addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'XBET_CLEAR_PROXY' }, function () {
        var h = document.getElementById('xbetProxyHost');
        var p = document.getElementById('xbetProxyPort');
        var e = document.getElementById('xbetProxyEnabled');
        if (h) h.value = ''; if (p) p.value = ''; if (e) e.checked = false;
        xMsg('xbetProxyMsg', '✓ Proxy cleared', 'ok');
        xbetLoad();
      });
    });

    // Refresh status when ping result comes back
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg && msg.type === 'XBET_PING_RESULT') xbetLoad();
    });
  }

  // ── Hook into existing tab system ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    xbetSetup();
    xbetLoad();

    // Extend existing tab switcher to show/hide #panelXbet
    var panelXbet = document.getElementById('panelXbet');
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (panelXbet) panelXbet.classList.add('hidden');
        if (tab.dataset.tab === 'xbet' && panelXbet) {
          panelXbet.classList.remove('hidden');
          xbetLoad();
        }
      });
    });
  });
})();
