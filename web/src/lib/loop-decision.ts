import { parseLoopStatus } from "./loop-status";

/**
 * The boot janitor's resume rule as one pure function: lock liveness, the
 * dashboard fence line, and the queued-review count in; one action out.
 * Kept free of fs/process imports so tests can drive it directly.
 */

export interface JanitorInput {
  /** Liveness of the pids a `.loop.lock` names, or null when no lock exists. */
  lock: { pidAlive: boolean; childAlive: boolean } | null;
  /** The dashboard's `Current stage:` line, or null when there is none. */
  fenceLine: string | null;
  /** How many review batches sit in the ledger with no done marker. */
  pendingCount: number;
}

export type JanitorAction =
  /** A live controller owns the project: hands off. */
  | { kind: "leave-live" }
  /** The controller died but its claude child may still be writing: hands off, do not clear. */
  | { kind: "leave-orphan" }
  /** Unfinished work exists: resume via the normal loop entry (clearing a stale lock first). */
  | { kind: "resume"; clearLock: boolean }
  /** Both pids dead and nothing to resume: just clear the stale lock. */
  | { kind: "clear-stale" }
  /** A non-terminal fence that never auto-resumes (an interrupted debrief seed): log it. */
  | { kind: "log-only"; state: string }
  /** Nothing to do. */
  | { kind: "none" };

export function janitorDecision(input: JanitorInput): JanitorAction {
  const { lock, fenceLine, pendingCount } = input;
  if (lock?.pidAlive) return { kind: "leave-live" };
  // An orphaned claude child may still be mutating the vault; two writers is
  // the one unforgivable state. Leave the lock in place so nothing else starts.
  if (lock?.childAlive) return { kind: "leave-orphan" };
  const stale = lock != null;

  const status = fenceLine ? parseLoopStatus(fenceLine) : null;
  // The resume rule: queued review batches, or a loop a dead run left
  // mid-flight (`researching`, or an `ingested` fence whose chained research
  // never started; the parser folds the legacy `answers-ingested` spelling into
  // the same state). Terminal fences and the legacy `parked-decision` /
  // `review: awaiting` fences never auto-resume.
  if (pendingCount > 0 || status?.state === "researching" || status?.state === "answers-ingested") {
    return { kind: "resume", clearLock: stale };
  }
  if (stale) return { kind: "clear-stale" };
  if (status?.state && !status.terminal && status.state !== "awaiting") {
    return { kind: "log-only", state: status.state };
  }
  return { kind: "none" };
}
