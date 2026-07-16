import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import path from "node:path";

/**
 * Run design-studio skills as headless background passes from the canvas —
 * `debrief` round 1 when a project is created, and `research` on demand from the
 * Research board. Each spawns a real Claude agent that WRITES the vault, so the
 * whole capability is gated behind DESIGN_STUDIO_AUTORUN_DEBRIEF (opt-in, off by
 * default) — it can never fire in tests or surprise anyone. Everything a run
 * writes stays `proposed`/provisional, and runs are best-effort: failures land
 * in a per-run log file in the project folder, never blocking the UI.
 */

export type RunState = "drafting" | "done" | "error";
/** What's running for a slug, and its state — drives the sidebar's pulsing dot. */
export interface RunStatus {
  stage: string;
  state: RunState;
}

const g = globalThis as unknown as { __designStudioRuns?: Map<string, RunStatus> };
const registry: Map<string, RunStatus> = g.__designStudioRuns ?? (g.__designStudioRuns = new Map());

/** True when the canvas may run design-studio skills headlessly (opt-in). */
export function autorunEnabled(): boolean {
  return !!process.env.DESIGN_STUDIO_AUTORUN_DEBRIEF?.trim();
}

/** Stages the canvas can trigger on demand from their board (debrief auto-runs on Create). */
export const RUNNABLE_STAGES = new Set(["research", "structure"]);
export function isRunnableStage(stage: string): boolean {
  return RUNNABLE_STAGES.has(stage);
}

export function getRunState(slug: string): RunStatus | null {
  return registry.get(slug) ?? null;
}

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
}): void {
  const { slug, stage, prompt, vaultRoot, projectDir, logName } = opts;
  const log = createWriteStream(path.join(projectDir, logName), { flags: "w" });
  log.on("error", () => {
    /* the folder may have been removed (e.g. under test) — swallow */
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
    log.write(`\n[spawn error] ${err.message} — is the Claude CLI on PATH?\n`);
    log.end();
  });
  child.on("exit", (code: number | null) => {
    registry.set(slug, { stage, state: code === 0 ? "done" : "error" });
    log.write(`\n[exited] code=${code ?? "null"}\n`);
    log.end();
  });
}

interface DebriefInputs {
  slug: string;
  name: string;
  brief: string;
  client: string;
  vaultRoot: string;
  /** The already-seeded project folder — where the log lands. */
  projectDir: string;
}

/** Fire debrief round 1 headless (the project folder is pre-seeded by the caller). */
export function startDebriefDraft({ slug, name, brief, client, vaultRoot, projectDir }: DebriefInputs): void {
  runSkill({
    slug,
    stage: "debrief",
    prompt: debriefPrompt({ slug, name, brief, client, vaultRoot }),
    vaultRoot,
    projectDir,
    logName: ".debrief-draft.log",
  });
}

/** Fire a runnable stage's skill (research / structure) headless for an existing project. */
export function startStageRun({
  slug,
  stage,
  vaultRoot,
  projectDir,
}: {
  slug: string;
  stage: string;
  vaultRoot: string;
  projectDir: string;
}): void {
  runSkill({
    slug,
    stage,
    prompt: stagePrompt(stage, { slug, vaultRoot }),
    vaultRoot,
    projectDir,
    logName: `.${stage}-run.log`,
  });
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
    "Run the design-studio-debrief skill: a HEADLESS round-1 pass for a project the dashboard just created. No interactive user is available, so do NOT ask questions or wait for confirmation — produce the round-1 draft and stop.",
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug}`,
    `Project name: ${name}`,
    `Client: ${client || "(none stated — treat as a client project on the client path)"}`,
    "",
    "The dashboard has ALREADY seeded the project folder under Design Studio/" +
      slug +
      "/ with 00 Dashboard.md and 01 Brief & Problem.md (containing the raw brief below). Enrich that existing folder IN PLACE — this is round 1 on a freshly-seeded folder, NOT a resume, so do not ask whether to resume.",
    "",
    "Raw brief (verbatim):",
    '"""',
    brief,
    '"""',
    "",
    "Do round 1's autonomous drafting and write it into the workspace:",
    "- Read the brief literally; extract the hidden rubric and any embedded scope decisions.",
    "- Restate the brief as a problem (not a task) and record the framing decision 0001 as `proposed` — NEVER `decided` (no user is here to confirm it).",
    "- Capture the guiding principle, or mark it PROVISIONAL.",
    "- Set provisional success criteria in both registers (shipped outcome + in-session signal), marked PROVISIONAL.",
    "- Seed the risk register (Assumptions & Risks.md) with the assumptions the framing rests on, status untested.",
    "- Draft the clarification agenda in Clarifications.md — the questions to take to the client.",
    "- Set 00 Dashboard.md's Current stage to `debrief — round 1, awaiting review`.",
    "Everything stays proposed/provisional. Do not run any other pipeline stage. Do not ask questions.",
  ].join("\n");
}

function stagePrompt(stage: string, ctx: { slug: string; vaultRoot: string }): string {
  return stage === "structure" ? structurePrompt(ctx) : researchPrompt(ctx);
}

function researchPrompt({ slug, vaultRoot }: { slug: string; vaultRoot: string }): string {
  return [
    "Run the design-studio-research skill for an EXISTING project — a HEADLESS pass. No interactive user is available, so do NOT ask questions or wait; produce this round's research and stop.",
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug} (folder: Design Studio/${slug}/)`,
    "",
    "Read that project's 01 Brief & Problem.md (framing) and Clarifications.md (open agenda). Run research as the orchestrator, doing the moves you can do autonomously — desk sweeps and a pressure-test of the riskiest assumption — and writing each artifact into 02 Research/.",
    "For any move that genuinely needs the user (the directions 🔴 pick, live interviews), do NOT fabricate a choice — note it in the report as awaiting the user.",
    "Close the round with a research report that names a recommendation and the assumptions it rests on, and includes the reframe check (does the evidence follow, subtract from, or depart the debrief framing?). Update 00 Dashboard.md's Current stage. Keep everything provisional. Do not ask questions.",
  ].join("\n");
}

function structurePrompt({ slug, vaultRoot }: { slug: string; vaultRoot: string }): string {
  return [
    "Run the design-studio-structure skill for an EXISTING project — a HEADLESS pass. No interactive user is available, so do NOT ask questions or wait; produce the draft and stop.",
    "",
    `Vault: ${vaultRoot}`,
    `Project slug: ${slug} (folder: Design Studio/${slug}/)`,
    "",
    "Read the accepted recommendation (from the research report(s) in 02 Research/) and Agreements.md. Draft the product's bones: the core user/task flows for the main journeys, a screen/state inventory, and the navigation model.",
    "Write it to 03 Structure.md. This is a 🟡 draft for the user to edit, so keep it provisional; do not run any other pipeline stage, and do not ask questions.",
  ].join("\n");
}
