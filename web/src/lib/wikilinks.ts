import { ROOT_DOCS, STAGES } from "./schema";

/**
 * Project-scoped receipt resolver. The ledger and What's Worth Building carry
 * receipts as Obsidian `[[wikilinks]]`, but parse-markdown.ts strips wikilink
 * syntax to plain text before rendering, so receipts must always be extracted
 * from the RAW markdown body, here, before it reaches the reader.
 *
 * This module is pure (no fs): callers pass the project's file list (from
 * vault.listProjectFiles) and this resolves a raw target against it, the same
 * exact-path → basename idea getGraph uses, then classifies whether the target
 * maps to a doc the canvas can focus in place.
 */

export interface Receipt {
  /** Display text (the `|alias`, else the target's last path segment). */
  label: string;
  /** Resolved project-relative path (no .md), or the raw target if unresolved. */
  target: string;
  kind: "doc" | "decision" | "other";
  /**
   * A canvas focus key when the target maps to a doc the canvas surfaces (a
   * ROOT_DOCS file, a stage output, a 02 Research/ doc, or a Decisions/ entry).
   * Absent → the reader falls back to the obsidian:// deep link.
   */
  docKey?: string;
}

/** Matches `[[target]]`, `[[target|label]]`, `[[target#anchor]]`, `![[embed]]` skipped. */
const WIKILINK = /(!)?\[\[([^\]]+)\]\]/g;

interface Parsed {
  raw: string;
  target: string;
  label: string;
  anchor: string | null;
}

/** Pull every `[[wikilink]]` out of a raw string (embeds `![[..]]` excluded). */
export function parseWikilinks(text: string): Parsed[] {
  const out: Parsed[] = [];
  WIKILINK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK.exec(text)) !== null) {
    if (m[1]) continue; // an embed, not a receipt
    const body = m[2];
    const [targetAndAnchor, alias] = body.split("|");
    const [target, anchor] = targetAndAnchor.split("#");
    const t = target.trim();
    if (!t) continue;
    out.push({
      raw: m[0],
      target: t,
      label: (alias ?? t.split("/").pop() ?? t).trim(),
      anchor: anchor ? anchor.trim() : null,
    });
  }
  return out;
}

/** Filenames each stage output maps to → the stage focus key. */
const STAGE_FILE_TO_KEY = new Map<string, string>();
for (const s of STAGES) {
  for (const o of s.outputs) {
    if (o.endsWith("/")) continue; // a folder output (02 Research/) is handled below
    STAGE_FILE_TO_KEY.set(o.toLowerCase().replace(/\.md$/, ""), s.stage);
  }
}

/** Filenames each root doc maps to → its root-doc focus key. */
const ROOT_FILE_TO_KEY = new Map<string, string>();
for (const r of ROOT_DOCS) {
  for (const f of r.files) ROOT_FILE_TO_KEY.set(f.toLowerCase().replace(/\.md$/, ""), r.key);
}

/**
 * Classify a resolved (or raw) project-relative target into a receipt kind and,
 * when the canvas surfaces it, a focus key. Root docs win over stage outputs
 * (What's Worth Building is both a research output and a root doc, so the reader
 * lands on the root doc).
 */
function classify(rel: string): { kind: Receipt["kind"]; docKey?: string } {
  const noExt = rel.replace(/\.md$/i, "");
  const base = noExt.split("/").pop() ?? noExt;
  const baseL = base.toLowerCase();

  if (ROOT_FILE_TO_KEY.has(baseL)) return { kind: "doc", docKey: ROOT_FILE_TO_KEY.get(baseL) };
  if (/^(02 research\/|.*\/02 research\/)/i.test(noExt) || /^02 research\//i.test(noExt))
    return { kind: "doc", docKey: "research" };
  if (/(^|\/)decisions\//i.test(noExt)) return { kind: "decision", docKey: "decision-stream" };
  if (STAGE_FILE_TO_KEY.has(baseL)) return { kind: "doc", docKey: STAGE_FILE_TO_KEY.get(baseL) };
  return { kind: "other" };
}

/**
 * Resolve a raw wikilink target against the project's file list: exact relative
 * path first, then a unique basename match (the getGraph idea, project-scoped).
 * Returns the resolved project-relative path (with .md), or null when nothing
 * matches (an unresolved target still becomes an "other" receipt, so a dangling
 * link renders as plain text, never a crash).
 */
export function resolveTarget(rawTarget: string, files: string[]): string | null {
  const t = rawTarget.split("|")[0].split("#")[0].trim().replace(/\.md$/i, "");
  if (!t) return null;
  const tl = t.toLowerCase();

  // Index the file list once per call is cheap here (a project has tens of files).
  for (const f of files) if (f.toLowerCase().replace(/\.md$/i, "") === tl) return f;
  const suffix = "/" + tl;
  for (const f of files) if (f.toLowerCase().replace(/\.md$/i, "").endsWith(suffix)) return f;
  const base = tl.split("/").pop()!;
  const matches = files.filter((f) => (f.toLowerCase().replace(/\.md$/i, "").split("/").pop() ?? "") === base);
  if (matches.length) return matches[0];
  return null;
}

/**
 * Extract every receipt from a raw string (a whole body, or a single labeled
 * line). Each `[[wikilink]]` becomes a Receipt resolved + classified against the
 * project's files; a target that resolves to a surfaced doc carries a docKey for
 * in-canvas focus.
 */
export function extractReceipts(text: string, files: string[]): Receipt[] {
  return parseWikilinks(text).map((p) => {
    const rel = resolveTarget(p.target, files);
    const { kind, docKey } = classify(rel ?? p.target);
    return {
      label: p.label,
      target: (rel ?? p.target).replace(/\.md$/i, ""),
      kind,
      ...(docKey ? { docKey } : {}),
    };
  });
}
