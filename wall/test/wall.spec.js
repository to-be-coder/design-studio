// @ts-check
// Studio Wall — smoke suite. Spins up the real server against a throwaway
// vault with a stubbed `claude` CLI (WALL_* env overrides), then drives the
// UI the way a person does. Assertions are VISIBILITY assertions on purpose:
// the day-one gate bug (overlays toggled `hidden` but CSS kept them on
// screen) was invisible to DOM-state checks. Nothing here touches your real
// vault, token, or run log.

import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4460 + Math.floor(Math.random() * 400); // avoid a dev wall on 4411

/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
let server = null;
let tmp = '';
let vault = '';
let runLog = '';
let token = '';
let base = '';

/** @param {string} file @param {string} text */
function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/** One active project, one done project with a prototype repo, a two-page wiki. */
function makeVault() {
  const ds = path.join(vault, 'Design Studio');
  write(path.join(ds, 'atlas-onboarding', '00 Dashboard.md'), [
    '---', 'type: design-project', 'status: active', 'stage: research',
    'client: Atlas', 'route: full', 'started: 2026-06-21', 'prototype_repo:', '---', '# atlas', '',
  ].join('\n'));
  write(path.join(ds, 'atlas-onboarding', 'Harvest.md'),
    '# Harvest\n\n- pricing pages bury the annual toggle\n- onboarding checklists outperform tours\n');
  write(path.join(ds, 'koi-mobile', '00 Dashboard.md'), [
    '---', 'type: design-project', 'status: done', 'stage: spec',
    'client: Koi', 'route: lite', 'started: 2026-05-02',
    'prototype_repo: https://example.com/koi-proto', '---', '# koi', '',
  ].join('\n'));
  const wiki = path.join(vault, 'Studio Wiki');
  write(path.join(wiki, 'wiki', 'Specimen boards.md'), '# Specimen boards\n');
  write(path.join(wiki, 'wiki', 'Derive before invent.md'), '# Derive before invent\n');
  write(path.join(wiki, '_sparks.md'), '# Sparks\n\n- [[Specimen boards]] — placeholder spark line\n');
  write(path.join(wiki, 'log.md'), '## [2026-07-01] init — starter pages seeded\n');
}

/** Resolves once the server prints its startup banner. */
/** @param {import('node:child_process').ChildProcessWithoutNullStreams} child @returns {Promise<void>} */
function waitForBanner(child) {
  return new Promise((resolve, reject) => {
    let out = '';
    let err = '';
    const t = setTimeout(() =>
      reject(new Error(`server did not start on :${PORT}\nstdout:\n${out}\nstderr:\n${err}`)), 8000);
    child.stdout.on('data', (d) => {
      out += String(d);
      if (out.includes(`http://127.0.0.1:${PORT}`)) { clearTimeout(t); resolve(); }
    });
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('exit', (code) => { clearTimeout(t); reject(new Error(`server exited ${code}\n${err}`)); });
  });
}

test.beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wall-test-'));
  vault = path.join(tmp, 'vault');
  runLog = path.join(tmp, 'wall-run.log');
  makeVault();

  // Stub CLI: answers --version (detection) and the allowlisted run argv.
  const stub = path.join(tmp, 'claude-stub.sh');
  fs.writeFileSync(stub, '#!/bin/sh\necho "stub: wiki-lint report — 0 findings"\nexit 0\n', { mode: 0o755 });

  server = spawn('node', [path.join(__dirname, '..', 'server.js')], {
    env: {
      ...process.env,
      DESIGN_STUDIO_VAULT: vault,
      WALL_PORT: String(PORT),
      WALL_TOKEN_FILE: path.join(tmp, 'wall-token'),
      WALL_RUN_LOG: runLog,
      WALL_CLAUDE_BIN: stub,
    },
  });
  await waitForBanner(server);
  token = fs.readFileSync(path.join(tmp, 'wall-token'), 'utf8').trim();
  base = `http://127.0.0.1:${PORT}`;
});

test.afterAll(() => {
  server?.kill('SIGKILL');
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** Unlock the gate the way a person does. @param {import('@playwright/test').Page} page */
async function unlock(page) {
  await page.goto(base + '/');
  await expect(page.locator('#gate-overlay')).toBeVisible();
  await page.locator('#gate-input').fill(token);
  await page.locator('#gate-save').click();
  await expect(page.locator('#gate-overlay')).toBeHidden();
  await expect(page.locator('#grid')).toBeVisible();
}

test('token gate: locks, rejects a wrong token, unlocks with the right one', async ({ page }) => {
  await page.goto(base + '/');
  await expect(page.locator('#gate-overlay')).toBeVisible();
  await expect(page.locator('#grid')).toBeHidden();

  await page.locator('#gate-input').fill('wrong-token');
  await page.locator('#gate-save').click();
  await expect(page.locator('#gate-overlay')).toBeVisible(); // 403 reopens the gate

  await page.locator('#gate-input').fill(token);
  await page.locator('#gate-save').click();
  await expect(page.locator('#gate-overlay')).toBeHidden();
  await expect(page.locator('#grid')).toBeVisible();
  await expect(page.locator('#health')).toContainText('ready');
});

test('ambient view: vault state renders, one primary action, every overlay starts dismissed', async ({ page }) => {
  await unlock(page);

  await expect(page.locator('#pf-metric')).toHaveText('1 active');
  await expect(page.locator('#pf-sub')).toContainText('atlas-onboarding');
  await expect(page.locator('#pf-table .t-row')).toHaveCount(2);
  await expect(page.locator('#wk-metric')).toHaveText('2 pages');
  await expect(page.locator('#wk-sub')).toHaveText('1 sparks on the shelf');
  await expect(page.locator('#proto-list a')).toHaveText(/koi-mobile/);

  // one filled primary action, computed from state (wiki has never been linted)
  await expect(page.locator('#primary-action')).toBeVisible();
  await expect(page.locator('#primary-action')).toHaveText('Run wiki-lint');
  await expect(page.locator('.btn-primary:visible')).toHaveCount(1);

  // the regression this suite exists for: `hidden` must actually hide
  for (const id of ['#palette-overlay', '#drill-overlay', '#gate-overlay', '#toast']) {
    await expect(page.locator(id)).toBeHidden();
  }
});

test('⌘K palette: opens focused, filters, Escape closes', async ({ page }) => {
  await unlock(page);
  await page.keyboard.press('ControlOrMeta+KeyK');
  await expect(page.locator('#palette-overlay')).toBeVisible();
  await expect(page.locator('#palette-input')).toBeFocused();
  await expect(page.locator('.p-row').first()).toContainText('Run wiki-lint — report only');

  await page.keyboard.type('atlas');
  await expect(page.locator('.p-row')).toHaveCount(1);
  await expect(page.locator('.p-row')).toContainText('atlas-onboarding — project detail');

  await page.keyboard.press('Escape');
  await expect(page.locator('#palette-overlay')).toBeHidden();
});

test('drill-in: a project opens from the palette and closes with Escape', async ({ page }) => {
  await unlock(page);
  await page.keyboard.press('ControlOrMeta+KeyK');
  await page.keyboard.type('atlas');
  await page.keyboard.press('Enter');
  await expect(page.locator('#drill-overlay')).toBeVisible();
  await expect(page.locator('#drill-title')).toHaveText('atlas-onboarding');
  await expect(page.locator('#drill-body')).toContainText('research');
  await expect(page.locator('#drill-body')).toContainText('2'); // harvest flags
  await page.keyboard.press('Escape');
  await expect(page.locator('#drill-overlay')).toBeHidden();
});

test('runs: first Enter arms, second Enter streams to completion and lands in activity', async ({ page }) => {
  await unlock(page);
  await page.keyboard.press('ControlOrMeta+KeyK');
  await expect(page.locator('.p-row[aria-selected="true"]')).toContainText('Run wiki-lint');

  await page.keyboard.press('Enter'); // arm
  await expect(page.locator('.p-row.confirm')).toContainText('Press Enter again');
  expect(fs.existsSync(runLog)).toBe(false); // nothing ran yet

  await page.keyboard.press('Enter'); // confirm
  await expect(page.locator('#palette-overlay')).toBeHidden();
  await expect(page.locator('#drill-overlay')).toBeVisible();
  await expect(page.locator('#run-out')).toContainText('stub: wiki-lint report', { timeout: 15000 });
  await expect(page.locator('#run-out')).toContainText('▸ wiki-lint completed', { timeout: 15000 });

  const logged = /** @type {{skill: string, ok: boolean}} */ (JSON.parse(fs.readFileSync(runLog, 'utf8').trim().split('\n')[0]));
  expect(logged.skill).toBe('wiki-lint');
  expect(logged.ok).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('#activity')).toContainText('wiki-lint — completed');
});

test('api: refuses missing/wrong tokens, foreign origins, unlisted skills, traversal', async ({ request }) => {
  expect((await request.get(`${base}/api/state`)).status()).toBe(401);
  expect((await request.get(`${base}/api/state`, {
    headers: { authorization: 'Bearer nope' } })).status()).toBe(403);
  expect((await request.get(`${base}/api/state`, {
    headers: { authorization: `Bearer ${token}`, origin: 'https://evil.example' } })).status()).toBe(403);
  expect((await request.post(`${base}/api/run/rm-rf`, {
    headers: { authorization: `Bearer ${token}` } })).status()).toBe(403);
  expect((await request.get(`${base}/..%2f..%2fserver.js`)).status()).toBe(404);
});
