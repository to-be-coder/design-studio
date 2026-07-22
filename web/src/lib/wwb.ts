import { parseMarkdownBody } from "./parse-markdown";
import { joinSoftWraps } from "./soft-wrap";
import { listProjectFiles, readProjectFile } from "./vault";
import { docBodyCache, withWebSources, type DocBodies } from "./web-sources";
import { extractReceipts } from "./wikilinks";
import type {
  LedgerModel,
  ParkedKind,
  Receipt,
  WwbDisposition,
  WwbEntry,
  WwbModel,
  WwbParked,
  WwbQuestion,
  WwbReason,
} from "./types";

const WWB_FILE = "What's Worth Building.md";

/**
 * The v2 tiers, keyed by the H2 keyword family they classify from. `buildV1` is
 * a plain `## Build` (no "now"/"ship"): it degrades by splitting its entries by
 * source, so a v1 file renders in the v2 UI unchanged.
 */
type Family =
  | "buildNow"
  | "buildV1"
  | "proposed"
  | "backlog"
  | "dontBuild"
  | "unruled"
  | "questions"
  | "parked"
  | "blocking"
  | null;

/**
 * Parse `What's Worth Building.md` v2, tolerant of v1. The tiers are classified
 * by keyword family (don't-build before build; "build now"/"ship" before a bare
 * "build"); questions fall back to the ledger's escalated entries when absent;
 * Build-now / Backlog entries are cross-checked against the ledger for an
 * evidence-moved flag. A plain v1 `## Build` splits by source (proposed-by-AI →
 * Proposed, decided → Build now) so it renders unchanged.
 */
export async function getWwb(slug: string, ledger?: LedgerModel | null): Promise<WwbModel | null> {
  const file = await readProjectFile(slug, WWB_FILE);
  if (!file) return null;
  const files = await listProjectFiles(slug);

  const model: WwbModel = {
    buildNow: [],
    proposed: [],
    backlog: [],
    dontBuild: [],
    unruled: [],
    blocking: [],
    questions: [],
    parked: [],
  };

  // One doc-body cache per request: web-source resolution reads the cited docs.
  const bodies = docBodyCache(slug);

  const sections = splitH2(file.body);
  for (const s of sections) {
    const fam = classifySection(s.title);
    if (fam === "blocking") {
      const raw = s.lines.join("\n");
      model.blocking.push(...(await withWebSources(extractReceipts(raw, files), raw, bodies)));
    } else if (fam === "questions") {
      model.questions.push(...(await parseQuestions(s.lines, files, bodies)));
    } else if (fam === "parked") {
      model.parked.push(...(await parseParked(s.lines, files, bodies)));
    } else if (fam === "buildV1") {
      // v1 degrade: a plain `## Build` splits by source.
      for (const e of await parseEntries(s.lines, files, "buildNow", bodies)) {
        if (e.source === "proposed") model.proposed.push({ ...e, disposition: null });
        else model.buildNow.push(e);
      }
    } else if (fam === "buildNow") {
      model.buildNow.push(...(await parseEntries(s.lines, files, "buildNow", bodies)));
    } else if (fam === "proposed") {
      model.proposed.push(...(await parseEntries(s.lines, files, "proposed", bodies)));
    } else if (fam === "backlog") {
      model.backlog.push(...(await parseEntries(s.lines, files, "backlog", bodies)));
    } else if (fam === "dontBuild") {
      model.dontBuild.push(...(await parseEntries(s.lines, files, "dontBuild", bodies)));
    } else if (fam === "unruled") {
      model.unruled.push(...(await parseEntries(s.lines, files, "unruled", bodies)));
    }
  }

  // Old renders can contain exhausted entries whose own ask says the question
  // is closed or does not need an answer. They are evidence history, not work
  // for the reviewer, so keep them out of the action queue. The research
  // contract now requires these entries to be answered or retired upstream;
  // this compatibility fence prevents stale renders from creating fake work.
  model.questions = model.questions.filter((q) => !explicitlyNeedsNoAnswer(q.ask));

  // Evidence-moved cross-check: a confirmed entry whose cited L-id retired or
  // dropped a grade wants re-ruling.
  if (ledger) {
    for (const e of [...model.buildNow, ...model.backlog]) e.evidenceMoved = evidenceMoved(e, ledger);
    // A ruling already in the ledger's Review log marks its parked card as
    // recorded until research re-scopes this file (survives a page refresh).
    for (const p of model.parked) p.recorded = ledger.recordedRulings[p.id] ?? null;
    // A clicked candidate stays out of Build candidates across a refresh: its
    // verdict is queued in the Review log even before the recorder lands.
    for (const e of [...model.proposed, ...model.dontBuild])
      e.recordedVerdict = ledger.recordedVerdicts[e.id] ?? null;
  }

  // Questions fall back to the ledger's escalated entries when the WWB has none.
  if (model.questions.length === 0 && ledger) {
    model.questions = ledger.escalated
      .filter((e) => !explicitlyNeedsNoAnswer(e.ask ?? ""))
      .map((e) => ({
        id: e.id,
        ask: e.ask ?? e.title,
        why: e.why,
        changes: e.changes,
        evidenceSummary: e.evidenceSummary,
        options: e.options,
        receipts: e.receipts,
        blocks: e.blocks,
        answered: null,
      }));
  }

  // An answer already in the ledger's Review log marks its question answered
  // until research folds it in (survives a page refresh, same as rulings).
  if (ledger) {
    for (const q of model.questions) q.answered = ledger.recordedAnswers[q.id] ?? null;
  }

  const round = numFrom(file.data.round);
  if (round != null) model.round = round;
  const updated = str(file.data.updated) ?? str(file.data.date);
  if (updated) model.updated = updated;
  model.entriesHash = entriesHash(model);

  return model;
}

/**
 * reviewCount(model) = the items awaiting you: proposed candidates, research's
 * dont-build-lean proposals (still AI recommendations, so they need a verdict
 * too), unanswered questions, and unruled parked calls.
 */
export function reviewCount(model: WwbModel): number {
  const cutsAwaiting = model.dontBuild.filter(
    (e) => e.source === "proposed" && !e.recordedVerdict,
  ).length;
  const unruledParked = model.parked.filter((p) => !p.recorded).length;
  const unanswered = model.questions.filter((q) => !q.answered).length;
  const proposedAwaiting = model.proposed.filter((e) => !e.recordedVerdict).length;
  return proposedAwaiting + cutsAwaiting + unanswered + unruledParked;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === "string" ? (v.trim() || null) : String(v);
}

function numFrom(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

/** Legacy safety net for questions that explicitly withdraw their own ask. */
function explicitlyNeedsNoAnswer(ask: string): boolean {
  const text = ask.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    /\b(?:do not|don't) (?:have to|need to) answer\b/.test(text) ||
    /\bno (?:answer|decision|response) (?:is )?(?:needed|required)\b/.test(text) ||
    /\bclosed for now rather than waiting on you\b/.test(text) ||
    /\bnot waiting on you\b/.test(text) ||
    /\bfor completeness rather than for a decision\b/.test(text)
  );
}

interface Section {
  title: string;
  lines: string[];
}

/** Split a raw markdown body at each `## heading` (keeping the raw wikilinks). */
function splitH2(body: string): Section[] {
  const out: Section[] = [];
  let cur: Section | null = null;
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(?!#)(.+)$/);
    if (h) {
      cur = { title: h[1].trim(), lines: [] };
      out.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return out;
}

/**
 * Map an H2 title to a tier family. The order is law: don't-build before
 * backlog before proposed before "build now"/"ship" before a bare "build";
 * questions, parked, unruled, then the blocking band.
 */
function classifySection(title: string): Family {
  const t = title.toLowerCase();
  if (/don'?t build|do not build|won'?t build/.test(t)) return "dontBuild";
  if (/backlog|deferred|not now/.test(t)) return "backlog";
  if (/proposed|awaiting|for review/.test(t)) return "proposed";
  if (/build now|ship/.test(t)) return "buildNow";
  if (/\bbuild\b/.test(t)) return "buildV1";
  if (/questions? for you|agenda/.test(t)) return "questions";
  if (/parked|ruling|🔴/.test(t)) return "parked";
  if (/implied|unruled/.test(t)) return "unruled";
  if (/open unknown|blocking|blocks? a verdict/.test(t)) return "blocking";
  return null;
}

const SOURCE_RE = /decided[-\s]?by[-\s]?human|proposed[-\s]?by[-\s]?ai/i;

function sourceOf(line: string): WwbEntry["source"] {
  const m = line.match(SOURCE_RE);
  if (!m) return null;
  return /human/i.test(m[0]) ? "decided" : "proposed";
}

const FAMILY_DISPOSITION: Record<string, WwbDisposition | null> = {
  buildNow: "build-now",
  backlog: "backlog",
  dontBuild: "dont-build",
  proposed: null,
  unruled: null,
};
const FAMILY_SOURCE: Record<string, WwbEntry["source"]> = {
  buildNow: "decided",
  backlog: "decided",
  proposed: "proposed",
  dontBuild: null,
  unruled: null,
};

/** Labels an entry carries under its H3 (all optional, order-free). */
const ENTRY_LABELS = new Set([
  "disposition",
  "unblocks",
  "in_their_words",
  "in-their-words",
  "ruled_by",
  "ruled-by",
  "source",
  "what",
  "for",
  "against",
]);

/** `### W1: title`, `### L3: ask`: pull a leading W/L id off a heading. */
function parseHeadingId(heading: string): { id: string | null; title: string } {
  // A leading \ud83d\udd34 is the vault's red-moment marker, board grammar rather than
  // display copy, so it never reaches a card title. Stripping it leaves the
  // slug-derived fallback id unchanged: the emoji never contributed a
  // character to the slug.
  const h = heading.replace(/^[\s\ud83d\udd34]+/u, "");
  const m = h.match(/^\s*([WL]\d+)\b[\s:.)\u2014\u2013-]*(.*)$/i);
  if (m) return { id: m[1].toUpperCase(), title: m[2].trim() };
  return { id: null, title: h.trim() };
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "x"
  );
}

interface H3Group {
  heading: string;
  lines: string[];
}

/** Group a section's lines by `### ` heading. Lines before the first are dropped. */
function groupByH3(lines: string[]): H3Group[] {
  const groups: H3Group[] = [];
  let cur: H3Group | null = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(.+)$/);
    if (h) {
      cur = { heading: h[1].trim(), lines: [] };
      groups.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return groups;
}

/** Read a labeled line (`key: value`) when the key is one we know. */
function labeledLine(line: string, allowed: Set<string>): { key: string; value: string } | null {
  const m = line.match(/^\s*([A-Za-z_-]+):\s*(.*)$/);
  if (!m) return null;
  const key = m[1].toLowerCase();
  if (!allowed.has(key)) return null;
  return { key: key.replace(/-/g, "_"), value: m[2].trim() };
}

function unquote(s: string): string {
  return s.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

/**
 * Parse a tier's entries. H3 entries carry a title (with an optional W-id), a
 * set of labeled lines (disposition / unblocks / in_their_words / ruled_by /
 * source), `-` reason bullets, and an optional trailing blockquote whose text
 * becomes the human's words when no `in_their_words:` line is present. A section
 * with no H3 falls back to top-level `-` bullets as minimal entries.
 */
async function parseEntries(
  rawLines: string[],
  files: string[],
  family: string,
  bodies: DocBodies,
): Promise<WwbEntry[]> {
  const defDisposition = FAMILY_DISPOSITION[family] ?? null;
  const defSource = FAMILY_SOURCE[family] ?? null;

  // Hard-wrapped files: glue soft-wrapped continuation lines back onto their
  // bullet / prose / label line before reading line by line, or each fragment
  // of a wrapped sentence would parse as its own reason.
  const lines = joinSoftWraps(rawLines, (l) => SOURCE_RE.test(l));

  const hasH3 = lines.some((l) => /^###\s+/.test(l));
  if (!hasH3) {
    // Top-level bullets: one entry each, minimal fields.
    const out: WwbEntry[] = [];
    for (const line of lines) {
      const li = line.match(/^\s*[-*]\s+(.*)$/);
      if (!li || !li[1].trim()) continue;
      const src = sourceOf(li[1]);
      const title =
        stripWiki(li[1].replace(SOURCE_RE, "").replace(/[\u2014\u2013(].*$/, "")).trim() ||
        stripWiki(li[1]).trim();
      out.push(blankEntry(`${family}-${slug(title)}`, title, defDisposition, src ?? defSource));
    }
    return out;
  }

  return Promise.all(groupByH3(lines).map(async (g) => {
    const { id: hid, title } = parseHeadingId(g.heading.replace(SOURCE_RE, "").trim());
    const headingTitle = stripWiki(title.replace(/[\u2014\u2013-]\s*$/, "")).trim();
    const id = hid ?? `${family}-${slug(headingTitle)}`;
    let source: WwbEntry["source"] = sourceOf(g.heading) ?? defSource;
    let disposition = defDisposition;
    let unblocks: string | null = null;
    let inTheirWords: string | null = null;
    let ruledBy: string | null = null;
    let what: string | null = null;
    let forLine: string | null = null;
    let againstLine: string | null = null;
    const reasons: WwbReason[] = [];
    const quoteLines: string[] = [];

    for (const line of g.lines) {
      if (!line.trim()) continue;
      const lab = labeledLine(line, ENTRY_LABELS);
      if (lab) {
        if (lab.key === "disposition") disposition = normalizeDisposition(lab.value) ?? disposition;
        else if (lab.key === "unblocks") unblocks = lab.value || null;
        else if (lab.key === "in_their_words") inTheirWords = unquote(lab.value) || null;
        else if (lab.key === "ruled_by") ruledBy = lab.value || null;
        else if (lab.key === "source") source = sourceOf(lab.value) ?? source;
        else if (lab.key === "what") what = lab.value || null;
        else if (lab.key === "for") forLine = lab.value || null;
        else if (lab.key === "against") againstLine = lab.value || null;
        continue;
      }
      const bq = line.match(/^\s*>\s?(.*)$/);
      if (bq) {
        if (bq[1].trim()) quoteLines.push(bq[1].trim());
        continue;
      }
      // A lone source token line.
      if (SOURCE_RE.test(line) && !/^\s*[-*]\s+/.test(line)) {
        source = sourceOf(line) ?? source;
        continue;
      }
      const li = line.match(/^\s*[-*]\s+(.*)$/);
      if (li) {
        if (li[1].trim()) reasons.push(makeReason(li[1], files));
        continue;
      }
      // Non-bullet prose reads as a reason.
      reasons.push(makeReason(line.trim(), files));
    }

    if (!inTheirWords && quoteLines.length) inTheirWords = quoteLines.join(" ");

    // A receipted quote's web origin lives in the cited doc; link it out.
    for (const r of reasons) {
      r.receipts = await withWebSources(r.receipts, r.text, bodies);
    }

    return {
      id,
      title: headingTitle,
      reasons,
      source,
      disposition,
      unblocks,
      inTheirWords,
      ruledBy,
      what,
      forLine,
      againstLine,
      recordedVerdict: null,
      evidenceMoved: false,
    };
  }));
}

function blankEntry(
  id: string,
  title: string,
  disposition: WwbDisposition | null,
  source: WwbEntry["source"],
): WwbEntry {
  return { id, title, reasons: [], source, disposition, unblocks: null, inTheirWords: null, ruledBy: null, what: null, forLine: null, againstLine: null, recordedVerdict: null, evidenceMoved: false };
}

function normalizeDisposition(v: string): WwbDisposition | null {
  const t = v.toLowerCase();
  if (/don'?t|dont|won'?t/.test(t)) return "dont-build";
  if (/backlog|defer/.test(t)) return "backlog";
  if (/build/.test(t)) return "build-now";
  return null;
}

const QUESTION_LABELS = new Set([
  "ask",
  "why",
  "changes",
  "evidence",
  "receipts",
  "blocks",
  "kind",
  "options",
]);

/** Parse Questions for you: the judgment brief, receipts, and note blocks. */
async function parseQuestions(
  rawLines: string[],
  files: string[],
  bodies: DocBodies,
): Promise<WwbQuestion[]> {
  const groups = groupByH3(joinSoftWraps(rawLines));
  return Promise.all(
    groups.map(async (g): Promise<WwbQuestion> => {
      const { id: hid, title } = parseHeadingId(g.heading);
      const id = hid ?? `q-${slug(title)}`;
      let ask: string | null = null;
      let why: string | null = null;
      let changes: string | null = null;
      let evidenceSummary: string | null = null;
      const options: { label: string; text: string }[] = [];
      let inOptions = false;
      const prose: string[] = [];
      for (const line of g.lines) {
        if (inOptions) {
          const option = line.match(/^\s*-\s*([A-Za-z0-9]{1,3}):\s*(.+)$/);
          if (option) {
            options.push({ label: option[1], text: option[2].trim() });
            continue;
          }
          inOptions = false;
        }
        // Keep blank lines: they are the paragraph breaks the markdown
        // renderer needs, or adjacent paragraphs fuse into one.
        if (!line.trim()) {
          prose.push(line);
          continue;
        }
        const lab = labeledLine(line, QUESTION_LABELS);
        if (lab) {
          if (lab.key === "options") {
            inOptions = true;
          } else if (lab.key === "ask") ask = lab.value || null;
          else if (lab.key === "why") why = lab.value || null;
          else if (lab.key === "changes") changes = lab.value || null;
          else if (lab.key === "evidence") evidenceSummary = lab.value || null;
          continue;
        }
        if (/^\s*>\s?/.test(line)) continue;
        prose.push(line);
      }
      const raw = g.lines.join("\n");
      const receipts = await withWebSources(
        dedupeReceipts(extractReceipts(raw, files)),
        raw,
        bodies,
      );
      const blocks = prose.some((s) => s.trim()) ? await parseMarkdownBody(prose.join("\n")) : [];
      return {
        id,
        ask: ask ?? title,
        why,
        changes,
        evidenceSummary,
        options,
        receipts,
        blocks,
        answered: null,
      };
    }),
  );
}

const PARKED_LABELS = new Set([
  "kind",
  "supersedes",
  "supersedes_if_taken",
  "blocks",
  "receipts",
  "ask",
  "why",
  "changes",
  "evidence",
  "options",
]);

/** Parse the `## Parked decisions` tier: the verbatim candidate + both-sides body. */
async function parseParked(
  rawLines: string[],
  files: string[],
  bodies: DocBodies,
): Promise<WwbParked[]> {
  const groups = groupByH3(joinSoftWraps(rawLines));
  return Promise.all(
    groups.map(async (g): Promise<WwbParked> => {
      const { id: hid, title } = parseHeadingId(g.heading);
      const id = hid ?? `parked-${slug(title)}`;
      let kind: ParkedKind = "other";
      let supersedes: string | null = null;
      let blocks: string | null = null;
      let ask: string | null = null;
      let why: string | null = null;
      let changes: string | null = null;
      let evidenceSummary: string | null = null;
      const comparison = parkedFramingComparison(g.lines);
      const options: { label: string; text: string }[] = [];
      let inOptions = false;
      const quoteLines: string[] = [];
      const body: string[] = [];
      for (const line of g.lines) {
        if (inOptions) {
          const opt = line.match(/^\s*-\s*([A-Za-z0-9]{1,3}):\s*(.+)$/);
          if (opt) {
            options.push({ label: opt[1], text: opt[2].trim() });
            continue;
          }
          inOptions = false;
        }
        const lab = labeledLine(line, PARKED_LABELS);
        if (lab) {
          if (lab.key === "options") {
            inOptions = true;
            continue;
          }
          if (lab.key === "kind") kind = normalizeParkedKind(lab.value);
          else if (lab.key === "supersedes" || lab.key === "supersedes_if_taken")
            supersedes = stripWiki(unquote(lab.value)) || null;
          else if (lab.key === "blocks") blocks = lab.value || null;
          else if (lab.key === "ask") ask = unquote(lab.value) || null;
          else if (lab.key === "why") why = lab.value || null;
          else if (lab.key === "changes") changes = lab.value || null;
          else if (lab.key === "evidence") evidenceSummary = lab.value || null;
          continue;
        }
        const bq = line.match(/^\s*>\s?(.*)$/);
        if (bq) {
          if (bq[1].trim()) quoteLines.push(bq[1].trim());
          continue;
        }
        // Blank lines included: they separate the body's paragraphs.
        body.push(line);
      }
      const raw = g.lines.join("\n");
      const receipts = await withWebSources(
        dedupeReceipts(extractReceipts(raw, files)),
        raw,
        bodies,
      );
      const bodyBlocks = body.some((s) => s.trim()) ? await parseMarkdownBody(body.join("\n")) : [];
      return {
        id,
        kind,
        title,
        ask,
        why,
        changes,
        evidenceSummary,
        currentFraming: comparison.current,
        proposedFraming: comparison.proposed,
        acceptCost: comparison.acceptCost,
        rejectCost: comparison.rejectCost,
        options,
        candidate: quoteLines.join(" "),
        supersedes,
        blocks,
        receipts,
        bodyBlocks,
        recorded: null,
      };
    }),
  );
}

function parkedFramingComparison(lines: string[]): {
  current: string | null;
  proposed: string | null;
  acceptCost: string | null;
  rejectCost: string | null;
} {
  const result = {
    current: null as string | null,
    proposed: null as string | null,
    acceptCost: null as string | null,
    rejectCost: null as string | null,
  };

  const paragraphAfter = (index: number, quoteOnly = false): string | null => {
    const parts: string[] = [];
    for (let i = index + 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        if (parts.length) break;
        continue;
      }
      const quote = line.match(/^>\s?(.*)$/);
      if (quoteOnly) {
        if (!quote) break;
        parts.push(quote[1].trim());
        continue;
      }
      if (/^\*\*/.test(line) || labeledLine(line, PARKED_LABELS)) break;
      parts.push(line.replace(/^>\s?/, ""));
    }
    return parts.length ? parts.join(" ").trim() : null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^\*\*The problem as it stands today\.\*\*$/i.test(line)) {
      result.current = paragraphAfter(i, true);
      continue;
    }

    const candidate = line.match(/^\*\*The candidate\.?\*\*\s*(.*)$/i);
    if (candidate) {
      result.proposed = candidate[1].trim() || paragraphAfter(i);
      continue;
    }

    const takeCost = line.match(/^\*\*What it costs you to take it\.\*\*\s*(.*)$/i);
    if (takeCost) {
      result.acceptCost = takeCost[1].trim() || paragraphAfter(i);
      continue;
    }

    const rejectCost = line.match(/^\*\*What it costs you to reject it\.\*\*\s*(.*)$/i);
    if (rejectCost) {
      result.rejectCost = rejectCost[1].trim() || paragraphAfter(i);
    }
  }

  return result;
}

function normalizeParkedKind(v: string): ParkedKind {
  const t = v.toLowerCase();
  if (/depart/.test(t)) return "framing-departure";
  if (/framing.*lock|lock.*framing|framing/.test(t)) return "framing-lock";
  if (/direction/.test(t)) return "directions-pick";
  if (/route/.test(t)) return "route-call";
  return "other";
}

/** A confirmed entry whose cited L-id retired or dropped a grade wants re-ruling. */
function evidenceMoved(entry: WwbEntry, ledger: LedgerModel): boolean {
  const ids = new Set<string>();
  for (const r of entry.reasons) {
    for (const rec of r.receipts) {
      const m = rec.label.match(/^L\d+$/i);
      if (m) ids.add(rec.label.toUpperCase());
    }
  }
  if (ids.size === 0) return false;
  for (const id of ids) {
    const led = ledger.entries.find((e) => e.id.toUpperCase() === id);
    if (!led) continue;
    if (led.state === "retired") return true;
    if (led.kind === "known" && (led.state === "unverified" || led.state === "partial")) return true;
  }
  return false;
}

function makeReason(body: string, files: string[]): WwbReason {
  const receipts: Receipt[] = extractReceipts(body, files);
  const assumption = /(^|\s)ASSUMPTION\b/i.test(body);
  const text = stripWiki(body)
    .replace(/^\s*\**\s*ASSUMPTION:?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { text, receipts, assumption };
}

function dedupeReceipts(items: Receipt[]): Receipt[] {
  const seen = new Set<string>();
  const out: Receipt[] = [];
  for (const it of items) {
    const key = `${it.target}\x00${it.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** Strip Obsidian wikilink syntax to nothing (receipts are shown as chips). */
function stripWiki(s: string): string {
  return s
    .replace(/!?\[\[[^\]]*\]\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** A cheap, stable hash of the entry set at render (the stale-review guard). */
function entriesHash(model: WwbModel): string {
  const parts: string[] = [];
  const push = (e: WwbEntry) => parts.push(`${e.id}:${e.disposition ?? ""}`);
  model.buildNow.forEach(push);
  model.proposed.forEach(push);
  model.backlog.forEach(push);
  model.dontBuild.forEach(push);
  model.questions.forEach((q) => parts.push(`Q${q.id}`));
  model.parked.forEach((p) => parts.push(`P${p.id}`));
  let h = 5381;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
