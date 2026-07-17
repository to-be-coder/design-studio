import { promises as fsp } from "node:fs";
import path from "node:path";
import { DESIGN_DIR, getVaultRoot, listProjects } from "./vault";
import { HIDDEN_SLUGS } from "./hidden-projects";
import { findStatusLine } from "./loop-status";
import {
  autorunEnabled,
  clearLoopLock,
  clearLoopProgress,
  pendingReviewBatches,
  pidAlive,
  readLoopLock,
  runResearchLoop,
} from "./debrief-runner";
import { janitorDecision } from "./loop-decision";

/**
 * The boot janitor (decision 0038): before the server takes new work, sweep
 * every real project and pick up what a dead run left behind. A stale lock is
 * cleared; queued review batches and an interrupted `ingested` or `researching`
 * fence resume through the normal loop entry; a project whose old spawn is
 * still alive is left strictly alone until that spawn exits. Terminal fences
 * never auto-resume. Runs once per server process, projects strictly one at a
 * time (never a spawn fan-out at boot), each resume awaited to completion
 * before the next project is even examined.
 *
 * Two switches keep it quiet: DESIGN_STUDIO_NO_RESUME=1 (the e2e kill switch)
 * and the standing DESIGN_STUDIO_AUTORUN_DEBRIEF opt-in every headless spawn
 * already honors; without the opt-in the janitor only reports, it never spawns.
 */

const g = globalThis as unknown as { __designStudioJanitorRan?: boolean };

export async function bootJanitor(): Promise<void> {
  if (g.__designStudioJanitorRan) return;
  g.__designStudioJanitorRan = true;

  // `next build` bootstraps server instances for prerendering; resuming loops
  // belongs to a real serving process only.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.DESIGN_STUDIO_NO_RESUME?.trim() === "1") {
    console.log("[loop janitor] DESIGN_STUDIO_NO_RESUME=1, boot scan skipped");
    return;
  }
  if (!autorunEnabled()) {
    console.log(
      "[loop janitor] skill runs are off (DESIGN_STUDIO_AUTORUN_DEBRIEF unset), boot scan skipped",
    );
    return;
  }

  let root: string;
  try {
    root = await getVaultRoot();
  } catch {
    console.log("[loop janitor] no vault configured, boot scan skipped");
    return;
  }
  let slugs: string[];
  try {
    slugs = (await listProjects()).map((p) => p.slug);
  } catch (err) {
    console.warn(`[loop janitor] could not list projects: ${message(err)}`);
    return;
  }

  for (const slug of slugs) {
    if (HIDDEN_SLUGS.has(slug)) continue;
    const projectDir = path.join(root, DESIGN_DIR, slug);
    try {
      await sweepProject(root, projectDir, slug);
    } catch (err) {
      console.warn(`[loop janitor] ${slug}: ${message(err)}`);
    }
  }
}

async function sweepProject(vaultRoot: string, projectDir: string, slug: string): Promise<void> {
  const lock = await readLoopLock(projectDir);
  const lockState = lock ? { pidAlive: pidAlive(lock.pid), childAlive: pidAlive(lock.childPid) } : null;
  let fenceLine: string | null = null;
  try {
    fenceLine = findStatusLine(await fsp.readFile(path.join(projectDir, "00 Dashboard.md"), "utf8"));
  } catch {
    /* no dashboard: the fence leg of the resume rule simply stays null */
  }
  const pending = await pendingReviewBatches(projectDir);

  const action = janitorDecision({ lock: lockState, fenceLine, pendingCount: pending.length });
  switch (action.kind) {
    case "leave-live":
      console.log(`[loop janitor] live controller (pid ${lock?.pid}) owns ${slug}, leaving it alone`);
      return;
    case "leave-orphan":
      console.log(`[loop janitor] orphan spawn still writing (pid ${lock?.childPid}), leaving ${slug} alone`);
      return;
    case "clear-stale":
      await clearLoopLock(projectDir);
      await clearLoopProgress(projectDir);
      console.log(`[loop janitor] cleared a stale lock on ${slug}, nothing to resume`);
      return;
    case "log-only":
      console.log(`[loop janitor] ${slug} stopped at a "${action.state}" fence, not resuming`);
      return;
    case "resume": {
      if (action.clearLock) await clearLoopLock(projectDir);
      console.log(
        `[loop janitor] resuming ${slug}: ${pending.length} queued review batch${pending.length === 1 ? "" : "es"}, fence "${fenceLine ?? "none"}"`,
      );
      await runResearchLoop({ slug, vaultRoot, projectDir });
      return;
    }
    case "none":
      return;
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
