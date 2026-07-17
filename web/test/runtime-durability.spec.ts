import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import {
  newestRecordedVerdicts,
  pendingReviewBatches,
  pureDuplicateVerdicts,
  readLoopLock,
  readLoopProgress,
  runResearchLoop,
} from "../src/lib/debrief-runner";
import { janitorDecision } from "../src/lib/loop-decision";

/**
 * Slice: runtime durability (decision 0038). The controller-side promises the
 * suite can prove without a real claude on PATH:
 *   - the boot janitor's resume decision (pure function, table-driven);
 *   - the drain: a dispositions-only batch matching the recorded verdicts is
 *     closed by the controller itself (done marker, NO spawn), while a batch
 *     carrying a note / answers / a differing verdict / an unknown W-id always
 *     goes to ONE recorder invocation naming every batch id with its hash,
 *     oldest first;
 *   - the `.loop.lock` gains the spawn's childPid while a child runs;
 *   - the `.loop-progress` heartbeat exists while the loop runs, feeds the
 *     banner with an elapsed-time line, and is deleted when the loop ends;
 *   - the board refetches when the observed fence line CHANGES value, and only
 *     then.
 * The runner spawns real claude in production; here CLAUDE_BIN points at a
 * local stub script that logs its prompt and plays the recorder's mechanical
 * part (done markers + fence), so no test ever spawns an agent. The e2e server
 * itself boots with DESIGN_STUDIO_NO_RESUME=1 and autorun off, so the janitor
 * can never touch the fixture vault.
 */

// ── The janitor's resume decision (pure) ──────────────────────────────────────

const TERMINAL_FENCE = "Current stage: research: converged-humans-needed: round 3, review 5";

test.describe("boot janitor decision", () => {
  test("a live controller pid always wins: leave the project alone", () => {
    expect(
      janitorDecision({ lock: { pidAlive: true, childAlive: false }, fenceLine: TERMINAL_FENCE, pendingCount: 3 }),
    ).toEqual({ kind: "leave-live" });
  });

  test("a dead controller with a live child never resumes and never clears", () => {
    expect(
      janitorDecision({
        lock: { pidAlive: false, childAlive: true },
        fenceLine: "Current stage: research: researching: round 2, dry-streak 0, open 4, parked 0",
        pendingCount: 2,
      }),
    ).toEqual({ kind: "leave-orphan" });
  });

  test("a stale lock with queued batches clears and resumes", () => {
    expect(
      janitorDecision({ lock: { pidAlive: false, childAlive: false }, fenceLine: TERMINAL_FENCE, pendingCount: 1 }),
    ).toEqual({ kind: "resume", clearLock: true });
  });

  test("a stale lock with nothing to resume just clears", () => {
    expect(
      janitorDecision({ lock: { pidAlive: false, childAlive: false }, fenceLine: TERMINAL_FENCE, pendingCount: 0 }),
    ).toEqual({ kind: "clear-stale" });
  });

  test("no lock: an interrupted researching fence resumes", () => {
    expect(
      janitorDecision({
        lock: null,
        fenceLine: "Current stage: research: researching: round 4, dry-streak 1, open 2, parked 1",
        pendingCount: 0,
      }),
    ).toEqual({ kind: "resume", clearLock: false });
  });

  test("no lock: an ingested fence resumes (the chained research never started)", () => {
    expect(
      janitorDecision({ lock: null, fenceLine: "Current stage: debrief: ingested: batch 4", pendingCount: 0 }),
    ).toEqual({ kind: "resume", clearLock: false });
  });

  test("terminal fences never auto-resume", () => {
    for (const fence of [
      "Current stage: research: converged-complete: round 5",
      TERMINAL_FENCE,
      "Current stage: research: capped: round 6, agenda 2, open 3, review 4",
    ]) {
      expect(janitorDecision({ lock: null, fenceLine: fence, pendingCount: 0 })).toEqual({ kind: "none" });
    }
  });

  test("legacy parked-decision and review: awaiting never auto-resume", () => {
    expect(
      janitorDecision({
        lock: null,
        fenceLine: "Current stage: research: parked-decision: framing supersession, review 3",
        pendingCount: 0,
      }),
    ).toEqual({ kind: "none" });
    expect(
      janitorDecision({ lock: null, fenceLine: "Current stage: review: awaiting: 2", pendingCount: 0 }),
    ).toEqual({ kind: "none" });
  });

  test("an interrupted debrief seed is logged, not resumed", () => {
    expect(
      janitorDecision({ lock: null, fenceLine: "Current stage: debrief: seeded: round 1", pendingCount: 0 }),
    ).toEqual({ kind: "log-only", state: "seeded" });
  });

  test("no fence, no lock, no queue: nothing to do", () => {
    expect(janitorDecision({ lock: null, fenceLine: null, pendingCount: 0 })).toEqual({ kind: "none" });
  });
});

// ── The pure-duplicate classifier ─────────────────────────────────────────────

const META = "- date: 2026-07-16\n- reviewer: canvas\n- wwb_round: 3\n- entries_hash: ab12cd34";

test.describe("pure-duplicate classifier", () => {
  test("dispositions-only bare verdict lines parse", () => {
    expect(pureDuplicateVerdicts(`${META}\n- dispositions:\n  - W1: build-now\n  - W2: dont-build`)).toEqual([
      { id: "W1", verdict: "build-now" },
      { id: "W2", verdict: "dont-build" },
    ]);
  });

  test("a typed note, an unblocks, answers, or rulings disqualify", () => {
    expect(pureDuplicateVerdicts(`${META}\n- dispositions:\n  - W1: build-now, "her words"`)).toBeNull();
    expect(pureDuplicateVerdicts(`${META}\n- dispositions:\n  - W2: backlog, unblocks: "auth ships"`)).toBeNull();
    expect(
      pureDuplicateVerdicts(`${META}\n- dispositions:\n  - W1: build-now\n- answers:\n  - L7: "yes"`),
    ).toBeNull();
    expect(pureDuplicateVerdicts(`${META}\n- rulings:\n  - 0007: accept (framing)`)).toBeNull();
    expect(pureDuplicateVerdicts(`${META}\n- dispositions:\n  - W1: build-now\nfree prose`)).toBeNull();
    expect(pureDuplicateVerdicts(META)).toBeNull();
  });
});

// ── The drain, end to end against a scratch project (stubbed claude) ──────────

/** Sha of a block's inner text, trimmed: the one hash convention everywhere. */
function hashOf(inner: string): string {
  return createHash("sha256").update(inner.trim()).digest("hex");
}

function reviewBlock(id: number, innerLines: string[]): string {
  return [`<!-- review:${id}:begin -->`, ...innerLines, `<!-- review:${id}:end -->`].join("\n");
}

const DISPOSITIONS_DECISION = `---
status: decided
authored_by: user
review_batch: 6
date: 2026-07-01
---

# 0006: Review 6 dispositions

Cites [[Knowns & Unknowns#review 6]].

- W1: build-now
- W2: dont-build

**In their words.** "chosen by click; no words typed"
`;

/**
 * A scratch project the runner can drive without a vault or a real claude:
 * a dashboard with a terminal fence, a ledger with a Review log, and one
 * recorded dispositions decision (batch 6: W1 build-now, W2 dont-build).
 */
async function makeProject(blocks: string[]): Promise<{ vaultRoot: string; projectDir: string; slug: string }> {
  const vaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ds-durability-"));
  const slug = `scratch-${path.basename(vaultRoot).slice(-6)}`;
  const projectDir = path.join(vaultRoot, "Design Studio", slug);
  await fs.mkdir(path.join(projectDir, "Decisions"), { recursive: true });
  await fs.writeFile(
    path.join(projectDir, "00 Dashboard.md"),
    `# Scratch\n\n## Current stage\n\n${TERMINAL_FENCE}\n`,
    "utf8",
  );
  const ledger = ["# Knowns & Unknowns", "", "## Review log", "", blocks.join("\n\n"), ""].join("\n");
  await fs.writeFile(path.join(projectDir, "Knowns & Unknowns.md"), ledger, "utf8");
  const decision = path.join(projectDir, "Decisions", "0006 review-6-dispositions.md");
  await fs.writeFile(decision, DISPOSITIONS_DECISION, "utf8");
  // Backdate it: the quarantine validator only scans decisions written after
  // the invocation started, and this one must read as pre-existing.
  const past = new Date(Date.now() - 60_000);
  await fs.utimes(decision, past, past);
  return { vaultRoot, projectDir, slug };
}

/**
 * The claude stand-in: logs every invocation's prompt, then plays the
 * recorder's mechanical part (append each authorized batch's done marker,
 * fence `ingested`) or, on a research prompt, fences `converged-complete` so
 * the chained loop settles after one round. A short sleep keeps the child
 * alive long enough for the childPid/heartbeat assertions.
 */
async function makeStub(dir: string): Promise<{ bin: string; logFile: string }> {
  const bin = path.join(dir, "claude-stub.cjs");
  const logFile = path.join(dir, "stub-invocations.log");
  const script = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const prompt = process.argv[process.argv.length - 1];
  fs.appendFileSync(process.env.CLAUDE_STUB_LOG, JSON.stringify({ prompt }) + "\\n");
  await new Promise((r) => setTimeout(r, 400));
  const projectDir = process.env.CLAUDE_STUB_PROJECT;
  const dash = path.join(projectDir, "00 Dashboard.md");
  const setFence = (line) =>
    fs.writeFileSync(dash, fs.readFileSync(dash, "utf8").replace(/^Current stage:.*$/m, line));
  if (/review-ingestion mode/.test(prompt)) {
    const listing = prompt.match(/ingest review batch(?:es)? (.*?) in that order/);
    const ids = (listing ? listing[1] : "").split(",").map((s) => s.trim()).filter(Boolean);
    const ledgerPath = path.join(projectDir, "Knowns & Unknowns.md");
    let ledger = fs.readFileSync(ledgerPath, "utf8");
    for (const id of ids) {
      ledger = ledger.replace(
        "<!-- review:" + id + ":end -->",
        "<!-- review:" + id + ":end -->\\n<!-- review:" + id + ":done -->",
      );
      setFence("Current stage: debrief: ingested: batch " + id);
    }
    fs.writeFileSync(ledgerPath, ledger);
  } else {
    setFence("Current stage: research: converged-complete: round 1");
  }
})();
`;
  await fs.writeFile(bin, script, { mode: 0o755 });
  return { bin, logFile };
}

async function stubInvocations(logFile: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(logFile, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => (JSON.parse(l) as { prompt: string }).prompt);
  } catch {
    return [];
  }
}

test.describe("review-queue drain", () => {
  test("a dispositions-only batch matching the recorded verdicts closes with a done marker and NO spawn", async () => {
    const dup = ["- date: 2026-07-10", "- reviewer: canvas", "- dispositions:", "  - W1: build-now"];
    const { vaultRoot, projectDir, slug } = await makeProject([reviewBlock(7, dup)]);
    const { bin, logFile } = await makeStub(vaultRoot);
    process.env.CLAUDE_BIN = bin;
    process.env.CLAUDE_STUB_LOG = logFile;
    process.env.CLAUDE_STUB_PROJECT = projectDir;
    try {
      expect(await newestRecordedVerdicts(projectDir)).toEqual(
        new Map([
          ["W1", "build-now"],
          ["W2", "dont-build"],
        ]),
      );
      expect(await pendingReviewBatches(projectDir)).toHaveLength(1);

      await runResearchLoop({ slug, vaultRoot, projectDir });

      const ledger = await fs.readFile(path.join(projectDir, "Knowns & Unknowns.md"), "utf8");
      expect(ledger).toContain("<!-- review:7:end -->\n<!-- review:7:done -->");
      expect(await pendingReviewBatches(projectDir)).toHaveLength(0);
      // No spawn attempt of any kind: the stub was never invoked.
      expect(await stubInvocations(logFile)).toEqual([]);
      // The loop ended: lock and heartbeat are gone, the fence never moved.
      expect(await readLoopLock(projectDir)).toBeNull();
      expect(await readLoopProgress(projectDir)).toBeNull();
      expect(await fs.readFile(path.join(projectDir, "00 Dashboard.md"), "utf8")).toContain(TERMINAL_FENCE);
    } finally {
      delete process.env.CLAUDE_BIN;
      await fs.rm(vaultRoot, { recursive: true, force: true });
    }
  });

  test("notes, answers, differing verdicts, and unknown W-ids all drain through ONE recorder spawn, oldest first, ids only", async () => {
    const dupInner = ["- date: 2026-07-10", "- reviewer: canvas", "- dispositions:", "  - W1: build-now"];
    const noteInner = ["- date: 2026-07-11", "- reviewer: canvas", "- dispositions:", '  - W2: backlog, "park it for later"'];
    const answersInner = ["- date: 2026-07-12", "- reviewer: canvas", "- answers:", '  - L7: "yes, they rely on CSV"'];
    const differInner = ["- date: 2026-07-13", "- reviewer: canvas", "- dispositions:", "  - W1: backlog"];
    const unknownInner = ["- date: 2026-07-14", "- reviewer: canvas", "- dispositions:", "  - W99: build-now"];
    const { vaultRoot, projectDir, slug } = await makeProject([
      reviewBlock(8, dupInner),
      reviewBlock(9, noteInner),
      reviewBlock(10, answersInner),
      reviewBlock(11, differInner),
      reviewBlock(12, unknownInner),
    ]);
    const { bin, logFile } = await makeStub(vaultRoot);
    process.env.CLAUDE_BIN = bin;
    process.env.CLAUDE_STUB_LOG = logFile;
    process.env.CLAUDE_STUB_PROJECT = projectDir;
    try {
      const running = runResearchLoop({ slug, vaultRoot, projectDir });

      // While the recorder child runs: the lock names it, the heartbeat beats.
      await expect
        .poll(async () => (await readLoopLock(projectDir))?.childPid ?? null, { timeout: 10_000 })
        .not.toBeNull();
      const progress = await readLoopProgress(projectDir);
      expect(progress?.phase).toBe("recorder");
      expect(progress?.batch).toBe(9);
      expect(typeof progress?.spawnPid).toBe("number");
      expect(typeof progress?.spawnedAt).toBe("number");

      await running;
      // The clean recorder exit chains one research invocation; wait for the
      // whole thing to settle (lock gone, both stub calls logged).
      await expect
        .poll(async () => (await stubInvocations(logFile)).length, { timeout: 15_000 })
        .toBe(2);
      await expect.poll(async () => readLoopLock(projectDir), { timeout: 10_000 }).toBeNull();

      // The pure duplicate was closed by the controller, not the recorder.
      const ledger = await fs.readFile(path.join(projectDir, "Knowns & Unknowns.md"), "utf8");
      expect(ledger).toContain("<!-- review:8:end -->\n<!-- review:8:done -->");

      const [recorderPrompt, researchPrompt] = await stubInvocations(logFile);
      expect(recorderPrompt).toContain("review-ingestion mode");
      // Every open batch, oldest first, ids only; the closed duplicate is NOT
      // in the spawn, and no hash ever reaches the recorder (the controller
      // holds them for its fences: SKILL.md recorder step 2).
      expect(recorderPrompt).toContain("ingest review batches 9, 10, 11, 12 in that order");
      expect(recorderPrompt).not.toContain("hash");
      // The recorder marked every open batch done, so nothing is pending.
      expect(await pendingReviewBatches(projectDir)).toHaveLength(0);
      // The chained invocation was a research round, always, after a clean exit.
      expect(researchPrompt).toContain("EXACTLY ONE round");
      // Loop over: heartbeat deleted with the lock.
      expect(await readLoopProgress(projectDir)).toBeNull();
    } finally {
      delete process.env.CLAUDE_BIN;
      await fs.rm(vaultRoot, { recursive: true, force: true });
    }
  });

  test("a hash mismatch on any listed batch refuses the whole spawn", async () => {
    const noteInner = ["- date: 2026-07-11", "- reviewer: canvas", "- dispositions:", '  - W2: backlog, "words"'];
    const { vaultRoot, projectDir, slug } = await makeProject([reviewBlock(13, noteInner)]);
    const { bin, logFile } = await makeStub(vaultRoot);
    process.env.CLAUDE_BIN = bin;
    process.env.CLAUDE_STUB_LOG = logFile;
    process.env.CLAUDE_STUB_PROJECT = projectDir;
    try {
      // The route captured a different hash than the block on disk: tampered.
      await runResearchLoop(
        { slug, vaultRoot, projectDir },
        { review: { batchId: "13", blockHash: "0".repeat(64) } },
      );
      expect(await stubInvocations(logFile)).toEqual([]);
      const log = await fs.readFile(path.join(projectDir, ".review-record.13.log"), "utf8");
      expect(log).toContain("[tamper fence] block 13 hash mismatch");
      // The batch stays queued for a legitimate later drain.
      expect(await pendingReviewBatches(projectDir)).toHaveLength(1);
    } finally {
      delete process.env.CLAUDE_BIN;
      await fs.rm(vaultRoot, { recursive: true, force: true });
    }
  });
});

// ── The heartbeat banner (UI) ─────────────────────────────────────────────────

const RUNNABLE_DIR = path.resolve(__dirname, "fixtures/vault/Design Studio/fixture-runnable");

test.describe("loop heartbeat banner", () => {
  test("a .loop-progress heartbeat renders one plain line with elapsed time; no file, no line", async ({ page }) => {
    const progressFile = path.join(RUNNABLE_DIR, ".loop-progress");
    await fs.writeFile(
      progressFile,
      JSON.stringify({
        phase: "recorder",
        batch: 16,
        spawnPid: 424242,
        spawnedAt: Date.now() - 4 * 60_000,
        updatedAt: Date.now(),
      }),
      "utf8",
    );
    try {
      await page.goto("/canvas/fixture-runnable");
      const banner = page.getByTestId("loop-banner");
      await expect(banner).toBeVisible();
      await expect(banner).toHaveText(/^Recording your review \(batch 16\)\. \d+ minutes? in\.$/);
    } finally {
      await fs.rm(progressFile, { force: true });
    }

    await page.reload();
    await expect(page.getByTestId("canvas-viewport").or(page.getByTestId("doc-view")).first()).toBeVisible();
    await expect(page.getByTestId("loop-banner")).toHaveCount(0);
  });
});

// ── Fence-change refetch (UI) ─────────────────────────────────────────────────

test.describe("fence-change refetch", () => {
  test("the board refetches when the fence line changes value, not on every tick", async ({ page }) => {
    const fenceA = "Current stage: research: converged-humans-needed: round 3, review 5";
    const fenceB = "Current stage: debrief: ingested: batch 9";
    let calls = 0;
    await page.route("**/api/projects/status*", async (route) => {
      calls += 1;
      await route.fulfill({
        json: {
          stage: "research",
          // `drafting` keeps the poll on its fast cadence; the state never
          // reaches `done`, so any refetch observed is the fence's doing.
          state: "drafting",
          round: null,
          fence: calls >= 4 ? fenceB : fenceA,
          progress: null,
        },
      });
    });

    let refetches = 0;
    page.on("request", (req) => {
      const h = req.headers();
      if (req.url().includes("/canvas/fixture-project") && (h["rsc"] === "1" || h["next-router-state-tree"])) {
        refetches += 1;
      }
    });

    await page.goto("/canvas/fixture-project");
    // Same-fence polls first: no refetch may fire on a mere tick.
    await expect.poll(() => calls, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    expect(refetches).toBe(0);
    // The fence flips on the fourth poll: the board refetches (a refresh may
    // fan out to a couple of RSC requests, never one per tick).
    await expect.poll(() => refetches, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    await expect.poll(() => calls, { timeout: 20_000 }).toBeGreaterThanOrEqual(7);
    expect(refetches).toBeLessThanOrEqual(3);
  });
});
