import { parseMarkdownBody } from "./parse-markdown";
import { joinSoftWraps } from "./soft-wrap";
import { listProjectFiles, readProjectFile } from "./vault";
import { docBodyCache, withWebSources, type DocBodies } from "./web-sources";
import { extractReceipts } from "./wikilinks";
import type { LedgerEntry, LedgerModel, LedgerState } from "./types";

const LEDGER_FILE = "Knowns & Unknowns.md";

/**
 * Parse `Knowns & Unknowns.md` into the ledger model, the Understand loop's
 * spine. Tolerant by design: entries are `### L<N>: <text>` headings, and under
 * each a set of labeled lines (`kind:`, `state:`, `load_bearing:`, `attempts:`,
 * `spawned_by:` / `answered_by:`, `receipts:`, `note:`, `ask:`), any of which may
 * be missing. Unlabeled prose becomes note blocks. The optional `## Human agenda`
 * and convergence sections aren't required: the rollup counts are DERIVED from
 * the entries so the parser works on a ledger that has neither.
 */
export async function getLedger(slug: string): Promise<LedgerModel | null> {
  const file = await readProjectFile(slug, LEDGER_FILE);
  if (!file) return null;
  const files = await listProjectFiles(slug);

  const raw = file.body;
  // Hard-wrapped files: glue soft-wrapped continuation lines back onto their
  // label / prose line first, so a wrapped `note:` or `ask:` keeps its tail
  // instead of leaking it into the body as a stray mid-sentence paragraph.
  const lines = joinSoftWraps(raw.split(/\r?\n/));

  interface Raw {
    id: string;
    title: string;
    lines: string[];
  }
  const raws: Raw[] = [];
  let cur: Raw | null = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(L\d+)\s*[:.)-]?\s*(.*)$/i);
    if (h) {
      cur = { id: h[1].toUpperCase(), title: h[2].trim(), lines: [] };
      raws.push(cur);
      continue;
    }
    // A new H2/H3 that isn't an L-entry closes the current entry (agenda /
    // convergence / Knowns headers all land here and are simply not entries).
    if (/^##+\s+/.test(line)) {
      cur = null;
      continue;
    }
    if (cur) cur.lines.push(line);
  }

  // One doc-body cache per request: web-source resolution reads the cited docs.
  const bodies = docBodyCache(slug);
  const entries: LedgerEntry[] = await Promise.all(
    raws.map((r) => buildEntry(r.id, r.title, r.lines, files, bodies)),
  );

  const escalated = entries.filter((e) => e.state === "research-exhausted");
  const retired = entries.filter((e) => e.state === "retired");
  const open = entries.filter(
    (e) => e.state !== "research-exhausted" && e.state !== "retired",
  );

  return {
    entries,
    open,
    escalated,
    retired,
    humanOpenCount: escalated.length,
    recordedRulings: parseRecordedRulings(raw),
    recordedAnswers: parseRecordedAnswers(raw),
  };
}

/**
 * Rulings already written into the ledger's Review log, id → disposition (a
 * later block wins over an earlier one). The parked card in WWB reads as ruled
 * from these until research re-scopes the file, so hitting refresh right after
 * Record ruling still shows the ruling as recorded.
 */
function parseRecordedRulings(body: string): Record<string, "accept" | "reject" | "reshape"> {
  const out: Record<string, "accept" | "reject" | "reshape"> = {};
  for (const block of reviewBlocks(body)) {
    for (const m of block.matchAll(/^\s*-\s+(\S+):\s+(accept|reject|reshape)\b/gim)) {
      out[m[1]] = m[2].toLowerCase() as "accept" | "reject" | "reshape";
    }
  }
  return out;
}

/**
 * Answers already written into the Review log, id → answer text (a later block
 * wins). Same purpose as the rulings: an answered question reads as answered
 * across a page refresh, before research folds it back into the ledger. Only
 * quoted `- L<id>: "text"` lines match; block metadata and verdict lines have
 * no quote right after the colon.
 */
function parseRecordedAnswers(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of reviewBlocks(body)) {
    for (const m of block.matchAll(/^\s*-\s+([A-Za-z]\w*):\s+"(.*)"\s*$/gm)) {
      out[m[1]] = m[2];
    }
  }
  return out;
}

function reviewBlocks(body: string): string[] {
  return body.match(/<!-- review:[^:]+:begin -->[\s\S]*?<!-- review:[^:]+:end -->/g) ?? [];
}

const LABELS = new Set([
  "kind",
  "state",
  "load_bearing",
  "load-bearing",
  "assumption",
  "attempts",
  "spawned_by",
  "spawned-by",
  "answered_by",
  "answered-by",
  "receipts",
  "note",
  "ask",
]);

async function buildEntry(
  id: string,
  title: string,
  lines: string[],
  files: string[],
  bodies: DocBodies,
): Promise<LedgerEntry> {
  const labels = new Map<string, string>();
  const prose: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_-]+):\s*(.*)$/);
    if (m && LABELS.has(m[1].toLowerCase())) {
      const key = m[1].toLowerCase().replace(/-/g, "_");
      // First wins for a repeated label; append nothing (kept simple + tolerant).
      if (!labels.has(key)) labels.set(key, m[2].trim());
      else labels.set(key, `${labels.get(key)} ${m[2].trim()}`.trim());
    } else {
      // Blank lines included: they are the paragraph breaks the markdown
      // renderer needs, or adjacent note paragraphs fuse into one.
      prose.push(line);
    }
  }

  const wholeText = lines.join("\n");
  const kind = /known/i.test(labels.get("kind") ?? "") ? "known" : detectKind(labels, title);
  const state = detectState(labels.get("state") ?? wholeText, kind);
  // The prose fallback is only for entries with NO explicit label; an explicit
  // `load_bearing: false` must win over the words appearing in a note.
  const loadBearingLabel = labels.get("load_bearing");
  const loadBearing =
    loadBearingLabel != null ? truthy(loadBearingLabel) : /load.?bearing/i.test(prose.join("\n"));
  const assumptionLine = labels.get("assumption");
  const assumption =
    assumptionLine != null
      ? truthy(assumptionLine)
      : loadBearing && state !== "verified" && state !== "answered";
  const attempts = parseAttempts(labels.get("attempts"));
  const lineage = buildLineage(labels);
  const ask = labels.get("ask") || null;

  // Receipts can sit on the `receipts:` line or inline in the prose; extract
  // from the whole entry so none are missed, then de-dupe by target+label. A
  // receipted quote's web origin lives in the cited doc; link it out.
  const receipts = await withWebSources(dedupe(extractReceipts(wholeText, files)), wholeText, bodies);

  // Note lines + unlabeled prose render as the entry body. Blank prose lines
  // stay in (paragraph breaks); only the absent note label is dropped.
  const noteBits = [labels.get("note"), ...prose].filter((s): s is string => s != null);
  const blocks = noteBits.some((s) => s.trim())
    ? await parseMarkdownBody(noteBits.join("\n"))
    : [];

  return { id, title: title || id, kind, state, loadBearing, assumption, attempts, lineage, ask, receipts, blocks };
}

function detectKind(labels: Map<string, string>, title: string): "unknown" | "known" {
  // A known-grade state word implies a known even without a `kind:` line.
  const s = (labels.get("state") ?? "").toLowerCase();
  if (/verified|partial|unverified|accepted/.test(s)) return "known";
  // A question mark reads as an unknown; otherwise default to unknown (the loop's
  // default entry, a thing still being attempted).
  void title;
  return "unknown";
}

function detectState(text: string, kind: "unknown" | "known"): LedgerState {
  const t = text.toLowerCase();
  if (/research-exhausted|\bexhausted\b/.test(t)) return "research-exhausted";
  if (/\bresearching\b/.test(t)) return "researching";
  if (/\banswered\b/.test(t)) return "answered";
  if (/\bretired\b/.test(t)) return "retired";
  if (/\bunverified\b/.test(t)) return "unverified";
  if (/\bpartial\b/.test(t)) return "partial";
  if (/\baccepted\b/.test(t)) return "accepted";
  if (/\bverified\b/.test(t)) return "verified";
  if (/\bopen\b/.test(t)) return "open";
  return kind === "known" ? "unverified" : "open";
}

function truthy(v: string | undefined): boolean {
  return v != null && /^(true|yes|y|1)\b/i.test(v.trim());
}

function parseAttempts(v: string | undefined): number {
  if (!v) return 0;
  const m = v.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function buildLineage(labels: Map<string, string>): string | null {
  const parts: string[] = [];
  const sb = labels.get("spawned_by");
  const ab = labels.get("answered_by");
  if (sb) parts.push(`Spawned by ${sb}`);
  if (ab) parts.push(`Answered by ${ab}`);
  return parts.length ? parts.join(" · ") : null;
}

function dedupe<T extends { target: string; label: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const key = `${it.target}\x00${it.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
