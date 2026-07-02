#!/usr/bin/env node
// @ts-check
// Studio Wall — zero-dependency server for the design-studio vault.
// Read views over the vault + a token-gated, allowlisted run API.
// Typed JS: shapes live in ./types.d.ts; `npm run check` enforces them (decision 0006).
// See wall/README.md for the security model. Node 18+.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** @typedef {import('./types.js').WallState} WallState */
/** @typedef {import('./types.js').Project} Project */
/** @typedef {import('./types.js').AllowlistEntry} AllowlistEntry */
/** @typedef {import('./types.js').RunLogEntry} RunLogEntry */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const PORT = Number(process.env.WALL_PORT || 4411);
const POLL_MS = 10_000;
const RUN_TIMEOUT_MS = 5 * 60_000;

// ── vault resolution: env override, then the product's pointer file ──
/** @returns {string | null} */
function resolveVault() {
  if (process.env.DESIGN_STUDIO_VAULT) return process.env.DESIGN_STUDIO_VAULT;
  try {
    const v = fs.readFileSync(path.join(os.homedir(), '.design-studio-vault'), 'utf8').trim();
    return v || null;
  } catch { return null; }
}

// ── token: generated once, shown once ──
const tokenFile = process.env.WALL_TOKEN_FILE || path.join(os.homedir(), '.design-studio-wall-token');
let TOKEN = '';
try { TOKEN = fs.readFileSync(tokenFile, 'utf8').trim(); } catch { /* first run */ }
if (!TOKEN) {
  TOKEN = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(tokenFile, TOKEN + '\n', { mode: 0o600 });
}

const runLogFile = process.env.WALL_RUN_LOG || path.join(os.homedir(), '.design-studio-wall.log');

// ── the control surface: server-side allowlist, argv arrays, no shell ──
/** @type {Record<string, AllowlistEntry>} */
const ALLOWLIST = {
  'wiki-lint': {
    label: 'Run wiki-lint — report only',
    argv: ['-p', 'Run /design-studio-wiki-lint in report-only mode: perform every check and print the full report. Propose fixes but do NOT write or modify any files.'],
  },
  'harvest-draft': {
    label: 'Preview harvest crossing (draft)',
    argv: ['-p', 'Run /design-studio-harvest in draft-preview mode: read the active project record and print the proposed crossing (pages, edits, supersedes) as a report only. Do NOT write to the Studio Wiki. End by telling the user to review and approve the crossing in Claude Code.'],
  },
};

const CLAUDE_BIN = process.env.WALL_CLAUDE_BIN || 'claude';
/** @returns {boolean} */
function claudeAvailable() {
  try { return spawnSync(CLAUDE_BIN, ['--version'], { timeout: 4000 }).status === 0; }
  catch { return false; }
}

// ── tiny frontmatter reader (dashboard contract only) ──
/** @param {string} text @returns {Record<string, string>} */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    out[kv[1]] = kv[2].split('#')[0].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** @param {string} p @returns {string | null} */
function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

/** @param {string} p @returns {string[]} */
function listDirs(p) {
  try { return fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); }
  catch { return []; }
}

/** @param {string} dir @returns {number} */
function newestMtime(dir) {
  let t = 0;
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const st = fs.statSync(path.join(dir, e.name));
      t = Math.max(t, st.mtimeMs);
      if (e.isDirectory()) {
        try {
          for (const f of fs.readdirSync(path.join(dir, e.name))) {
            t = Math.max(t, fs.statSync(path.join(dir, e.name, f)).mtimeMs);
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return t;
}

/** @param {string} projectDir @returns {number} */
function harvestFlagCount(projectDir) {
  const text = safeRead(path.join(projectDir, 'Harvest.md'));
  if (!text) return 0;
  const undistilled = text.split(/^##\s+Distilled/m)[0];
  return (undistilled.match(/^- /gm) || []).length;
}

/** @param {string} projectDir @returns {{decisions: number, deviations: number}} */
function decisionCounts(projectDir) {
  let decisions = 0, deviations = 0;
  try {
    for (const f of fs.readdirSync(path.join(projectDir, 'Decisions'))) {
      if (!f.endsWith('.md')) continue;
      const fm = frontmatter(safeRead(path.join(projectDir, 'Decisions', f)) || '');
      decisions++;
      if ((fm.tags || '').includes('deviation')) deviations++;
    }
  } catch { /* no Decisions/ yet */ }
  return { decisions, deviations };
}

// ── vault readers ──
/** @returns {WallState} */
function readState() {
  const vault = resolveVault();
  /** @type {WallState} */
  const state = {
    generatedAt: new Date().toISOString(),
    vault, vaultOk: false, claude: claudeAvailable(),
    portfolio: [], wiki: null, prototypes: [], activity: [], primary: null,
  };
  if (!vault || !fs.existsSync(vault)) return state;
  state.vaultOk = true;

  const dsDir = path.join(vault, 'Design Studio');
  for (const slug of listDirs(dsDir)) {
    if (slug.startsWith('_') || slug.startsWith('.')) continue;
    const pdir = path.join(dsDir, slug);
    const fm = frontmatter(safeRead(path.join(pdir, '00 Dashboard.md')) || '');
    if (fm.type !== 'design-project') continue;
    const idleDays = (Date.now() - newestMtime(pdir)) / 86_400_000;
    const counts = decisionCounts(pdir);
    state.portfolio.push({
      slug, status: fm.status || 'active', stage: fm.stage || '—',
      client: fm.client || '', route: fm.route || '', started: fm.started || '',
      prototype_repo: fm.prototype_repo || '',
      idleDays: Math.round(idleDays * 10) / 10,
      flags: harvestFlagCount(pdir),
      decisions: counts.decisions, deviations: counts.deviations,
      health: fm.status !== 'active' ? 'ok' : idleDays > 5 ? 'warn' : 'ok',
    });
    if (fm.prototype_repo) state.prototypes.push({ slug, repo: fm.prototype_repo });
  }
  state.portfolio.sort((a, b) => a.idleDays - b.idleDays);

  const wikiDir = path.join(vault, 'Studio Wiki');
  if (fs.existsSync(wikiDir)) {
    const pages = (() => { try { return fs.readdirSync(path.join(wikiDir, 'wiki')).filter(f => f.endsWith('.md')).length; } catch { return 0; } })();
    const sparks = ((safeRead(path.join(wikiDir, '_sparks.md')) || '').match(/^- \[\[/gm) || []).length;
    const logLines = ((safeRead(path.join(wikiDir, 'log.md')) || '').match(/^## \[.*$/gm) || []);
    const lastLint = logLines.filter(l => l.includes('lint')).pop() || null;
    state.wiki = { pages, sparks, log: logLines.slice(-6).reverse(), lastLint };
  }

  // activity: wiki log + wall run log, newest first
  const runLines = (safeRead(runLogFile) || '').trim().split('\n').filter(Boolean).slice(-10)
    .map(l => { try { return /** @type {RunLogEntry} */ (JSON.parse(l)); } catch { return null; } });
  const runs = /** @type {RunLogEntry[]} */ (runLines.filter(Boolean));
  state.activity = [
    ...runs.map(r => ({ ts: r.ts, text: `${r.skill} — ${r.ok ? 'completed' : 'failed'} · run from wall · ${Math.round(r.ms / 1000)}s` })),
    ...(state.wiki ? state.wiki.log.map(l => ({ ts: null, text: l.replace(/^## /, '') })) : []),
  ].slice(0, 8);

  // one computed primary action — singular by design
  const doneWithFlags = state.portfolio.find(p => (p.status === 'done' || p.status === 'archived') && p.flags > 0);
  let lintStale = false;
  if (state.wiki) {
    if (!state.wiki.lastLint) lintStale = true;
    else {
      const m = /\[(\d{4}-\d{2}-\d{2})\]/.exec(state.wiki.lastLint);
      lintStale = !m || (Date.now() - Date.parse(m[1])) > 7 * 86_400_000;
    }
  }
  if (doneWithFlags) {
    state.primary = { kind: 'run', skill: 'harvest-draft', label: `Preview crossing — ${doneWithFlags.slug} has ${doneWithFlags.flags} flags` };
  } else if (state.wiki && lintStale) {
    state.primary = { kind: 'run', skill: 'wiki-lint', label: 'Run wiki-lint' };
  }
  return state;
}

// ── auth ──
/** @param {http.IncomingMessage} req @param {URL} url @returns {boolean} */
function authorized(req, url) {
  const origin = req.headers.origin;
  if (typeof origin === 'string' &&
      !origin.startsWith(`http://${HOST}:`) && !origin.startsWith('http://localhost:')) return false;
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const supplied = bearer || url.searchParams.get('token');
  if (!supplied) return false;
  return crypto.timingSafeEqual(
    Buffer.from(supplied.padEnd(64).slice(0, 64)),
    Buffer.from(TOKEN.padEnd(64).slice(0, 64)));
}

// ── SSE: state-change poller ──
/** @type {Set<http.ServerResponse>} */
const sseClients = new Set();
let lastSig = 'init';
/** @returns {string} */
function signature() {
  const vault = resolveVault();
  if (!vault) return 'no-vault';
  let sig = '';
  for (const sub of ['Design Studio', 'Studio Wiki']) sig += ':' + newestMtime(path.join(vault, sub));
  return sig;
}
setInterval(() => {
  const sig = signature();
  if (sig !== lastSig) {
    lastSig = sig;
    for (const res of sseClients) res.write('event: state\ndata: changed\n\n');
  } else {
    for (const res of sseClients) res.write(': heartbeat\n\n');
  }
}, POLL_MS).unref();

// ── run handling ──
/** @type {import('node:child_process').ChildProcess | null} */
let activeRun = null;
/** @param {RunLogEntry} entry */
function appendRunLog(entry) { try { fs.appendFileSync(runLogFile, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ } }

// ── static files ──
/** @type {Record<string, string>} */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

/** @param {http.ServerResponse} res @param {string} name */
function serveStatic(res, name) {
  const file = path.join(__dirname, 'public', name === '/' ? 'index.html' : name);
  if (!file.startsWith(path.join(__dirname, 'public'))) { res.writeHead(404); res.end(); return; }
  const body = safeRead(file);
  if (body === null) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'text/plain' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

  if (!url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    serveStatic(res, url.pathname);
    return;
  }

  if (!authorized(req, url)) {
    res.writeHead(url.searchParams.has('token') || req.headers.authorization ? 403 : 401,
      { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (url.pathname === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(readState()));
    return;
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (url.pathname.startsWith('/api/run/') && req.method === 'POST') {
    const skill = url.pathname.slice('/api/run/'.length);
    const entry = ALLOWLIST[skill];
    if (!entry) { res.writeHead(403, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'not allowlisted' })); return; }
    if (activeRun) { res.writeHead(409, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'a run is already active' })); return; }
    const vault = resolveVault();
    if (!vault) { res.writeHead(409, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'no vault configured' })); return; }

    const started = Date.now();
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' });
    res.write(`▸ ${skill} started\n`);
    const child = spawn(CLAUDE_BIN, entry.argv, { cwd: vault, stdio: ['ignore', 'pipe', 'pipe'] });
    activeRun = child;
    const timeout = setTimeout(() => child.kill('SIGKILL'), RUN_TIMEOUT_MS);
    child.stdout?.on('data', d => res.write(d));
    child.stderr?.on('data', d => res.write(d));
    let finished = false;
    /** @param {number | null} code */
    const finish = (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout); activeRun = null;
      const ms = Date.now() - started;
      appendRunLog({ ts: new Date().toISOString(), skill, ms, ok: code === 0 });
      res.end(`\n▸ ${skill} ${code === 0 ? 'completed' : `exited ${code}`} in ${Math.round(ms / 1000)}s\n`);
      lastSig = 'force-refresh'; // force a state event on next poll
    };
    child.on('error', () => finish(-1));
    child.on('close', (code) => finish(code));
    req.on('close', () => { if (activeRun === child) child.kill('SIGTERM'); });
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, HOST, () => {
  const vault = resolveVault();
  console.log(`\nStudio Wall  http://${HOST}:${PORT}`);
  console.log(`vault        ${vault || 'NOT CONFIGURED — run /design-studio-setup'}`);
  console.log(`token        ${TOKEN}`);
  console.log(`             (stored in ${tokenFile} — paste into the wall once)\n`);
});
