import type { LoopStatus } from "./types";

/**
 * Parse the dashboard's "Current stage" line. The Understand loop writes it in a
 * closed, colon-delimited grammar as the commit fence of every round:
 *
 *   Current stage: research: researching: round N, dry-streak D, open Y, parked K
 *   Current stage: research: converged-complete: round N
 *   Current stage: research: converged-humans-needed: round N, review R
 *   Current stage: research: capped: round C, review R, open Y
 *   Current stage: debrief: seeded: round 1
 *   Current stage: debrief: ingested: batch B
 *
 * The in-flight `researching:` line carries an optional `parked K` count: a 🔴
 * is recorded as a proposed parked decision and the loop keeps running (decision
 * 0036), so nothing new emits the legacy terminal `parked-decision:` /
 * `review: awaiting:` lines. Those are still PARSED here (tolerance for old
 * vaults), just never written. The human-facing terminals may carry a `review R`
 * count; the legacy `agenda X` count is still read as a fallback.
 *
 * The board's header statusLine may already have the "Current stage:" prefix
 * stripped, so both forms are handled. Anything that isn't this grammar (a
 * legacy em-dash line, free prose) returns all-null fields with `raw` preserved.
 * Never throws.
 */
export function parseLoopStatus(statusLine: string): LoopStatus {
  const raw = statusLine.trim();
  const legacy: LoopStatus = {
    phase: null,
    state: null,
    running: false,
    round: null,
    dryStreak: null,
    agendaCount: null,
    reviewCount: null,
    openCount: null,
    parkedCount: null,
    terminal: null,
    parkedOn: null,
    raw,
  };

  // Drop an optional "Current stage:" prefix, then split into phase / state /
  // detail on the first two colons (the detail may be empty or free-form).
  const body = raw.replace(/^\s*current stage\s*:\s*/i, "");
  const firstColon = body.indexOf(":");
  if (firstColon === -1) return legacy;
  const phase = body.slice(0, firstColon).trim();
  const afterPhase = body.slice(firstColon + 1);
  const secondColon = afterPhase.indexOf(":");
  const stateRaw = (secondColon === -1 ? afterPhase : afterPhase.slice(0, secondColon)).trim();
  const detail = secondColon === -1 ? "" : afterPhase.slice(secondColon + 1).trim();

  const state = normalizeState(stateRaw);
  if (!phase || !state) return legacy;

  const num = (re: RegExp): number | null => {
    const m = detail.match(re);
    return m ? parseInt(m[1], 10) : null;
  };

  const out: LoopStatus = {
    phase: phase.toLowerCase(),
    state,
    running: state === "researching",
    round: num(/round\s+(\d+)/i) ?? num(/batch\s+(\d+)/i),
    dryStreak: num(/dry[-\s]?streak\s+(\d+)/i),
    agendaCount: num(/agenda\s+(\d+)/i),
    reviewCount: num(/review\s+(\d+)/i),
    openCount: num(/open\s+(\d+)/i),
    parkedCount: num(/parked\s+(\d+)/i),
    terminal: terminalOf(state),
    parkedOn: state === "parked-decision" && detail ? detail.replace(/[<>]/g, "").trim() : null,
    raw,
  };
  return out;
}

/** Map a state token (keyword family) to its canonical form, or null if unknown. */
function normalizeState(s: string): string | null {
  const t = s.toLowerCase().replace(/\s+/g, "-");
  if (/research-exhaust|converged-humans|humans-needed/.test(t)) return "converged-humans-needed";
  if (/converged-complete|converged$/.test(t)) return "converged-complete";
  if (/^capped/.test(t) || /round-cap/.test(t)) return "capped";
  if (/parked/.test(t)) return "parked-decision";
  if (/researching|running/.test(t)) return "researching";
  if (/answers-ingested|ingested/.test(t)) return "answers-ingested";
  if (/awaiting/.test(t)) return "awaiting";
  if (/seeded/.test(t)) return "seeded";
  return null;
}

function terminalOf(state: string): LoopStatus["terminal"] {
  switch (state) {
    case "converged-complete":
      return "converged-complete";
    case "converged-humans-needed":
      return "converged-humans-needed";
    case "capped":
      return "capped";
    case "parked-decision":
      return "parked";
    default:
      return null;
  }
}

/** Grep a dashboard body for its `Current stage:` line (the authoritative status). */
export function findStatusLine(body: string): string | null {
  const m = body.match(/^[ \t>*-]*current stage\s*:.*$/im);
  return m ? m[0].replace(/^[ \t>*-]+/, "").trim() : null;
}
