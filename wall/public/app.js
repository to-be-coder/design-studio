// @ts-check
// Studio Wall — front end. Ambient by default, operator on intent.
// No framework, no build. All visual values live in tokens.css.
// Typed JS: shapes live in ../types.d.ts; `npm run check` enforces them (decision 0006).

/** @typedef {import('../types.js').WallState} WallState */
/** @typedef {import('../types.js').Project} Project */
/** @typedef {import('../types.js').PaletteAction} PaletteAction */

/** @param {string} id @returns {HTMLElement} */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const token = () => localStorage.getItem('wall-token') || '';

/** @type {WallState | null} */
let state = null;
/** @type {PaletteAction[]} */
let paletteItems = [];
/** @type {PaletteAction[]} */
let paletteRowsVisible = [];
let paletteIndex = 0;
/** @type {string | null} */
let confirmArmed = null; // action id awaiting second Enter
/** @type {EventSource | null} */
let es = null;

// ── api ──
/** @param {string} path @param {RequestInit} [opts] @returns {Promise<Response>} */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { ...(opts.headers || {}), authorization: `Bearer ${token()}` },
  });
  if (res.status === 401 || res.status === 403) { showGate(); throw new Error('unauthorized'); }
  return res;
}

// ── load + render ──
async function load() {
  try {
    const res = await api('/api/state');
    state = /** @type {WallState} */ (await res.json());
    render();
    if (!es) subscribe();
  } catch { /* gate shown */ }
}

function subscribe() {
  es = new EventSource(`/api/events?token=${encodeURIComponent(token())}`);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let t;
  es.addEventListener('state', () => { clearTimeout(t); t = setTimeout(load, 400); });
  es.onerror = () => { es?.close(); es = null; setTimeout(subscribe, 15000); };
}

function render() {
  const s = state;
  if (!s) return;
  $('today').textContent = new Date().toLocaleDateString(undefined,
    { weekday: 'long', month: 'long', day: 'numeric' });

  const health = $('health');
  if (!s.vaultOk) {
    $('grid').hidden = true; $('setup-state').hidden = false;
    health.innerHTML = `<i class="dot" data-dot="warn"></i><span>no vault</span>`;
    return;
  }
  $('grid').hidden = false; $('setup-state').hidden = true;
  health.innerHTML = s.claude
    ? `<i class="dot" data-dot="ok"></i><span>ready</span>`
    : `<i class="dot" data-dot="warn"></i><span>claude cli not found</span>`;

  // the one primary action
  const pa = /** @type {HTMLButtonElement} */ ($('primary-action'));
  const prim = s.primary;
  if (prim && s.claude) {
    pa.hidden = false; pa.textContent = prim.label;
    pa.onclick = () => openPalette(prim.skill);
  } else pa.hidden = true;

  renderPortfolio(s);
  renderWiki(s);
  renderPrototypes(s);
  renderActivity(s);
}

/** @param {WallState} s */
function renderPortfolio(s) {
  const items = s.portfolio;
  const active = items.filter(p => p.status === 'active');
  $('pf-metric').textContent = `${active.length} active`;
  $('pf-sub').textContent = items.slice(0, 3).map(p => p.slug).join(' · ') || '';

  /** @type {Record<string, number>} */
  const stages = {};
  for (const p of active) stages[p.stage] = (stages[p.stage] || 0) + 1;
  $('pf-chips').innerHTML = Object.entries(stages)
    .map(([st, n], i) => `<span class="chip${i === 0 ? ' active' : ''}">${esc(st)} ${n}</span>`).join('')
    || `<span class="chip">no active projects</span>`;

  const MAX = 8;
  const rows = items.slice(0, MAX).map((p, i) => `
    <button class="t-row" data-drill="${i}" role="listitem">
      <span>${esc(p.slug)}</span>
      <span class="stage"><i class="dot" data-dot="${p.health === 'warn' ? 'warn' : 'ok'}"></i>${esc(p.stage)}</span>
      <span class="num">${p.idleDays}d</span>
    </button>`).join('');
  $('pf-table').innerHTML = items.length
    ? rows + (items.length > MAX ? `<p class="overflow-note">…and ${items.length - MAX} more — ⌘K to search</p>` : '')
    : `<p class="empty-inline">No projects yet — start one with <span class="mono">/design-studio-debrief</span></p>`;
  const drillRows = /** @type {NodeListOf<HTMLElement>} */ ($('pf-table').querySelectorAll('[data-drill]'));
  drillRows.forEach(b =>
    b.addEventListener('click', () => drillProject(items[Number(b.dataset.drill)])));
}

/** @param {WallState} s */
function renderWiki(s) {
  if (!s.wiki) {
    $('wk-metric').textContent = '—';
    $('wk-sub').textContent = '';
    $('wk-log').innerHTML = `<p class="empty-inline">No Studio Wiki yet — seed one with <span class="mono">/design-studio-harvest</span></p>`;
    return;
  }
  $('wk-metric').textContent = `${s.wiki.pages} pages`;
  $('wk-sub').textContent = `${s.wiki.sparks} sparks on the shelf`;
  $('wk-log').innerHTML = s.wiki.log.map(l => `<span>${esc(l.replace(/^## /, ''))}</span>`).join('');
}

/** @param {WallState} s */
function renderPrototypes(s) {
  $('proto-list').innerHTML = s.prototypes.length
    ? s.prototypes.map(p =>
        `<a href="${esc(p.repo)}" target="_blank" rel="noopener">${esc(p.slug)}<p class="sub">${esc(p.repo)}</p></a>`).join('')
    : `<p class="empty-inline">No prototype repos linked yet — <span class="mono">build</span> fills these in.</p>`;
}

/** @param {WallState} s */
function renderActivity(s) {
  $('activity').innerHTML = s.activity.length
    ? s.activity.map(a => {
        const t = a.ts ? new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="f-row"><time>${t}</time><span>${esc(a.text)}</span></div>`;
      }).join('')
    : `<p class="empty-inline">Quiet. Activity from runs and the wiki log lands here.</p>`;
}

// ── command palette: the home of every secondary action ──
/** @returns {PaletteAction[]} */
function paletteActions() {
  /** @type {PaletteAction[]} */
  const acts = [];
  const runnable = !!state?.claude;
  acts.push({ tag: 'run', id: 'wiki-lint', label: 'Run wiki-lint — report only', kind: 'run', disabled: !runnable });
  acts.push({ tag: 'run', id: 'harvest-draft', label: 'Preview harvest crossing (draft)', kind: 'run', disabled: !runnable });
  acts.push({ tag: '🔴 handoff', id: 'h-debrief', label: 'Start a project — copies /design-studio-debrief', kind: 'copy', text: '/design-studio-debrief' });
  acts.push({ tag: '🔴 handoff', id: 'h-harvest', label: 'Review a crossing — copies /design-studio-harvest', kind: 'copy', text: '/design-studio-harvest' });
  for (const p of state?.portfolio || [])
    acts.push({ tag: 'open', id: `p-${p.slug}`, label: `${p.slug} — project detail`, kind: 'drill', project: p });
  acts.push({ tag: 'wall', id: 'refresh', label: 'Refresh state', kind: 'refresh' });
  if (!runnable) acts.push({ tag: 'hint', id: 'no-claude', label: 'Runs disabled: claude CLI not found on PATH', kind: 'noop', disabled: true });
  return acts;
}

/** @param {string | null} [preselect] */
function openPalette(preselect = null) {
  confirmArmed = null;
  $('palette-overlay').hidden = false;
  const input = /** @type {HTMLInputElement} */ ($('palette-input'));
  input.value = '';
  paletteItems = paletteActions();
  paletteIndex = Math.max(0, paletteItems.findIndex(a => a.id === preselect));
  renderPalette();
  input.focus();
}
function closePalette() { $('palette-overlay').hidden = true; confirmArmed = null; }

function renderPalette() {
  const q = (/** @type {HTMLInputElement} */ ($('palette-input'))).value.toLowerCase();
  const visible = paletteItems.filter(a => a.label.toLowerCase().includes(q));
  if (paletteIndex >= visible.length) paletteIndex = Math.max(0, visible.length - 1);
  $('palette-rows').innerHTML = visible.map((a, i) => {
    const confirming = confirmArmed === a.id;
    return `<button class="p-row${a.disabled ? ' disabled' : ''}${confirming ? ' confirm' : ''}"
      role="option" aria-selected="${i === paletteIndex}" data-i="${i}">
      <span class="tag">${a.tag}</span>
      <span class="lbl">${confirming ? `Press Enter again to ${esc(a.label)}` : esc(a.label)}</span>
      <span class="k">${a.kind === 'run' ? (confirming ? '⏎ confirm' : '⏎') : a.kind === 'copy' ? '⌘C' : '→'}</span>
    </button>`;
  }).join('') || `<p class="empty-inline" style="padding:12px 18px">Nothing matches.</p>`;
  const rows = /** @type {NodeListOf<HTMLElement>} */ ($('palette-rows').querySelectorAll('.p-row'));
  rows.forEach(b =>
    b.addEventListener('click', () => { paletteIndex = Number(b.dataset.i); activate(visible[paletteIndex]); }));
  paletteRowsVisible = visible;
}

/** @param {PaletteAction | undefined} a */
function activate(a) {
  if (!a || a.disabled) return;
  if (a.kind === 'run') {
    if (confirmArmed !== a.id) { confirmArmed = a.id; renderPalette(); return; }
    confirmArmed = null; closePalette(); doRun(a.id, a.label);
  } else if (a.kind === 'copy') {
    if (a.text) navigator.clipboard?.writeText(a.text);
    toast(`Copied — paste into Claude Code: ${a.text || ''}`);
    closePalette();
  } else if (a.kind === 'drill') {
    closePalette();
    if (a.project) drillProject(a.project);
  } else if (a.kind === 'refresh') { closePalette(); load(); toast('Refreshed'); }
}

// ── runs: stream into a drill-in ──
/** @param {string} skill @param {string} label */
async function doRun(skill, label) {
  openDrill(label, `<pre id="run-out" aria-live="polite">…</pre>`);
  const out = $('run-out');
  out.textContent = '';
  try {
    const res = await api(`/api/run/${skill}`, { method: 'POST' });
    if (!res.ok) { out.textContent = `Run refused: ${(await res.json()).error}`; return; }
    if (!res.body) { out.textContent = 'Run started but the stream is unavailable.'; return; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out.textContent += dec.decode(value, { stream: true });
      out.scrollTop = out.scrollHeight;
    }
  } catch (e) {
    if (e instanceof Error && e.message !== 'unauthorized') out.textContent += `\n▸ connection lost`;
  }
  load();
}

// ── drill-ins ──
/** @param {string} title @param {string} bodyHTML */
function openDrill(title, bodyHTML) {
  $('drill-title').textContent = title;
  $('drill-body').innerHTML = bodyHTML;
  $('drill-overlay').hidden = false;
  $('drill-close').focus();
}
function closeDrill() { $('drill-overlay').hidden = true; }

/** @param {Project | undefined} p */
function drillProject(p) {
  if (!p) return;
  openDrill(p.slug, `
    <dl class="kv">
      <dt>stage</dt><dd>${esc(p.stage)}</dd>
      <dt>status</dt><dd><i class="dot" data-dot="${p.health === 'warn' ? 'warn' : 'ok'}"></i>${esc(p.status)}</dd>
      <dt>route</dt><dd>${esc(p.route || '—')}</dd>
      <dt>started</dt><dd>${esc(p.started || '—')}</dd>
      <dt>idle</dt><dd>${p.idleDays} days</dd>
      <dt>harvest flags</dt><dd>${p.flags}</dd>
      <dt>prototype</dt><dd>${p.prototype_repo ? `<a href="${esc(p.prototype_repo)}" target="_blank" rel="noopener">${esc(p.prototype_repo)}</a>` : '—'}</dd>
    </dl>`);
}

// ── token gate ──
function showGate() {
  $('gate-overlay').hidden = false;
  $('gate-input').focus();
}
$('gate-save').addEventListener('click', () => {
  localStorage.setItem('wall-token', (/** @type {HTMLInputElement} */ ($('gate-input'))).value.trim());
  $('gate-overlay').hidden = true;
  load();
});
$('gate-input').addEventListener('keydown', e => {
  if (/** @type {KeyboardEvent} */ (e).key === 'Enter') $('gate-save').click();
});

// ── toast ──
/** @type {ReturnType<typeof setTimeout> | undefined} */
let toastTimer;
/** @param {string} msg */
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ── keyboard ──
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if ($('palette-overlay').hidden) openPalette(); else closePalette();
    return;
  }
  if (e.key === 'Escape') {
    if (!$('palette-overlay').hidden) {
      if (confirmArmed) { confirmArmed = null; renderPalette(); } else closePalette();
    } else if (!$('drill-overlay').hidden) closeDrill();
    return;
  }
  if ($('palette-overlay').hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(paletteIndex + 1, paletteRowsVisible.length - 1); confirmArmed = null; renderPalette(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(paletteIndex - 1, 0); confirmArmed = null; renderPalette(); }
  if (e.key === 'Enter') { e.preventDefault(); activate(paletteRowsVisible[paletteIndex]); }
});
$('palette-input').addEventListener('input', () => { paletteIndex = 0; confirmArmed = null; renderPalette(); });
document.querySelectorAll('[data-palette-open]').forEach(b => b.addEventListener('click', () => openPalette()));
$('drill-close').addEventListener('click', closeDrill);
$('palette-overlay').addEventListener('click', e => { if (e.target === $('palette-overlay')) closePalette(); });
$('drill-overlay').addEventListener('click', e => { if (e.target === $('drill-overlay')) closeDrill(); });

// ── util ──
/** @param {unknown} s @returns {string} */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }

load();
