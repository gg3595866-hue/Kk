// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg ' + type;
  if (type === 'ok') setTimeout(() => { el.textContent = ''; el.className = 'msg'; }, 3000);
}

function updateStatusPanel(cfg) {
  const dot    = document.getElementById('proxy-dot');
  const status = document.getElementById('proxy-status');
  const detail = document.getElementById('proxy-detail');

  if (cfg && cfg.enabled && cfg.host && cfg.port) {
    dot.classList.remove('off');
    status.className = 'on';
    status.textContent = 'ON';
    detail.style.display = 'block';
    detail.innerHTML = `<strong>${cfg.type.toUpperCase()}</strong> ${cfg.host}:${cfg.port}`;
  } else {
    dot.classList.add('off');
    status.className = 'off';
    status.textContent = 'OFF';
    detail.style.display = 'none';
  }
}

// ─── Load saved proxy config ──────────────────────────────────────────────────
chrome.storage.local.get(['proxyConfig'], (result) => {
  const cfg = result.proxyConfig || {};
  document.getElementById('proxy-enabled').checked = !!cfg.enabled;
  document.getElementById('proxy-type').value = cfg.type || 'http';
  document.getElementById('proxy-host').value = cfg.host || '';
  document.getElementById('proxy-port').value = cfg.port || '';
  updateStatusPanel(cfg);
});

// ─── Save & apply ─────────────────────────────────────────────────────────────
document.getElementById('save-proxy').addEventListener('click', () => {
  const host = document.getElementById('proxy-host').value.trim();
  const port = parseInt(document.getElementById('proxy-port').value.trim(), 10);

  if (!host || !port || port < 1 || port > 65535) {
    showMsg('proxy-msg', '✗ Enter a valid host and port', 'err');
    return;
  }

  const cfg = {
    enabled: document.getElementById('proxy-enabled').checked,
    type:    document.getElementById('proxy-type').value,
    host,
    port,
  };

  chrome.storage.local.set({ proxyConfig: cfg }, () => {
    updateStatusPanel(cfg);
    showMsg('proxy-msg', '✓ Proxy saved & applied', 'ok');
  });
});

// ─── Clear proxy ──────────────────────────────────────────────────────────────
document.getElementById('clear-proxy').addEventListener('click', () => {
  const cfg = { enabled: false, type: 'http', host: '', port: '' };
  chrome.storage.local.set({ proxyConfig: cfg }, () => {
    document.getElementById('proxy-enabled').checked = false;
    document.getElementById('proxy-host').value = '';
    document.getElementById('proxy-port').value = '';
    updateStatusPanel(cfg);
    showMsg('proxy-msg', '✓ Proxy cleared', 'ok');
  });
});
