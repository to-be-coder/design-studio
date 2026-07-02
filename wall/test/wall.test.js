// @ts-check
// Studio Wall — end-to-end regression suite. Plain node script: `npm test`.
// Self-contained: builds a temp fixture vault, stubs the claude CLI via the
// WALL_CLAUDE_BIN seam, spawns two real server instances, then asserts over
// HTTP and a real chromium (playwright devDependency; browsers via
// `npx playwright install chromium` if missing). Exits non-zero on failure.
// Born from the preview that caught the [hidden]-overlay defect — the checks
// here click with a mouse precisely because keyboard-only demos hid it.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/** @typedef {import('../types.js').WallState} WallState */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, '..', 'server.js');
const TOKEN = 'walltesttoken';
const PORT = 40000 + (process.pid % 10000);
const PORT2 = PORT + 1;

let passed = 0;
/** @param {string} name @param {boolean} cond */
function check(name, cond) {
  assert.ok(cond, name);
  passed++;
  console.log(`  ok — ${name}`);
}

/** @param {string} p @param {string} text */
function write(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

/** @returns {string} */
function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wall-test-'));
  const proj = path.join(root, 'vault', 'Design Studio', 'demo');
  write(path.join(proj, '00 Dashboard.md'),
    '---\ntype: design-project\nstatus: active\nstage: build\nclient: acme\nroute: full\nstarted: 2026-01-01\n---\n');
  write(path.join(proj, 'Decisions', '0001 plain.md'),
    '---\nid: 0001\nstage: debrief\nstatus: decided\nowner: test\ntags: [decision]\n---\n# 0001\n');
  write(path.join(proj, 'Decisions', '0002 deviation.md'),
    '---\nid: 0002\nstage: build\nstatus: decided\nowner: test\ntags: [decision, deviation]\n---\n# 0002\n');
  write(path.join(proj, 'Harvest.md'), '# Harvest\n- a flag. (build)\n');
  write(path.join(root, 'vault', 'Studio Wiki', 'wiki', 'A page.md'),
    '---\ntype: wiki-page\nentity: pattern\napplies: mechanism\norigin: starter\nborn: test\nsources: []\nstatus: live\nlast_confirmed: 2026-01-01\n---\n# A page\n');
  write(path.join(root, 'vault', 'Studio Wiki', '_sparks.md'), '# Sparks\n- [[A page]] — one spark.\n');
  write(path.join(root, 'vault', 'Studio Wiki', 'log.md'), '## [2026-01-01] init — test\n');
  write(path.join(root, 'tok'), TOKEN + '\n');
  const stub = path.join(root, 'stub-claude');
  write(stub, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo stub 0.0.1; exit 0; fi\necho lint report line one\nsleep 1\necho report done, no files written\n');
  fs.chmodSync(stub, 0o755);
  return root;
}

/** @param {Record<string, string>} env @returns {import('node:child_process').ChildProcess} */
function startServer(env) {
  return spawn(process.execPath, [SERVER], { env: { ...process.env, ...env }, stdio: 'ignore' });
}

/** @param {number} port */
async function waitForServer(port) {
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${port}/`); return; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error(`server on :${port} never came up`);
}

/** @param {string} pathname @param {RequestInit} [init] */
const api = (pathname, init) => fetch(`http://127.0.0.1:${PORT}${pathname}`, init);
const AUTH = { authorization: `Bearer ${TOKEN}` };

async function main() {
  const root = makeFixture();
  const main_ = startServer({
    DESIGN_STUDIO_VAULT: path.join(root, 'vault'), WALL_TOKEN_FILE: path.join(root, 'tok'),
    WALL_PORT: String(PORT), WALL_RUN_LOG: path.join(root, 'runlog'),
    WALL_CLAUDE_BIN: path.join(root, 'stub-claude'),
  });
  const novault = startServer({
    DESIGN_STUDIO_VAULT: path.join(root, 'no-such-vault'), WALL_TOKEN_FILE: path.join(root, 'tok'),
    WALL_PORT: String(PORT2), WALL_RUN_LOG: path.join(root, 'runlog2'), WALL_CLAUDE_BIN: '/bin/false',
  });
  /** @type {import('playwright').Browser | null} */
  let browser = null;
  try {
    await waitForServer(PORT);
    await waitForServer(PORT2);

    // ── HTTP: auth + security ──
    check('401 without a token', (await api('/api/state')).status === 401);
    check('403 with a wrong token', (await api('/api/state', { headers: { authorization: 'Bearer nope' } })).status === 403);
    check('403 with a valid token but foreign Origin',
      (await api('/api/state', { headers: { ...AUTH, origin: 'https://evil.example' } })).status === 403);
    check('403 for a non-allowlisted run',
      (await api('/api/run/not-a-skill', { method: 'POST', headers: AUTH })).status === 403);

    // ── HTTP: state carries the decision/deviation counts ──
    const state = /** @type {WallState} */ (await (await api('/api/state', { headers: AUTH })).json());
    const demo = state.portfolio.find(p => p.slug === 'demo');
    check('fixture project appears in the portfolio', !!demo);
    check('decision count read from Decisions/', demo?.decisions === 2);
    check('deviation-tagged entries counted', demo?.deviations === 1);
    check('harvest flags counted', demo?.flags === 1);

    // ── HTTP: one run at a time ──
    const first = await api('/api/run/wiki-lint', { method: 'POST', headers: AUTH });
    check('allowlisted run starts (streams 200)', first.status === 200);
    check('second concurrent run is refused (409)',
      (await api('/api/run/wiki-lint', { method: 'POST', headers: AUTH })).status === 409);
    check('run output streams to completion', (await first.text()).includes('completed'));

    // ── Browser: the overlay contract (the regression this suite exists for) ──
    // WALL_TEST_CHROMIUM: same escape-hatch philosophy as WALL_CLAUDE_BIN — point it
    // at a system chromium in sandboxes/CI images that pre-provision browsers.
    const executablePath = process.env.WALL_TEST_CHROMIUM;
    try { browser = await chromium.launch(executablePath ? { executablePath } : {}); }
    catch (e) {
      console.error('\nCould not launch chromium — run: npx playwright install chromium,'
        + ' or set WALL_TEST_CHROMIUM to a chromium binary.\n');
      throw e;
    }
    const anon = await browser.newContext();
    const gatePage = await anon.newPage();
    await gatePage.goto(`http://127.0.0.1:${PORT}/`);
    await gatePage.waitForSelector('#gate-overlay:not([hidden])');
    check('anonymous visitor sees the token gate', await gatePage.isVisible('#gate-overlay'));
    await anon.close();

    const ctx = await browser.newContext();
    await ctx.addInitScript(`localStorage.setItem('wall-token', '${TOKEN}')`);
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.waitForSelector('#pf-table .t-row');
    check('authed board shows, gate overlay does NOT render', !(await page.isVisible('#gate-overlay')));
    check('hidden overlays intercept nothing: no overlay is visible at rest',
      !(await page.isVisible('#palette-overlay')) && !(await page.isVisible('#drill-overlay')));
    check('portfolio deviation line reads honestly',
      (await page.textContent('#pf-dev'))?.trim() === '1 deviation across 2 decisions');
    check('wiki spark count is singular when it should be',
      (await page.textContent('#wk-sub'))?.trim() === '1 spark on the shelf');

    await page.click('#pf-table .t-row'); // the exact mouse click the [hidden] bug intercepted
    await page.waitForSelector('#drill-overlay:not([hidden])');
    check('clicking a project row opens the drill-in', await page.isVisible('#drill-overlay'));
    check('drill-in shows deviations against decisions',
      (await page.textContent('#drill-body'))?.includes('1 — of 2 decisions') === true);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+k');
    await page.waitForSelector('#palette-overlay:not([hidden])');
    check('⌘K opens the command palette', await page.isVisible('#palette-overlay'));
    await page.keyboard.press('Escape');

    const noVaultPage = await ctx.newPage();
    await noVaultPage.goto(`http://127.0.0.1:${PORT2}/`);
    await noVaultPage.waitForSelector('#setup-state:not([hidden])');
    check('no vault → honest setup card', await noVaultPage.isVisible('#setup-state'));

    console.log(`\nall ${passed} checks passed`);
  } finally {
    await browser?.close();
    main_.kill('SIGKILL');
    novault.kill('SIGKILL');
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
