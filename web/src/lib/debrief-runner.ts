import { spawn } from "node:child_process";
import { createWriteStream, promises as fsp } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { findStatusLine, parseLoopStatus } from "./loop-status";
import type { LoopProgress } from "./types";

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
 * Backoff between spawn retries. Transient API failures come in storms, so two
 * immediate attempts tend to die together; waiting rides the storm out, and the
 * janitor's interval sweep is the backstop if every attempt fails.
 */
function spawnRetryDelays(): number[] {
  const raw = process.env.LOOP_SPAWN_RETRY_DELAYS_MS ?? "30000,120000";
  return raw.split(",").map((s) => Math.max(0, Number(s.trim()) || 0));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
const PROGRESS_FILE = ".loop-progress";
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
   * could observe (the run stays live across the hand-off). A non-zero exit still
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
 * registry says a run is drafting, or a `.loop.lock` on disk names a
 * still-alive pid (the controller's, or its claude child's: an orphaned spawn
 * may still be writing). A lock whose pids are all dead is stale and clearable
 * (a crashed run), so it does NOT count as live.
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
  void runResearchLoop(ctx, opts);
}

/**
 * The awaitable form of {@link startResearchLoop}: resolves when the whole
 * invocation (drain, recorder, rounds) has settled. The boot janitor uses it to
 * resume projects one at a time instead of fanning out a spawn per project.
 * Never rejects; failures land in the registry + the per-run logs.
 */
export function runResearchLoop(ctx: LoopCtx, opts?: ResearchOpts): Promise<void> {
  return runLoop(ctx, opts).catch(() => {
    /* best-effort: errors are captured in the registry + the round log */
  });
}

/**
 * Review blocks persisted in the ledger that no recorder has ingested yet,
 * oldest first. Processed means either the recorder's `<!-- review:B:done -->`
 * marker follows the block, or a decision already carries `review_batch: B`
 * (covers blocks ingested before the marker existed). The hash pins the block's
 * current content for the tamper check, captured here, out of band of the spawn.
 * Exported for the boot janitor (queued batches are a resume reason).
 */
export async function pendingReviewBatches(projectDir: string): Promise<ReviewIngest[]> {
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

/**
 * The debrief → research hand-off. Starts the loop PAST the in-process
 * single-flight guard: the debrief child has just exited, so the only
 * `drafting` entry is debrief's own (not a live research loop), and there is no
 * `.loop.lock` yet. We still honour a real on-disk lock (the paranoid case) so a
 * racing manual run can't double-spawn.
 */
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

  const invocationStart = Date.now();
  registry.set(slug, { stage: "research", state: "drafting", round: 0 });
  await writeLock(projectDir, 0);

  let errored = false;
  // A clean recorder exit always chains a fresh research invocation, AFTER the
  // lock is released (a chained runLoop must not see this invocation as live).
  let chainAfterRelease = false;

  try {
    // Drain the review queue before any research round: blocks persisted while
    // another run was live (or while the server was down) are picked up here.
    // The registry stays `stage: "research"` for the whole drain so the
    // existing status poll works unchanged.
    const pending = await pendingReviewBatches(projectDir);
    if (opts?.review) {
      const scanned = pending.find((b) => b.batchId === opts.review!.batchId);
      if (scanned) {
        // The route captured this hash at the block's write; it outranks the
        // scan's own capture for the tamper fence.
        if (opts.review.blockHash) scanned.blockHash = opts.review.blockHash;
      } else {
        // The submitted block is not on disk (or already carries a done
        // marker): nothing legitimate does that between the route's write and
        // here, so refuse rather than silently running rounds past it.
        await appendDrainLog(
          projectDir,
          opts.review.batchId,
          `[tamper fence] block ${opts.review.batchId} missing from the ledger; refusing to spawn.\n`,
        );
        errored = true;
      }
    }

    let runRounds = !errored;
    if (!errored && pending.length > 0) {
      // Pure duplicates close on the spot (no spawn); everything still open
      // goes to ONE recorder invocation, oldest first.
      const open = await closePureDuplicates(projectDir, pending);
      if (open.length > 0) {
        errored = !(await ingestReviewBatches(ctx, open, invocationStart));
        chainAfterRelease = !errored;
        runRounds = false;
      } else {
        // Every queued batch was a pure duplicate: nothing new was said, so
        // nothing spawns. Rounds still run when a dead run left the loop
        // mid-flight (the boot-resume path); a settled terminal fence stays put.
        const state = (await readLoopStatus(projectDir))?.state;
        runRounds = state === "researching" || state === "answers-ingested";
      }
    }

    if (runRounds) {
      let roundsThisInvocation = 0;
      let answers = opts?.answers;
      // The last committed round, mirrored into the lock at every write so a
      // mid-spawn lock (carrying childPid) still reports where the loop stood.
      let lockRound = 0;

      while (true) {
        roundsThisInvocation += 1;
        const n = roundsThisInvocation;
        const onSpawn = (pid: number) => {
          void writeLock(projectDir, lockRound, pid);
          void writeProgress(projectDir, { phase: "research", round: n, spawnPid: pid, spawnedAt: Date.now() });
        };

        let code = await spawnRound({ slug, vaultRoot, projectDir, n, answers, onSpawn });
        answers = undefined; // only the first round of an invocation embeds the batch
        for (const delayMs of spawnRetryDelays()) {
          if (code === 0) break;
          await sleep(delayMs);
          code = await spawnRound({ slug, vaultRoot, projectDir, n, answers: undefined, retry: true, onSpawn });
        }
        if (code !== 0) {
          // Every attempt failed; stop with an error, NOT counted as progress.
          // The interval sweep resumes the loop once the storm passes.
          errored = true;
          break;
        }

        // 🔴 integrity: a headless spawn may never author a human verdict. Quarantine
        // any decision written this invocation that claims one.
        await quarantineHeadlessVerdicts(projectDir, invocationStart, n);

        const status = await readLoopStatus(projectDir);
        const ledgerRound = status?.round ?? n;
        registry.set(slug, { stage: "research", state: "drafting", round: ledgerRound });
        lockRound = ledgerRound;
        await writeLock(projectDir, ledgerRound); // the spawn exited: childPid clears

        const researching = status?.state === "researching";
        if (!researching) break;
        if (ledgerRound >= ROUND_CAP) break;
        if (roundsThisInvocation >= ROUND_CAP) break;
      }
    }
  } finally {
    const round = registry.get(slug)?.round;
    registry.set(slug, { stage: "research", state: errored ? "error" : "done", round });
    await removeProgress(projectDir);
    await removeLock(projectDir);
  }

  // The recorder folded the batches in and wrote the `ingested` fence; the
  // controller (not the spawn) reopens the loop, fresh, on every clean exit:
  // a new invocation is a new round budget, since a human cycle just closed.
  // Verdicts-only, ruling-only, answers: all resume research now (decision
  // 0036); a batch that added nothing new converges in one cheap round, since
  // exhausted unknowns are not re-attempted.
  if (chainAfterRelease) startResearchLoop(ctx);
}

/**
 * Spawn ONE debrief review-ingestion recorder for every still-open batch,
 * oldest first, then validate. Resolves true on a clean recorder exit.
 *
 * Tamper fence, checked BEFORE the spawn, per batch: between the app's write
 * (or the drain's scan) and this moment, nothing legitimate touches a block, so
 * a mismatch here is real tampering and the WHOLE spawn is refused, naming the
 * failing batch. After the spawn the recorder legitimately rewrites the ledger
 * (folding answers, re-rendering), so a post-run content hash would quarantine
 * the recorder's own valid work (it did, twice, on forma).
 */
async function ingestReviewBatches(
  ctx: LoopCtx,
  batches: ReviewIngest[],
  invocationStart: number,
): Promise<boolean> {
  const { slug, vaultRoot, projectDir } = ctx;
  const ids = batches.map((b) => b.batchId);

  for (const b of batches) {
    const blockNow = await reviewBlockHash(projectDir, b.batchId);
    if (blockNow == null || (b.blockHash && blockNow !== b.blockHash)) {
      await appendDrainLog(
        projectDir,
        ids.join("-"),
        `[tamper fence] block ${b.batchId} ${blockNow == null ? "missing" : "hash mismatch"}; refusing to spawn for batches ${ids.join(", ")}.\n`,
      );
      return false;
    }
  }

  const firstBatch = Number.parseInt(batches[0].batchId, 10);
  const onSpawn = (pid: number) => {
    void writeLock(projectDir, 0, pid);
    void writeProgress(projectDir, {
      phase: "recorder",
      batch: Number.isFinite(firstBatch) ? firstBatch : undefined,
      spawnPid: pid,
      spawnedAt: Date.now(),
    });
  };
  let code = await spawnRecorder({ slug, vaultRoot, projectDir, batches, onSpawn });
  for (const delayMs of spawnRetryDelays()) {
    if (code === 0) break;
    await sleep(delayMs);
    code = await spawnRecorder({ slug, vaultRoot, projectDir, batches, retry: true, onSpawn });
  }
  // 🔴 integrity: a headless recorder may author authored_by: user / decided
  // ONLY for decisions citing one of THESE authorized batches (the content-hash
  // check already ran, pre-spawn).
  await quarantineHeadlessVerdicts(projectDir, invocationStart, 0, { exemptBatchIds: ids });
  await writeLock(projectDir, 0); // the spawn exited: childPid clears
  return code === 0;
}

// ── The duplicate short-circuit (the app's third bounded vault write) ─────────

/**
 * Close every pure-duplicate batch in the queue and return the rest, oldest
 * first. A pure duplicate says nothing new (dispositions only, every one
 * matching the newest recorded verdict), so the controller appends its
 * `<!-- review:B:done -->` marker itself and never spawns for it. That marker
 * append is the app's THIRD bounded vault write, bookkeeping beside the two
 * transcription writes; it may never grow past the one marker line.
 */
async function closePureDuplicates(
  projectDir: string,
  pending: ReviewIngest[],
): Promise<ReviewIngest[]> {
  let recorded: Map<string, string> | null = null;
  const open: ReviewIngest[] = [];
  let closed = 0;
  for (const b of pending) {
    const inner = await reviewBlockInner(projectDir, b.batchId);
    const verdicts = inner == null ? null : pureDuplicateVerdicts(inner);
    if (!verdicts || verdicts.length === 0) {
      open.push(b);
      continue;
    }
    recorded ??= await newestRecordedVerdicts(projectDir);
    if (!verdicts.every((v) => recorded!.get(v.id) === v.verdict)) {
      open.push(b);
      continue;
    }
    if (!(await appendDoneMarker(projectDir, b.batchId))) {
      // The marker write failed; leave the batch for the recorder rather than
      // dropping it.
      open.push(b);
      continue;
    }
    closed += 1;
    await appendDrainLog(
      projectDir,
      b.batchId,
      `[drain] batch ${b.batchId} repeats the recorded verdicts exactly (dispositions only); closed with its done marker, no spawn.\n`,
    );
  }
  // A one-shot heartbeat so the file is fresh even when nothing spawns.
  if (closed > 0) await writeProgress(projectDir, { phase: "drain", spawnedAt: Date.now() });
  return open;
}

/**
 * Parse a review block's inner text for the duplicate check. Returns the
 * disposition list ONLY when the block carries dispositions alone, every line
 * a bare `W<k>: <verdict>`: no answers, no rulings, no typed note, no
 * `unblocks:`, no free prose. Anything else returns null and the batch always
 * gets the recorder. Exported for the drain's tests.
 */
export function pureDuplicateVerdicts(inner: string): { id: string; verdict: string }[] | null {
  const out: { id: string; verdict: string }[] = [];
  let inDispositions = false;
  for (const raw of inner.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const top = raw.match(/^-\s+([A-Za-z_]+):\s*(.*)$/);
    if (top) {
      const key = top[1].toLowerCase();
      if (key === "dispositions") {
        if (top[2].trim()) return null;
        inDispositions = true;
        continue;
      }
      if (key === "date" || key === "reviewer" || key === "wwb_round" || key === "entries_hash") {
        inDispositions = false;
        continue;
      }
      // answers, rulings, or anything this parser does not know.
      return null;
    }
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && inDispositions) {
      const m = item[1].match(/^(W\d+)\s*:\s*(build-now|backlog|dont-build)$/i);
      if (!m) return null;
      out.push({ id: m[1].toUpperCase(), verdict: m[2].toLowerCase() });
      continue;
    }
    return null;
  }
  return out.length > 0 ? out : null;
}

/**
 * The newest recorded verdict per W-id: from the decided dispositions decisions
 * in Decisions/*.md, the highest `review_batch` number naming the id wins.
 * Tolerant line parse (the recorder writes prose-adjacent bullets); a W-id this
 * map does not know simply never matches, so the batch goes to the recorder.
 * Exported for the drain's tests.
 */
export async function newestRecordedVerdicts(projectDir: string): Promise<Map<string, string>> {
  const dir = path.join(projectDir, "Decisions");
  let names: string[];
  try {
    names = (await fsp.readdir(dir)).filter((f) => f.endsWith(".md") && !f.endsWith(".quarantined.md"));
  } catch {
    return new Map();
  }
  const perBatch: { batch: number; verdicts: Map<string, string> }[] = [];
  for (const name of names) {
    let raw: string;
    try {
      raw = await fsp.readFile(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    const fm = frontmatterOf(raw);
    const bm = fm.match(/^\s*review_batch:\s*["']?(\d+)["']?\s*$/im);
    if (!bm || !/^\s*status:\s*decided\b/im.test(fm)) continue;
    const verdicts = new Map<string, string>();
    for (const m of raw.matchAll(/^\s*[-*]\s*(W\d+)\s*:\s*(.+)$/gim)) {
      const v = normalizeVerdict(m[2]);
      const id = m[1].toUpperCase();
      if (v && !verdicts.has(id)) verdicts.set(id, v);
    }
    if (verdicts.size > 0) perBatch.push({ batch: parseInt(bm[1], 10), verdicts });
  }
  perBatch.sort((a, b) => b.batch - a.batch);
  const out = new Map<string, string>();
  for (const { verdicts } of perBatch) {
    for (const [id, v] of verdicts) if (!out.has(id)) out.set(id, v);
  }
  return out;
}

/** Same keyword families as the WWB render's disposition parse (newest-wins). */
function normalizeVerdict(v: string): "build-now" | "backlog" | "dont-build" | null {
  const t = v.toLowerCase();
  if (/don'?t|dont|won'?t/.test(t)) return "dont-build";
  if (/backlog|defer/.test(t)) return "backlog";
  if (/build/.test(t)) return "build-now";
  return null;
}

/**
 * Append `<!-- review:B:done -->` on its own line right after the block's end
 * marker, atomically (temp + rename, like the app's other bounded writes).
 * Exactly the one marker line, nothing else. True when the marker is in place.
 */
async function appendDoneMarker(projectDir: string, batchId: string): Promise<boolean> {
  const ledgerPath = path.join(projectDir, LEDGER);
  let raw: string;
  try {
    raw = await fsp.readFile(ledgerPath, "utf8");
  } catch {
    return false;
  }
  const id = escapeRe(batchId);
  if (new RegExp(`<!--\\s*review:${id}:done\\s*-->`).test(raw)) return true;
  const end = raw.match(new RegExp(`<!--\\s*review:${id}:end\\s*-->`));
  if (!end || end.index == null) return false;
  const at = end.index + end[0].length;
  const out = `${raw.slice(0, at)}\n<!-- review:${batchId}:done -->${raw.slice(at)}`;
  const tmp = `${ledgerPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fsp.writeFile(tmp, out, "utf8");
    await fsp.rename(tmp, ledgerPath);
    return true;
  } catch {
    await fsp.rm(tmp, { force: true }).catch(() => {});
    return false;
  }
}

/** Best-effort line into the batch's `.review-record.<ids>.log`. */
async function appendDrainLog(projectDir: string, ids: string, line: string): Promise<void> {
  try {
    await fsp.appendFile(path.join(projectDir, `.review-record.${ids}.log`), line);
  } catch {
    /* logging is best-effort */
  }
}

/** Spawn ONE recorder for the open batches, oldest first; resolve its exit code. */
function spawnRecorder(args: {
  slug: string;
  vaultRoot: string;
  projectDir: string;
  batches: ReviewIngest[];
  retry?: boolean;
  /** Reports the child pid right after a successful spawn (lock + heartbeat). */
  onSpawn?: (pid: number) => void;
}): Promise<number> {
  const { slug, vaultRoot, projectDir, batches, retry, onSpawn } = args;
  const ids = batches.map((b) => b.batchId);
  return new Promise<number>((resolve) => {
    const logName = `.review-record.${ids.join("-")}${retry ? ".retry" : ""}.log`;
    const log = createWriteStream(path.join(projectDir, logName), { flags: "w" });
    log.on("error", () => {
      /* the folder may have been removed (e.g. under test), so swallow */
    });
    log.write(`[review recorder] batch${ids.length > 1 ? "es" : ""} ${ids.join(", ")}${retry ? " (retry)" : ""} for "${slug}"\n\n`);

    const bin = process.env.CLAUDE_BIN?.trim() || "claude";
    let child;
    try {
      child = spawn(bin, ["--dangerously-skip-permissions", "--print", reviewIngestPrompt({ slug, vaultRoot, batches })], {
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
    if (typeof child.pid === "number" && onSpawn) onSpawn(child.pid);

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
  /** Reports the child pid right after a successful spawn (lock + heartbeat). */
  onSpawn?: (pid: number) => void;
}): Promise<number> {
  const { slug, vaultRoot, projectDir, n, answers, retry, onSpawn } = args;
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
    if (typeof child.pid === "number" && onSpawn) onSpawn(child.pid);

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
 * A recorded review is the ONE exception: a decision carrying `review_batch:
 * <an id in opts.exemptBatchIds>` (or the older single `opts.exemptBatchId`,
 * kept for compatibility) is authorized. When `opts.blockHash` rides with a
 * single exempt id, the exemption additionally requires the block to still
 * hash to it (the tamper fence). A hash mismatch exempts NOTHING, everything
 * claiming a verdict in the window is quarantined.
 */
async function quarantineHeadlessVerdicts(
  projectDir: string,
  sinceMs: number,
  n: number,
  opts?: { exemptBatchId?: string; exemptBatchIds?: string[]; blockHash?: string },
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
  const exemptIds = new Set<string>(opts?.exemptBatchIds ?? []);
  if (opts?.exemptBatchId) exemptIds.add(opts.exemptBatchId);

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
      const exempt = !tampered && batch != null && exemptIds.has(batch);
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

/**
 * The `review:B` block's inner text (between the begin/end marker lines),
 * trimmed, as currently on disk; or null. Contract convention
 * (receipt-verify.mjs + the drain): the hash everywhere is sha256 of exactly
 * this text. One convention; the full-block variant falsely flagged every
 * drained batch as tampered.
 */
async function reviewBlockInner(projectDir: string, batchId: string): Promise<string | null> {
  let raw: string;
  try {
    raw = await fsp.readFile(path.join(projectDir, LEDGER), "utf8");
  } catch {
    return null;
  }
  const id = escapeRe(batchId);
  const re = new RegExp(`<!--\\s*review:${id}:begin\\s*-->([\\s\\S]*?)<!--\\s*review:${id}:end\\s*-->`);
  const m = raw.match(re);
  if (!m) return null;
  return m[1].trim();
}

/** sha256 of the `review:B` block currently on disk in the ledger, or null. */
async function reviewBlockHash(projectDir: string, batchId: string): Promise<string | null> {
  const inner = await reviewBlockInner(projectDir, batchId);
  if (inner == null) return null;
  return createHash("sha256").update(inner).digest("hex");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── The `.loop.lock` (cross-process single-flight + crash resume) ─────────────

/** What a `.loop.lock` holds, every field absent-tolerant on read. */
export interface LoopLockFile {
  pid: number | null;
  /** The live claude spawn's pid, present only while a spawn runs. */
  childPid: number | null;
  round: number | null;
  startedAt: number | null;
}

async function writeLock(projectDir: string, round: number, childPid?: number): Promise<void> {
  try {
    const lock: Record<string, number> = { pid: process.pid, round, startedAt: Date.now() };
    // Written per spawn, cleared by the next childPid-less write: the boot
    // janitor's orphan rule needs to know whether a dead controller's claude
    // child may still be writing the vault.
    if (typeof childPid === "number") lock.childPid = childPid;
    await fsp.writeFile(path.join(projectDir, LOCK_FILE), JSON.stringify(lock), "utf8");
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

/** Remove a project's `.loop.lock` (the janitor clearing a stale one). */
export async function clearLoopLock(projectDir: string): Promise<void> {
  await removeLock(projectDir);
}

/**
 * Remove a project's `.loop-progress` (the janitor, with a stale lock: the
 * heartbeat dies at the same moments the lock does, or the banner would show a
 * dead spawn forever).
 */
export async function clearLoopProgress(projectDir: string): Promise<void> {
  await removeProgress(projectDir);
}

/** Parse a project's `.loop.lock`, or null when absent or unreadable. */
export async function readLoopLock(projectDir: string): Promise<LoopLockFile | null> {
  let raw: string;
  try {
    raw = await fsp.readFile(path.join(projectDir, LOCK_FILE), "utf8");
  } catch {
    return null;
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return { pid: num(data.pid), childPid: num(data.childPid), round: num(data.round), startedAt: num(data.startedAt) };
}

/** Is this pid a live process? Signal 0 = liveness probe, doesn't actually signal. */
export function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false; // ESRCH → dead pid
  }
}

/**
 * True when a `.loop.lock` names a still-alive pid: the controller's, or its
 * spawned claude child's. An orphaned child (controller died, spawn survived)
 * still counts as live, because it may still be writing the vault, and two
 * writers is the one unforgivable state.
 */
async function lockAlive(projectDir: string): Promise<boolean> {
  const lock = await readLoopLock(projectDir);
  if (!lock) return false;
  return pidAlive(lock.pid) || pidAlive(lock.childPid);
}

// ── The `.loop-progress` heartbeat ────────────────────────────────────────────

/**
 * Written at every spawn start (and once when the drain closes duplicates),
 * deleted with the lock when the loop ends. The status API relays it; the
 * banner renders it with elapsed time, so a twenty-minute spawn looks like
 * work instead of looking broken.
 */
async function writeProgress(
  projectDir: string,
  p: { phase: LoopProgress["phase"]; batch?: number; round?: number; spawnPid?: number; spawnedAt: number },
): Promise<void> {
  try {
    await fsp.writeFile(
      path.join(projectDir, PROGRESS_FILE),
      JSON.stringify({ ...p, updatedAt: Date.now() }),
      "utf8",
    );
  } catch {
    /* the heartbeat is best-effort */
  }
}

async function removeProgress(projectDir: string): Promise<void> {
  try {
    await fsp.rm(path.join(projectDir, PROGRESS_FILE), { force: true });
  } catch {
    /* already gone */
  }
}

/** Parse a project's `.loop-progress`, or null when absent or malformed. */
export async function readLoopProgress(projectDir: string): Promise<LoopProgress | null> {
  let raw: string;
  try {
    raw = await fsp.readFile(path.join(projectDir, PROGRESS_FILE), "utf8");
  } catch {
    return null;
  }
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (d.phase !== "recorder" && d.phase !== "research" && d.phase !== "drain") return null;
    const num = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;
    return {
      phase: d.phase,
      batch: num(d.batch),
      round: num(d.round),
      spawnPid: num(d.spawnPid),
      spawnedAt: num(d.spawnedAt) ?? 0,
      updatedAt: num(d.updatedAt) ?? 0,
    };
  } catch {
    return null;
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
 * The prompt for the review-ingestion recorder: one spawn for every open
 * batch, oldest first. The app has ALREADY written each `review:B` block to
 * the ledger; the recorder reads them from disk (never re-transcribes the
 * human's words) and, under the amended headless-verdict law, may author
 * `authored_by: user` decisions that carry an authorized `review_batch: B` and
 * quote only words present in that batch's block. Anything else is
 * quarantined. Each batch id rides with its content hash, out of band of the
 * vault (this prompt is a process arg).
 */
function reviewIngestPrompt({
  slug,
  vaultRoot,
  batches,
}: {
  slug: string;
  vaultRoot: string;
  batches: ReviewIngest[];
}): string {
  const ids = batches.map((b) => b.batchId);
  // The hash stays with the controller (pre-spawn fence + post-run quarantine);
  // the recorder is never handed it (SKILL.md, recorder step 2).
  const listing = ids.join(", ");
  const plural = ids.length > 1;
  return [
    `Run the design-studio-debrief skill in its HEADLESS review-ingestion mode: ingest review batch${plural ? "es" : ""} ${listing} in that order, then STOP. No interactive user is available, so do NOT ask questions or wait for confirmation. Take the batches oldest first (the order given) and complete each one fully, through its own fence, before opening the next, so a crash mid-list leaves every earlier batch committed.`,
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug} (folder: Design Studio/${slug}/)`,
    "",
    `The app has ALREADY appended each review block <!-- review:B:begin/end --> to Design Studio/${slug}/Knowns & Unknowns.md's "## Review log" region. READ each block from disk; it is the authorized source of the human's verbatim words. Do NOT transcribe those words from anywhere else, and do NOT edit the blocks.`,
    "",
    "Per batch B, in order:",
    `- Write ONE dispositions decision for batch B (frontmatter status: decided, authored_by: user, review_batch: B), citing [[Knowns & Unknowns#review B]], listing every W-id disposition and quoting the human's words verbatim under "In their words." for each (a click-only entry quotes the block's own line, marked "chosen by click; no words typed").`,
    `- Write one verdict decision per 🔴 ruling in the block (a framing departure/lock supersedes the framing decision; a directions pick; a route call), each with frontmatter authored_by: user, review_batch: B, and the human's words verbatim.`,
    "- Fold any answers in the block into the ledger exactly as the existing anchored answer-batch ingestion does (retire/answer the matching unknowns, mint knowns with receipts, spawn child unknowns with lineage).",
    `- Re-render What's Worth Building.md (v2 tiers) and Assumptions & Risks.md.`,
    `- Append the line <!-- review:B:done --> on its own line immediately after that block's end marker (the controller uses it to know the batch is processed).`,
    `- Write 00 Dashboard.md's Current stage line LAST, as that batch's commit fence: "Current stage: debrief: ingested: batch B". Research always resumes after ingestion (the controller reopens the loop), so there is no awaiting fence, whether or not the block carried answers.`,
    "",
    `INTEGRITY: the authorized batch id${plural ? "s are" : " is"} ${ids.join(", ")}, and no other. Every decision you author MUST carry one of ${plural ? "these ids" : "this id"} as review_batch in its frontmatter and quote only words that occur literally inside that batch's block. Any authored_by: user / status: decided decision without a valid citation to an authorized block will be quarantined.`,
    `Idempotent: skip any decision already carrying review_batch: B for a batch listed above.`,
  ].join("\n");
}
