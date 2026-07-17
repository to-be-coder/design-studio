import { spawn } from "node:child_process";
import { createWriteStream, promises as fsp } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { findStatusLine, parseLoopStatus } from "./loop-status";

/**
 * Run design-studio skills as headless background passes from the canvas:
 * `debrief` round 1 when a project is created, and the `research` Understand
 * loop on demand (or resumed with a human-answer batch). Each spawns a real
 * Claude agent that WRITES the vault, so the whole capability is gated behind
 * DESIGN_STUDIO_AUTORUN_DEBRIEF (opt-in, off by default), so it can never fire in
 * tests or surprise anyone. Everything a run writes stays `proposed`/provisional,
 * and runs are best-effort: failures land in a per-run log file in the project
 * folder, never blocking the UI.
 *
 * The research controller is the loop's brain, NOT the agent: it spawns ONE
 * round per `claude --print` invocation, then reads the dashboard's committed
 * status line and decides whether to spawn the next round. That keeps the
 * termination guarantees with the controller (a spawn can never talk itself into
 * looping forever), and lets a crash resume from the last committed round.
 */

export type RunState = "drafting" | "done" | "error";
/** What's running for a slug, its state, and (for the loop) the current round. */
export interface RunStatus {
  stage: string;
  state: RunState;
  round?: number;
}

const g = globalThis as unknown as { __designStudioRuns?: Map<string, RunStatus> };
const registry: Map<string, RunStatus> = g.__designStudioRuns ?? (g.__designStudioRuns = new Map());

/** True when the canvas may run design-studio skills headlessly (opt-in). */
export function autorunEnabled(): boolean {
  return !!process.env.DESIGN_STUDIO_AUTORUN_DEBRIEF?.trim();
}

/**
 * Stages the canvas can trigger on demand from their board (debrief auto-runs on
 * Create). Only `research` is runnable; structure is `runnable: false` in the
 * schema, so it is copy-command only.
 */
export const RUNNABLE_STAGES = new Set(["research"]);
export function isRunnableStage(stage: string): boolean {
  return RUNNABLE_STAGES.has(stage);
}

export function getRunState(slug: string): RunStatus | null {
  return registry.get(slug) ?? null;
}

/** Defaults from the ledger's convergence block: the round cap per invocation. */
const ROUND_CAP = 6;
const LOCK_FILE = ".loop.lock";
const DASHBOARD = "00 Dashboard.md";
const LEDGER = "Knowns & Unknowns.md";

/**
 * Spawn a skill headless for a slug. Fire-and-forget: never awaited, never
 * throws (failures are captured into the registry + the log file). Marks the
 * given stage as `drafting`, then `done`/`error` on exit.
 */
function runSkill(opts: {
  slug: string;
  stage: string;
  prompt: string;
  vaultRoot: string;
  projectDir: string;
  logName: string;
  /**
   * Controller hand-off: called INSTEAD of marking the stage `done` when the
   * child exits 0. The debrief pass uses it to chain straight into the research
   * loop, so the registry walks debrief → research with no `done` gap the poll
   * could observe (the sidebar dot survives the hand-off). A non-zero exit still
   * marks `error` as before.
   */
  onCleanExit?: () => void;
}): void {
  const { slug, stage, prompt, vaultRoot, projectDir, logName, onCleanExit } = opts;
  const log = createWriteStream(path.join(projectDir, logName), { flags: "w" });
  log.on("error", () => {
    /* the folder may have been removed (e.g. under test), swallow */
  });
  log.write(`[${stage} run] design-studio-${stage} (headless) for "${slug}"\n\n`);

  const bin = process.env.CLAUDE_BIN?.trim() || "claude";
  let child;
  try {
    child = spawn(bin, ["--dangerously-skip-permissions", "--print", prompt], {
      cwd: vaultRoot,
      shell: false,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, DESIGN_STUDIO_VAULT: vaultRoot },
    });
  } catch (err) {
    registry.set(slug, { stage, state: "error" });
    log.write(`\n[spawn failed] ${(err as Error).message}\n`);
    log.end();
    return;
  }

  registry.set(slug, { stage, state: "drafting" });
  child.stdout?.on("data", (b: Buffer) => log.write(b));
  child.stderr?.on("data", (b: Buffer) => log.write(b));
  child.on("error", (err: Error) => {
    registry.set(slug, { stage, state: "error" });
    log.write(`\n[spawn error] ${err.message}, is the Claude CLI on PATH?\n`);
    log.end();
  });
  child.on("exit", (code: number | null) => {
    log.write(`\n[exited] code=${code ?? "null"}\n`);
    log.end();
    // On a clean exit with a hand-off, let the controller take the baton (it
    // owns the next registry state). Leaving the entry as `drafting` here means
    // the poll never sees a `done` between debrief and research.
    if (code === 0 && onCleanExit) onCleanExit();
    else registry.set(slug, { stage, state: code === 0 ? "done" : "error" });
  });
}

interface DebriefInputs {
  slug: string;
  name: string;
  brief: string;
  client: string;
  vaultRoot: string;
  /** The already-seeded project folder, where the log lands. */
  projectDir: string;
}

/**
 * Fire debrief round 1 headless (the project folder is pre-seeded by the
 * caller), then chain STRAIGHT into the research loop on a clean exit. This is
 * the controller-owned hand-off of decision 0036's one continuous cycle: create
 * no longer waits for a human to click "Run research". A non-zero debrief exit
 * errors as before and chains nothing.
 */
export function startDebriefDraft({ slug, name, brief, client, vaultRoot, projectDir }: DebriefInputs): void {
  runSkill({
    slug,
    stage: "debrief",
    prompt: debriefPrompt({ slug, name, brief, client, vaultRoot }),
    vaultRoot,
    projectDir,
    logName: ".debrief-draft.log",
    onCleanExit: () => chainResearchLoop({ slug, vaultRoot, projectDir }),
  });
}

// ── The research Understand loop (spawn-per-round controller) ─────────────────

export interface LoopCtx {
  slug: string;
  vaultRoot: string;
  projectDir: string;
}
/**
 * A recorded review batch: the app has already appended the `review:B` block to
 * the ledger and captured its content hash out-of-band. The recorder reads the
 * block from disk; the controller holds the hash for the tamper check.
 */
export interface ReviewIngest {
  batchId: string;
  blockHash: string;
  wwbRound?: number;
  entriesHash?: string;
  verdicts?: { id: string; verdict: string; note?: string; unblocks?: string }[];
  answers?: { id: string; text: string }[];
  ruling?: { id: string; kind?: string; disposition: string; words: string };
}

export interface ResearchOpts {
  /** A human-answer batch to embed in the first round's prompt (the resume path). */
  answers?: { id: string; text: string }[];
  /** A recorded review batch: spawns the debrief review-ingestion recorder. */
  review?: ReviewIngest;
}

/**
 * Is a research loop live for this slug? True when either the in-process
 * registry says a run is drafting, or a `.loop.lock` on disk names a still-alive
 * pid. A lock whose pid is dead is stale and clearable (a crashed run), so it
 * does NOT count as live.
 */
export async function researchLoopLive(slug: string, projectDir: string): Promise<boolean> {
  if (registry.get(slug)?.state === "drafting") return true;
  return lockAlive(projectDir);
}

/**
 * Start the research loop for a slug, fire-and-forget. Single-flight: a second
 * start while one is live is a no-op (the route also 409s on {@link
 * researchLoopLive}). The controller spawns one round at a time and stops when
 * the committed status line is no longer `researching`, or the round cap is hit.
 */
export function startResearchLoop(ctx: LoopCtx, opts?: ResearchOpts): void {
  void runLoop(ctx, opts).catch(() => {
    /* best-effort: errors are captured in the registry + the round log */
  });
}

/**
 * The debrief → research hand-off. Starts the loop PAST the in-process
 * single-flight guard: the debrief child has just exited, so the only
 * `drafting` entry is debrief's own (not a live research loop), and there is no
 * `.loop.lock` yet. We still honour a real on-disk lock (the paranoid case) so a
 * racing manual run can't double-spawn.
 */
/**
 * Review blocks persisted in the ledger that no recorder has ingested yet,
 * oldest first. Processed means either the recorder's `<!-- review:B:done -->`
 * marker follows the block, or a decision already carries `review_batch: B`
 * (covers blocks ingested before the marker existed). The hash pins the block's
 * current content for the tamper check, captured here, out of band of the spawn.
 */
async function pendingReviewBatches(projectDir: string): Promise<ReviewIngest[]> {
  let ledger: string;
  try {
    ledger = await fsp.readFile(path.join(projectDir, LEDGER), "utf8");
  } catch {
    return [];
  }
  let decisions = "";
  try {
    const dir = path.join(projectDir, "Decisions");
    for (const f of await fsp.readdir(dir)) {
      if (f.endsWith(".md")) decisions += (await fsp.readFile(path.join(dir, f), "utf8")) + "\n";
    }
  } catch {
    /* no decisions folder yet */
  }
  const out: ReviewIngest[] = [];
  const re = /<!--\s*review:([A-Za-z0-9_-]+):begin\s*-->([\s\S]*?)<!--\s*review:\1:end\s*-->/g;
  for (const m of ledger.matchAll(re)) {
    const batchId = m[1];
    const after = ledger.slice((m.index ?? 0) + m[0].length);
    const hasMarker = new RegExp(`^\\s*<!--\\s*review:${batchId}:done\\s*-->`).test(after);
    const hasDecision = new RegExp(`^review_batch:\\s*${batchId}\\s*$`, "m").test(decisions);
    if (hasMarker || hasDecision) continue;
    const blockHash = createHash("sha256").update(m[2].trim()).digest("hex");
    out.push({ batchId, blockHash });
  }
  return out;
}

function chainResearchLoop(ctx: LoopCtx): void {
  void runLoop(ctx, undefined, true).catch(() => {
    /* best-effort: errors are captured in the registry + the round log */
  });
}

async function runLoop(ctx: LoopCtx, opts?: ResearchOpts, chained = false): Promise<void> {
  const { slug, vaultRoot, projectDir } = ctx;
  // Chained from debrief: the registry still reads debrief's `drafting`, which is
  // NOT a live research loop, so guard on the on-disk lock only.
  if (chained ? await lockAlive(projectDir) : await researchLoopLive(slug, projectDir)) return;

  // A recorded review batch spawns ONE recorder round (debrief review-ingestion
  // mode), never a research round. The registry stays `stage: "research"` so the
  // existing sidebar dot + status poll work unchanged.
  if (opts?.review) {
    await runReview(ctx, opts.review);
    return;
  }

  // Queue pickup: a review block persisted while another run was live has no
  // recorder yet. Drain the oldest first; runReview's tail re-enters this loop,
  // so the whole queue empties before any research round runs.
  const pending = await pendingReviewBatches(projectDir);
  if (pending.length > 0) {
    await runReview(ctx, pending[0]);
    return;
  }

  const invocationStart = Date.now();
  registry.set(slug, { stage: "research", state: "drafting", round: 0 });
  await writeLock(projectDir, 0);

  let roundsThisInvocation = 0;
  let answers = opts?.answers;
  let errored = false;

  try {
    while (true) {
      roundsThisInvocation += 1;
      const n = roundsThisInvocation;

      let code = await spawnRound({ slug, vaultRoot, projectDir, n, answers });
      answers = undefined; // only the first round of an invocation embeds the batch
      if (code !== 0) {
        // One retry; a round that fails twice stops the loop with an error and is
        // NOT counted as progress.
        code = await spawnRound({ slug, vaultRoot, projectDir, n, answers: undefined, retry: true });
        if (code !== 0) {
          errored = true;
          break;
        }
      }

      // 🔴 integrity: a headless spawn may never author a human verdict. Quarantine
      // any decision written this invocation that claims one.
      await quarantineHeadlessVerdicts(projectDir, invocationStart, n);

      const status = await readLoopStatus(projectDir);
      const ledgerRound = status?.round ?? n;
      registry.set(slug, { stage: "research", state: "drafting", round: ledgerRound });
      await writeLock(projectDir, ledgerRound);

      const researching = status?.state === "researching";
      if (!researching) break;
      if (ledgerRound >= ROUND_CAP) break;
      if (roundsThisInvocation >= ROUND_CAP) break;
    }
  } finally {
    const round = registry.get(slug)?.round;
    registry.set(slug, { stage: "research", state: errored ? "error" : "done", round });
    await removeLock(projectDir);
  }
}

/**
 * Ingest a recorded review batch: spawn ONE debrief review-ingestion recorder,
 * then validate. The recorder reads the already-written block from disk; the
 * quarantine validator runs with the exemption keyed to THIS batch id and a
 * tamper check against the block hash the controller captured at write time.
 * After a clean recorder exit the controller ALWAYS resumes research fresh (a
 * new invocation = a new round budget, since a human cycle just closed): every
 * submission is another brief (decision 0036). A batch that added nothing new
 * converges in one cheap round, since exhausted unknowns are not re-attempted.
 */
async function runReview(ctx: LoopCtx, review: ReviewIngest): Promise<void> {
  const { slug, vaultRoot, projectDir } = ctx;
  const invocationStart = Date.now();
  registry.set(slug, { stage: "research", state: "drafting", round: 0 });
  await writeLock(projectDir, 0);

  let errored = false;
  try {
    // Tamper fence, checked BEFORE the spawn: between the app's write (or the
    // drain's pickup) and this moment, nothing legitimate touches the block, so
    // a mismatch here is real tampering and nothing spawns. After the spawn the
    // recorder legitimately rewrites the ledger (folding answers, re-rendering),
    // so a post-run content hash would quarantine the recorder's own valid work
    // (it did, twice, on forma).
    const blockNow = await reviewBlockHash(projectDir, review.batchId);
    if (blockNow == null || (review.blockHash && blockNow !== review.blockHash)) {
      const log = createWriteStream(path.join(projectDir, `.review-record.${review.batchId}.log`), { flags: "a" });
      log.write(`\n[tamper fence] block ${review.batchId} ${blockNow == null ? "missing" : "hash mismatch"}; refusing to spawn.\n`);
      log.end();
      errored = true;
    } else {
      let code = await spawnRecorder({ slug, vaultRoot, projectDir, batchId: review.batchId });
      if (code !== 0) {
        code = await spawnRecorder({ slug, vaultRoot, projectDir, batchId: review.batchId, retry: true });
      }
      // 🔴 integrity: a headless recorder may author authored_by: user / decided
      // ONLY for decisions citing THIS authorized batch (the content-hash check
      // already ran, pre-spawn).
      await quarantineHeadlessVerdicts(projectDir, invocationStart, 0, {
        exemptBatchId: review.batchId,
      });
      errored = code !== 0;
    }
  } finally {
    registry.set(slug, { stage: "research", state: errored ? "error" : "done", round: registry.get(slug)?.round });
    await removeLock(projectDir);
  }

  // The recorder folded the batch in and wrote the `ingested` fence; the
  // controller (not the spawn) reopens the loop, fresh, on every clean exit.
  // Verdicts-only, ruling-only, answers: all resume research now.
  if (!errored) startResearchLoop(ctx);
}

/** Spawn the debrief review-ingestion recorder for a batch; resolve its exit code. */
function spawnRecorder(args: {
  slug: string;
  vaultRoot: string;
  projectDir: string;
  batchId: string;
  retry?: boolean;
}): Promise<number> {
  const { slug, vaultRoot, projectDir, batchId, retry } = args;
  return new Promise<number>((resolve) => {
    const logName = `.review-record.${batchId}${retry ? ".retry" : ""}.log`;
    const log = createWriteStream(path.join(projectDir, logName), { flags: "w" });
    log.on("error", () => {
      /* the folder may have been removed (e.g. under test), so swallow */
    });
    log.write(`[review recorder] batch ${batchId}${retry ? " (retry)" : ""} for "${slug}"\n\n`);

    const bin = process.env.CLAUDE_BIN?.trim() || "claude";
    let child;
    try {
      child = spawn(bin, ["--dangerously-skip-permissions", "--print", reviewIngestPrompt({ slug, vaultRoot, batchId })], {
        cwd: vaultRoot,
        shell: false,
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, DESIGN_STUDIO_VAULT: vaultRoot },
      });
    } catch (err) {
      log.write(`\n[spawn failed] ${(err as Error).message}\n`);
      log.end();
      resolve(1);
      return;
    }

    child.stdout?.on("data", (b: Buffer) => log.write(b));
    child.stderr?.on("data", (b: Buffer) => log.write(b));
    child.on("error", (err: Error) => {
      log.write(`\n[spawn error] ${err.message}. Is the Claude CLI on PATH?\n`);
      log.end();
      resolve(1);
    });
    child.on("exit", (code: number | null) => {
      log.write(`\n[exited] code=${code ?? "null"}\n`);
      log.end();
      resolve(code ?? 1);
    });
  });
}

/** Spawn exactly one research round and resolve with its exit code. */
function spawnRound(args: {
  slug: string;
  vaultRoot: string;
  projectDir: string;
  n: number;
  answers?: { id: string; text: string }[];
  retry?: boolean;
}): Promise<number> {
  const { slug, vaultRoot, projectDir, n, answers, retry } = args;
  return new Promise<number>((resolve) => {
    const logName = `.research-run.${n}${retry ? ".retry" : ""}.log`;
    const log = createWriteStream(path.join(projectDir, logName), { flags: "w" });
    log.on("error", () => {
      /* the folder may have been removed (e.g. under test), so swallow */
    });
    log.write(`[research loop] round ${n}${retry ? " (retry)" : ""} for "${slug}"\n\n`);

    const bin = process.env.CLAUDE_BIN?.trim() || "claude";
    let child;
    try {
      child = spawn(bin, ["--dangerously-skip-permissions", "--print", researchRoundPrompt({ slug, vaultRoot, answers })], {
        cwd: vaultRoot,
        shell: false,
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, DESIGN_STUDIO_VAULT: vaultRoot },
      });
    } catch (err) {
      log.write(`\n[spawn failed] ${(err as Error).message}\n`);
      log.end();
      resolve(1);
      return;
    }

    child.stdout?.on("data", (b: Buffer) => log.write(b));
    child.stderr?.on("data", (b: Buffer) => log.write(b));
    child.on("error", (err: Error) => {
      log.write(`\n[spawn error] ${err.message}. Is the Claude CLI on PATH?\n`);
      log.end();
      resolve(1);
    });
    child.on("exit", (code: number | null) => {
      log.write(`\n[exited] code=${code ?? "null"}\n`);
      log.end();
      resolve(code ?? 1);
    });
  });
}

/** Read + parse the dashboard's committed `Current stage:` line. */
async function readLoopStatus(projectDir: string) {
  try {
    const raw = await fsp.readFile(path.join(projectDir, DASHBOARD), "utf8");
    const line = findStatusLine(raw);
    return line ? parseLoopStatus(line) : null;
  } catch {
    return null;
  }
}

/**
 * Post-round validator: scan Decisions/*.md touched this invocation; any file
 * whose FRONTMATTER claims a human verdict (`authored_by: user` or
 * `status: decided`) from a headless spawn is renamed `<name>.quarantined.md`
 * and logged loudly. The headless loop proposes; only a real human authors a
 * verdict. Frontmatter-scoped so a body that merely quotes those words is not a
 * false positive (the shared predicate with receipt-verify.mjs).
 *
 * A recorded review is the ONE exception: when `opts.exemptBatchId` is set, a
 * decision carrying `review_batch: <that id>` is authorized IFF the review block
 * still hashes to `opts.blockHash` (the tamper fence). A hash mismatch exempts
 * NOTHING, everything claiming a verdict in the window is quarantined.
 */
async function quarantineHeadlessVerdicts(
  projectDir: string,
  sinceMs: number,
  n: number,
  opts?: { exemptBatchId?: string; blockHash?: string },
): Promise<void> {
  const dir = path.join(projectDir, "Decisions");
  let names: string[];
  try {
    names = (await fsp.readdir(dir)).filter((f) => f.endsWith(".md") && !f.endsWith(".quarantined.md"));
  } catch {
    return;
  }

  // Tamper check: a batch is exempt only if its block still hashes to the value
  // the controller captured at write time.
  let tampered = false;
  if (opts?.exemptBatchId && opts?.blockHash) {
    const current = await reviewBlockHash(projectDir, opts.exemptBatchId);
    tampered = current == null || current !== opts.blockHash;
  }

  const flagged: string[] = [];
  for (const name of names) {
    const abs = path.join(dir, name);
    try {
      const st = await fsp.stat(abs);
      if (st.mtimeMs < sinceMs) continue;
      const fm = frontmatterOf(await fsp.readFile(abs, "utf8"));
      const claimsVerdict = /^\s*authored_by:\s*user\b/im.test(fm) || /^\s*status:\s*decided\b/im.test(fm);
      if (!claimsVerdict) continue;
      const batchMatch = fm.match(/^\s*review_batch:\s*(\S+)\s*$/im);
      const batch = batchMatch ? batchMatch[1].replace(/["']/g, "").trim() : null;
      const exempt = !tampered && opts?.exemptBatchId != null && batch === opts.exemptBatchId;
      if (exempt) continue;
      await fsp.rename(abs, abs.replace(/\.md$/, ".quarantined.md"));
      flagged.push(name);
    } catch {
      /* skip a file that vanished mid-scan */
    }
  }
  if (flagged.length) {
    const why = tampered ? " (review block hash mismatch, tamper)" : "";
    const line = `[loop validator] round ${n}: QUARANTINED ${flagged.length} headless verdict(s)${why}: ${flagged.join(", ")}. A headless spawn may write authored_by: user / status: decided ONLY when it cites the authorized review block the controller passed in.\n`;
    try {
      await fsp.appendFile(path.join(projectDir, ".loop-validator.log"), line);
    } catch {
      /* logging is best-effort */
    }
  }
}

/** The frontmatter block (between the leading `---` fences), or "" when absent. */
function frontmatterOf(raw: string): string {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

/** sha256 of the `review:B` block currently on disk in the ledger, or null. */
async function reviewBlockHash(projectDir: string, batchId: string): Promise<string | null> {
  let raw: string;
  try {
    raw = await fsp.readFile(path.join(projectDir, LEDGER), "utf8");
  } catch {
    return null;
  }
  const id = batchId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Contract convention (receipt-verify.mjs + the drain): the INNER text between
  // the begin/end markers, whitespace-trimmed. One convention everywhere; the
  // full-block variant falsely flagged every drained batch as tampered.
  const re = new RegExp(`<!--\\s*review:${id}:begin\\s*-->([\\s\\S]*?)<!--\\s*review:${id}:end\\s*-->`);
  const m = raw.match(re);
  if (!m) return null;
  return createHash("sha256").update(m[1].trim()).digest("hex");
}

// ── The `.loop.lock` (cross-process single-flight + crash resume) ─────────────

async function writeLock(projectDir: string, round: number): Promise<void> {
  try {
    await fsp.writeFile(
      path.join(projectDir, LOCK_FILE),
      JSON.stringify({ pid: process.pid, round, startedAt: Date.now() }),
      "utf8",
    );
  } catch {
    /* non-fatal: the in-process registry is the primary guard */
  }
}

async function removeLock(projectDir: string): Promise<void> {
  try {
    await fsp.rm(path.join(projectDir, LOCK_FILE), { force: true });
  } catch {
    /* already gone */
  }
}

/** True when a `.loop.lock` names a pid that is still alive (a live run). */
async function lockAlive(projectDir: string): Promise<boolean> {
  let raw: string;
  try {
    raw = await fsp.readFile(path.join(projectDir, LOCK_FILE), "utf8");
  } catch {
    return false;
  }
  let pid: unknown;
  try {
    pid = (JSON.parse(raw) as { pid?: unknown }).pid;
  } catch {
    return false;
  }
  if (typeof pid !== "number") return false;
  try {
    process.kill(pid, 0); // signal 0 = liveness probe, doesn't actually signal
    return true;
  } catch {
    return false; // ESRCH → dead pid → the lock is stale, clearable
  }
}

function debriefPrompt({
  slug,
  name,
  brief,
  client,
  vaultRoot,
}: {
  slug: string;
  name: string;
  brief: string;
  client: string;
  vaultRoot: string;
}): string {
  return [
    "Run the design-studio-debrief skill: a HEADLESS round-1 pass for a project the dashboard just created. No interactive user is available, so do NOT ask questions or wait for confirmation, produce the round-1 draft and stop.",
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug}`,
    `Project name: ${name}`,
    `Client: ${client || "(none stated, treat as a client project on the client path)"}`,
    "",
    "The dashboard has ALREADY seeded the project folder under Design Studio/" +
      slug +
      "/ with 00 Dashboard.md and 01 Brief & Problem.md (containing the raw brief below). Enrich that existing folder IN PLACE, this is round 1 on a freshly-seeded folder, NOT a resume, so do not ask whether to resume.",
    "",
    "Raw brief (verbatim):",
    '"""',
    brief,
    '"""',
    "",
    "Do round 1's autonomous drafting and write it into the workspace:",
    "- Read the brief literally; extract the hidden rubric and any embedded scope decisions.",
    "- Restate the brief as a problem (not a task) and record the framing decision 0001 as `proposed`, NEVER `decided` (no user is here to confirm it).",
    "- Capture the guiding principle, or mark it PROVISIONAL.",
    "- Set provisional success criteria in both registers (shipped outcome + in-session signal), marked PROVISIONAL.",
    "- Seed Knowns & Unknowns.md per the SKILL: unknowns from embedded scope decisions and hidden-rubric gaps (NOT pre-routed to humans), load-bearing knowns from the framing's assumptions (state unverified), the convergence block, an empty round log. Render Assumptions & Risks.md from the ledger's load-bearing knowns.",
    "- Seed a thin What's Worth Building.md (Implied but unruled from the full vision; Build and Don't build empty).",
    "- Set 00 Dashboard.md's Current stage to `Current stage: debrief: seeded: round 1`.",
    "Everything stays proposed/provisional. Do not run any other pipeline stage. Do not ask questions.",
  ].join("\n");
}

/**
 * The prompt for ONE research round. The controller, not the agent, owns
 * continuation, so this states a hard one-round contract: attempt the open
 * unknowns, record with receipts, recompile the renders, write the status line
 * LAST as the commit fence, then STOP. When a human-answer batch is present it
 * is ingested first (the resume path). A headless spawn may never author a human
 * verdict.
 */
function researchRoundPrompt({
  slug,
  vaultRoot,
  answers,
}: {
  slug: string;
  vaultRoot: string;
  answers?: { id: string; text: string }[];
}): string {
  const lines = [
    "Run EXACTLY ONE round of the design-studio-research Understand loop for an existing project, per its SKILL.md, then STOP. This is a HEADLESS pass: no interactive user is available, so do NOT ask questions or wait for confirmation. The controlling app decides whether another round runs; you run one round and stop.",
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug} (folder: Design Studio/${slug}/)`,
    "",
  ];

  if (answers && answers.length) {
    lines.push(
      "A human answered questions from the agenda. INGEST this batch FIRST (as an anchored answer batch on the ledger), retiring or answering the matching unknowns and sharpening what they touch, before attempting anything else:",
      "",
      ...answers.map((a) => `- ${a.id}: ${a.text.replace(/\s+/g, " ").trim()}`),
      "",
    );
  }

  lines.push(
    "This round:",
    "- Read 01 Brief & Problem.md (framing) and Knowns & Unknowns.md (the ledger).",
    "- Attempt EVERY open unknown with the moves you can do autonomously (desk sweeps; a pressure-test riding the riskiest load-bearing entry). Write artifacts into 02 Research/.",
    "- Grade and record: mint Knowns with conforming receipts (a quote plus a resolvable [[link]]); a grade of verified/partial REQUIRES a receipt, else downgrade and mark ASSUMPTION. Latch a twice-unprogressed unknown to research-exhausted. Spawn new unknowns with lineage.",
    "- Recompile the renders: What's Worth Building.md (Build / Don't build / Implied but unruled / open-unknowns-blocking, every reason receipted, unevidenced clauses prefixed ASSUMPTION:) and Assumptions & Risks.md (the load-bearing Knowns).",
    "- INTEGRITY: you are headless. NEVER write `authored_by: user` or `status: decided` in any Decisions/*.md; propose only. A directions 🔴 pick or a framing lock is a human's call: record it as a `proposed` parked decision (it renders in What's Worth Building's Parked section) and KEEP RUNNING. A 🔴 never stops the loop (decision 0036); do not fabricate the human's ruling.",
    "- Write 00 Dashboard.md's Current stage line LAST, in the closed grammar, as the commit fence:",
    "  `Current stage: research: researching: round N, dry-streak D, open Y, parked K` while the loop should continue (K = parked decisions this loop, 0 if none),",
    "  or a terminal line (`converged-complete: round N` / `converged-humans-needed: round N, review R` / `capped: round C, review R, open Y`) when it should stop. The first stop is two consecutive dry rounds (dry-streak 2) or the round cap; a parked 🔴 is NOT a stop.",
    "Keep everything provisional. Do not run any other pipeline stage. Do not ask questions.",
  );

  return lines.join("\n");
}

/**
 * The prompt for the review-ingestion recorder. The app has ALREADY written the
 * `review:B` block to the ledger; the recorder reads it from disk (never
 * re-transcribes the human's words) and, under the amended headless-verdict law,
 * may author `authored_by: user` decisions that carry `review_batch: B` and quote
 * only words present in that block. Anything else is quarantined.
 */
function reviewIngestPrompt({
  slug,
  vaultRoot,
  batchId,
}: {
  slug: string;
  vaultRoot: string;
  batchId: string;
}): string {
  return [
    `Run the design-studio-debrief skill in its HEADLESS review-ingestion mode for review batch ${batchId}, then STOP. No interactive user is available, so do NOT ask questions or wait for confirmation. After ingesting, append the line <!-- review:${batchId}:done --> on its own line immediately after the block's end marker (the controller uses it to know the batch is processed), then write the status-line fence last.`,
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug} (folder: Design Studio/${slug}/)`,
    "",
    `The app has ALREADY appended the review block <!-- review:${batchId}:begin/end --> to Design Studio/${slug}/Knowns & Unknowns.md's "## Review log" region. READ that block from disk; it is the authorized source of the human's verbatim words. Do NOT transcribe those words from anywhere else, and do NOT edit the block.`,
    "",
    "Per the review-ingestion protocol:",
    `- Write ONE dispositions decision for batch ${batchId} (frontmatter status: decided, authored_by: user, review_batch: ${batchId}), citing [[Knowns & Unknowns#review ${batchId}]], listing every W-id disposition and quoting the human's words verbatim under "In their words." for each.`,
    `- Write one verdict decision per 🔴 ruling in the block (a framing departure/lock supersedes the framing decision; a directions pick; a route call), each with frontmatter authored_by: user, review_batch: ${batchId}, and the human's words verbatim.`,
    "- Fold any answers in the block into the ledger exactly as the existing anchored answer-batch ingestion does (retire/answer the matching unknowns, mint knowns with receipts, spawn child unknowns with lineage).",
    `- Re-render What's Worth Building.md (v2 tiers) and Assumptions & Risks.md.`,
    `- INTEGRITY: every decision you author for this batch MUST carry review_batch: ${batchId} in its frontmatter and quote only words that occur literally inside the block. Any authored_by: user / status: decided decision without a valid citation to this block will be quarantined.`,
    `- Write 00 Dashboard.md's Current stage line LAST, as the commit fence: "Current stage: debrief: ingested: batch ${batchId}". Research always resumes after ingestion (the controller reopens the loop), so there is no awaiting fence, whether or not the block carried answers.`,
    `- Idempotent: skip any decision already carrying review_batch: ${batchId}.`,
  ].join("\n");
}
