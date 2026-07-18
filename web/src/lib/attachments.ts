import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Copy a user-supplied folder into a project's vault `_assets/<name>/`, verbatim,
 * and render the inbox note that points research at it. The same spirit as the
 * text "Add input": material the user hands over, transcribed into the vault,
 * then sorted into the ledger by research. Used by both the Add-input route (an
 * existing project) and the New-project route (a brand-new one).
 *
 * Path safety is mandatory: every entry is normalized and refused if it would
 * escape `_assets/<name>/` (parent segments, absolute paths). `.git` and
 * `node_modules` are always skipped, along with any `.DS_Store`. Caps (25 MB
 * total, 500 files, 10 MB per file) are checked BEFORE any file is written, so a
 * rejected attachment leaves the filesystem untouched.
 */

export interface AttachmentFile {
  /** The file's path relative to the picked folder (its webkitRelativePath). */
  relPath: string;
  bytes: Buffer | Uint8Array;
}

export interface SaveAttachmentResult {
  /** Project-relative asset dir, e.g. `_assets/starter-app`. */
  assetDir: string;
  /** Written paths, relative to assetDir, sorted. */
  manifest: string[];
  /** Entries dropped as ignored or unsafe (their original relPaths). */
  skipped: string[];
  totalBytes: number;
}

export interface SaveAttachmentOpts {
  /** Folder name to fall back to when the files share no common top dir. */
  label?: string;
}

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_COUNT = 500;

/** Path segments dropped anywhere in a relPath (heavy, never wanted verbatim). */
const ALWAYS_SKIP_DIRS = new Set([".git", "node_modules"]);
/** Basenames dropped anywhere. */
const SKIP_BASENAMES = new Set([".DS_Store"]);

/** Forward-slash, no leading slashes, collapsed. */
function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

/**
 * The single directory every file sits under (the webkitRelativePath first
 * segment), or null when they do not all share one (or any sits at the root).
 */
function commonTopDir(rels: string[]): string | null {
  let top: string | null = null;
  for (const r of rels) {
    const segs = normalizeRel(r).split("/").filter(Boolean);
    if (segs.length < 2) return null;
    if (top === null) top = segs[0];
    else if (top !== segs[0]) return null;
  }
  return top;
}

/** Filesystem-safe folder name: no separators, no leading dots, length-capped. */
function sanitizeName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? raw;
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f<>:"|?*]/g, "")
    .replace(/^\.+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/[ .]+$/, "");
  return cleaned || "attachment";
}

/**
 * Copy `files` into `<projectDir>/_assets/<name>/`, verbatim. Derives `<name>`
 * from the files' common top directory, else `opts.label`, else "attachment".
 * When a common top dir is used, it is stripped from each destination path so
 * the folder's contents land directly under `_assets/<name>/` (not doubled).
 * Throws a plain Error when a cap is exceeded; nothing is written in that case.
 */
export async function saveAttachment(
  projectDir: string,
  files: AttachmentFile[],
  opts: SaveAttachmentOpts,
): Promise<SaveAttachmentResult> {
  const top = commonTopDir(files.map((f) => f.relPath));
  const name = sanitizeName(top ?? opts.label ?? "attachment");
  const assetDirRel = `_assets/${name}`;
  const targetRoot = path.resolve(projectDir, "_assets", name);

  const skipped: string[] = [];
  const kept: { inner: string; bytes: Buffer | Uint8Array }[] = [];

  for (const f of files) {
    // Reject absoluteness on the RAW path (posix or windows) before normalizing,
    // so a leading slash is refused, not silently turned into a relative path.
    const absolute = path.posix.isAbsolute(f.relPath) || path.win32.isAbsolute(f.relPath);
    const norm = normalizeRel(f.relPath);
    const segs = norm.split("/").filter(Boolean);
    const baseName = segs[segs.length - 1] ?? "";

    if (!norm || segs.length === 0) {
      skipped.push(f.relPath);
      continue;
    }
    if (SKIP_BASENAMES.has(baseName) || segs.some((s) => ALWAYS_SKIP_DIRS.has(s))) {
      skipped.push(f.relPath);
      continue;
    }
    if (absolute || segs.includes("..")) {
      skipped.push(f.relPath);
      continue;
    }

    // Strip the shared top dir (it named the asset folder), then resolve and
    // confirm the destination stays inside the target.
    let inner = norm;
    if (top && norm.startsWith(top + "/")) inner = norm.slice(top.length + 1);
    if (!inner) {
      skipped.push(f.relPath);
      continue;
    }
    const dest = path.resolve(targetRoot, inner);
    if (dest !== targetRoot && !dest.startsWith(targetRoot + path.sep)) {
      skipped.push(f.relPath);
      continue;
    }
    kept.push({ inner, bytes: f.bytes });
  }

  // Caps, checked before a single byte is written.
  if (kept.length > MAX_FILE_COUNT) {
    throw new Error(
      `That folder has ${kept.length} files; the limit is ${MAX_FILE_COUNT}. Attach a smaller folder.`,
    );
  }
  let totalBytes = 0;
  for (const k of kept) {
    if (k.bytes.byteLength > MAX_FILE_BYTES) {
      throw new Error(
        `"${k.inner}" is larger than the ${MAX_FILE_BYTES / (1024 * 1024)} MB per-file limit. Attach a smaller folder.`,
      );
    }
    totalBytes += k.bytes.byteLength;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(
      `That folder is larger than the ${MAX_TOTAL_BYTES / (1024 * 1024)} MB limit. Attach a smaller folder.`,
    );
  }

  const manifest: string[] = [];
  for (const k of kept) {
    const dest = path.resolve(targetRoot, k.inner);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, k.bytes);
    manifest.push(k.inner);
  }
  manifest.sort((a, b) => a.localeCompare(b));

  return { assetDir: assetDirRel, manifest, skipped, totalBytes };
}

export interface InboxNoteOpts {
  title?: string;
  text?: string;
  /** Project-relative asset dir, e.g. `_assets/starter-app`. */
  assetDir: string;
  manifest: string[];
  skipped: string[];
}

/** How many manifest lines to list before collapsing to an "and N more" note. */
const MANIFEST_CAP = 60;

/**
 * The inbox markdown for an attached folder: the fed-in frontmatter, the
 * optional title and text verbatim, then a short section naming the folder as a
 * wikilink and listing its files (capped). Plain language, sorts into the ledger
 * like any other fed-in input.
 */
export function attachmentInboxNote(opts: InboxNoteOpts): string {
  const { title, text, assetDir, manifest, skipped } = opts;
  const lines: string[] = [
    "---",
    "type: fed-in",
    `date: ${new Date().toISOString()}`,
    "source: canvas",
    "---",
    "",
  ];

  if (title && title.trim()) {
    lines.push(`# ${title.trim()}`, "");
  }
  if (text && text.trim()) {
    lines.push(text.trim(), "");
  }

  lines.push("## Attached folder", "");
  lines.push(`A folder was attached and copied into the project's assets at [[${assetDir}]].`, "");

  lines.push(`Files (${manifest.length}):`);
  const shown = manifest.slice(0, MANIFEST_CAP);
  for (const m of shown) lines.push(`- ${m}`);
  if (manifest.length > MANIFEST_CAP) {
    lines.push(`- and ${manifest.length - MANIFEST_CAP} more`);
  }

  if (skipped.length > 0) {
    lines.push(
      "",
      `Skipped ${skipped.length} item${skipped.length === 1 ? "" : "s"} (ignored or unsafe paths).`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
