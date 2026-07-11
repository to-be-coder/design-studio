import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";
import { cache } from "react";
import { parseMarkdownBody } from "./parse-markdown";
import { normalizeStageName, stageDef } from "./schema";
import type {
  Decision,
  DecisionStatus,
  GraphGroup,
  GraphLink,
  GraphNode,
  Project,
  ProjectStatus,
  RenderableBlock,
  Route,
  Stage,
  StageState,
  VaultGraph,
} from "./types";

/**
 * Single source of truth for reading the design-studio vault (an Obsidian
 * markdown tree). Mirrors design-studio-shared/CONVENTIONS.md. Read-only —
 * this app never writes vault content (writes happen only via the run API,
 * which spawns a skill). Lifts careerbot web/'s markdown-store patterns:
 * gray-matter parse with skip-on-malformed-YAML, and React cache() so every
 * request is a fresh-but-deduped view of disk.
 */

const DESIGN_DIR = "Design Studio";
const DASHBOARD = "00 Dashboard.md";
const ACTIVE_POINTER = ".design-studio-active";

export class VaultNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultNotConfiguredError";
  }
}

let cachedRoot: string | null = null;

/** Resolve the vault root: DESIGN_STUDIO_VAULT env, else ~/.design-studio-vault. */
export async function getVaultRoot(): Promise<string> {
  if (cachedRoot) return cachedRoot;
  const env = process.env.DESIGN_STUDIO_VAULT;
  if (env && env.trim()) {
    cachedRoot = path.resolve(env.trim());
    return cachedRoot;
  }
  const pointer = path.join(os.homedir(), ".design-studio-vault");
  try {
    const raw = (await fs.readFile(pointer, "utf8")).trim();
    if (!raw) throw new Error("empty pointer");
    cachedRoot = path.resolve(raw.split("\n")[0].trim());
    return cachedRoot;
  } catch {
    throw new VaultNotConfiguredError(
      `No vault found. Set DESIGN_STUDIO_VAULT in .env.local, or write the vault's absolute path to ~/.design-studio-vault (the pointer every design-studio skill uses).`,
    );
  }
}

// ---- coercion helpers (from careerbot web/) --------------------------------

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.length === 0 ? null : v;
  return String(v);
}

function dateStr(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v;
  return null;
}

function strList(v: unknown): string[] {
  if (typeof v === "string") return v.trim() ? [v.trim()] : [];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Strip Obsidian wikilink brackets for display: "[[0019 foo]]" -> "0019 foo". */
function stripWiki(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  return s.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1").trim() || null;
}

async function mtimeOf(abs: string): Promise<string> {
  const st = await fs.stat(abs);
  return st.mtime.toISOString().slice(0, 10);
}

async function exists(abs: string): Promise<boolean> {
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

function firstH1(body: string): string | null {
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

const STATUS_SET = new Set<ProjectStatus>(["active", "blocked", "done", "archived"]);
const ROUTE_SET = new Set<Route>(["full", "lite"]);
const DECISION_STATUS_SET = new Set<DecisionStatus>([
  "proposed",
  "decided",
  "deferred",
  "superseded",
]);

// ---- projects --------------------------------------------------------------

async function readProject(slug: string): Promise<Project | null> {
  const root = await getVaultRoot();
  const abs = path.join(root, DESIGN_DIR, slug, DASHBOARD);
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
  let parsed: ReturnType<typeof matter>;
  try {
    // Explicit (even empty) options bypass gray-matter's own content-keyed
    // cache. That cache stores the `file` object BEFORE parsing completes,
    // so on a YAML error the half-built object is cached; matter(raw) with
    // no options would then silently return that broken object (no throw,
    // empty data) on every call after the first — the malformed file would
    // only ever be skipped once per server lifetime. See CONVENTIONS.md's
    // "skip malformed frontmatter" contract.
    parsed = matter(raw, {});
  } catch (err) {
    console.warn(`[vault] Skipping ${abs}: ${(err as Error).message}`);
    return null;
  }
  const d = parsed.data as Record<string, unknown>;
  if (str(d.type) !== "design-project") return null;
  const status = str(d.status);
  const stage = str(d.stage);
  const route = str(d.route);
  const mtime = await mtimeOf(abs);
  return {
    slug,
    name: firstH1(parsed.content) ?? humanize(slug),
    status: status && STATUS_SET.has(status as ProjectStatus) ? (status as ProjectStatus) : null,
    stage: (stage as Stage) ?? null,
    client: str(d.client),
    route: route && ROUTE_SET.has(route as Route) ? (route as Route) : null,
    started: dateStr(d.started),
    prototypeRepo: str(d.prototype_repo),
    mtime,
  };
}

function humanize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const listProjects = cache(async (): Promise<Project[]> => {
  const root = await getVaultRoot();
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(path.join(root, DESIGN_DIR), { withFileTypes: true });
  } catch {
    throw new VaultNotConfiguredError(
      `The vault at "${root}" has no "${DESIGN_DIR}/" folder. Run /design-studio-setup, or point DESIGN_STUDIO_VAULT at the right vault.`,
    );
  }
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const projects = (await Promise.all(slugs.map(readProject))).filter(
    (p): p is Project => p !== null,
  );
  // Freshest first.
  projects.sort((a, b) => (a.mtime < b.mtime ? 1 : a.mtime > b.mtime ? -1 : 0));
  return projects;
});

export const getActiveProject = cache(async (): Promise<string | null> => {
  const root = await getVaultRoot();
  try {
    const raw = (await fs.readFile(path.join(root, ACTIVE_POINTER), "utf8")).trim();
    return raw.split("\n")[0].trim() || null;
  } catch {
    return null;
  }
});

// ---- pipeline log ----------------------------------------------------------

/**
 * Parse a dashboard body's `## Pipeline log` block. The block is prose (one
 * bullet per stage, a bold status word, a date, and a parenthetical note), so
 * this is a light line parser, not a schema read.
 */
export function parsePipelineLog(body: string): StageState[] {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => /^##\s+Pipeline log\b/i.test(l));
  if (start === -1) return [];
  const out: StageState[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break; // next section
    const m = line.match(/^-\s+(.+)$/);
    if (!m) continue;
    const sep = m[1].indexOf(" — ");
    if (sep === -1) continue;
    const namePart = m[1]
      .slice(0, sep)
      .replace(/\*\(utility\)\*/gi, "")
      .replace(/\*/g, "")
      .trim();
    const rest = m[1].slice(sep + 3).trim();
    const stage = normalizeStageName(namePart);
    if (!stage) continue;

    const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;
    const noteMatches = [...rest.matchAll(/\(([^)]*)\)/g)];
    const note = noteMatches.length ? noteMatches[noteMatches.length - 1][1] : null;

    const cut = date
      ? rest.indexOf(date)
      : rest.indexOf("(") === -1
        ? rest.length
        : rest.indexOf("(");
    const rawState = rest
      .slice(0, cut)
      .replace(/\*/g, "")
      .trim()
      .replace(/[—-]\s*$/, "")
      .trim();

    out.push({ stage, rawState, state: categorize(rawState), date, note });
  }
  return out;
}

function categorize(phrase: string): StageState["state"] {
  const p = phrase.toLowerCase();
  if (p.includes("not run") || p.includes("skipped") || p.includes("not-run")) return "skipped";
  if (p.includes("pending")) return "pending";
  if (p.includes("ran") || p.includes("shipped") || p.includes("ingested")) return "ran";
  if (p.includes("derived") || p.includes("reconciled")) return "derived";
  return "unknown";
}

// ---- project detail --------------------------------------------------------

export interface ProjectDetail {
  project: Project;
  /** Rendered dashboard body. */
  dashboardBlocks: RenderableBlock[];
  pipeline: StageState[];
  decisions: Decision[];
  /** Stages whose output artifact(s) exist on disk. */
  outputsPresent: Stage[];
}

export const getProject = cache(async (slug: string): Promise<ProjectDetail | null> => {
  const root = await getVaultRoot();
  const dir = path.join(root, DESIGN_DIR, slug);
  const abs = path.join(dir, DASHBOARD);
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
  const project = await readProject(slug);
  if (!project) return null;
  const body = matter(raw).content;

  const [dashboardBlocks, decisions] = await Promise.all([
    parseMarkdownBody(body),
    listDecisions(slug),
  ]);

  const outputsPresent: Stage[] = [];
  await Promise.all(
    (["debrief", "research", "verify", "reframe", "scope", "directions", "converge",
      "design-system", "build", "validate", "spec"] as Stage[]).map(async (stage) => {
      const def = stageDef(stage);
      if (!def || def.outputs.length === 0) return;
      for (const rel of def.outputs) {
        if (await exists(path.join(dir, rel.replace(/\/$/, "")))) {
          outputsPresent.push(stage);
          return;
        }
      }
    }),
  );

  return {
    project,
    dashboardBlocks,
    pipeline: parsePipelineLog(body),
    decisions,
    outputsPresent,
  };
});

// ---- stage output ----------------------------------------------------------

export interface StageOutput {
  /** Display path relative to the project, e.g. "02 Research/Company.md". */
  file: string;
  blocks: RenderableBlock[];
}

/** Read + render the artifact(s) a stage produces (a folder expands to its .md files). */
export const getStageOutput = cache(async (slug: string, stage: Stage): Promise<StageOutput[]> => {
  const root = await getVaultRoot();
  const dir = path.join(root, DESIGN_DIR, slug);
  const def = stageDef(stage);
  if (!def) return [];
  const out: StageOutput[] = [];
  for (const rel of def.outputs) {
    const abs = path.join(dir, rel.replace(/\/$/, ""));
    if (rel.endsWith("/")) {
      let files: string[] = [];
      try {
        const entries = await fs.readdir(abs, { withFileTypes: true });
        files = entries
          .filter((e) => e.isFile() && e.name.endsWith(".md"))
          .map((e) => e.name)
          .sort();
      } catch {
        continue;
      }
      for (const name of files) {
        const raw = await fs.readFile(path.join(abs, name), "utf8");
        let content: string;
        try {
          // {} bypasses gray-matter's cache — see the comment in readProject().
          content = matter(raw, {}).content;
        } catch (err) {
          console.warn(`[vault] Skipping ${rel}${name}: ${(err as Error).message}`);
          continue;
        }
        out.push({ file: `${rel}${name}`, blocks: await parseMarkdownBody(content) });
      }
    } else {
      let raw: string;
      try {
        raw = await fs.readFile(abs, "utf8");
      } catch {
        continue;
      }
      let content: string;
      try {
        content = matter(raw, {}).content;
      } catch (err) {
        console.warn(`[vault] Skipping ${rel}: ${(err as Error).message}`);
        continue;
      }
      out.push({ file: rel, blocks: await parseMarkdownBody(content) });
    }
  }
  return out;
});

/** Absolute path to a project's folder. Internal to the vault layer. */
export async function projectDir(slug: string): Promise<string> {
  const root = await getVaultRoot();
  return path.join(root, DESIGN_DIR, slug);
}

/**
 * Read a project-relative file and return its frontmatter-stripped body plus
 * parsed frontmatter data. Skip-on-malformed (returns null), never crash —
 * same gray-matter explicit-options contract as everything else here.
 */
export async function readProjectFile(
  slug: string,
  rel: string,
): Promise<{ data: Record<string, unknown>; body: string } | null> {
  const abs = path.join(await projectDir(slug), rel);
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
  try {
    // {} bypasses gray-matter's cache — see the comment in readProject().
    const parsed = matter(raw, {});
    return { data: parsed.data as Record<string, unknown>, body: parsed.content };
  } catch (err) {
    console.warn(`[vault] Skipping ${rel}: ${(err as Error).message}`);
    return null;
  }
}

/** Does a project-relative path exist on disk? */
export async function projectFileExists(slug: string, rel: string): Promise<boolean> {
  return exists(path.join(await projectDir(slug), rel));
}

// ---- decisions -------------------------------------------------------------

export const listDecisions = cache(async (slug: string): Promise<Decision[]> => {
  const root = await getVaultRoot();
  const dir = path.join(root, DESIGN_DIR, slug, "Decisions");
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "CLAUDE.md")
    .map((e) => e.name);

  const decisions = await Promise.all(
    files.map(async (name): Promise<Decision | null> => {
      const raw = await fs.readFile(path.join(dir, name), "utf8");
      let parsed: ReturnType<typeof matter>;
      try {
        // See the matching comment in readProject(): options must be passed
        // (even {}) to bypass gray-matter's cache, or a malformed file is
        // only ever skipped on its first read this server process.
        parsed = matter(raw, {});
      } catch (err) {
        console.warn(`[vault] Skipping decision ${name}: ${(err as Error).message}`);
        return null;
      }
      const d = parsed.data as Record<string, unknown>;
      const file = name.replace(/\.md$/, "");
      const status = str(d.status);
      const authored = str(d.authored_by);
      const h1 = firstH1(parsed.content);
      return {
        id: d.id != null ? String(d.id) : file.split(" ")[0],
        stage: str(d.stage),
        status:
          status && DECISION_STATUS_SET.has(status as DecisionStatus)
            ? (status as DecisionStatus)
            : null,
        authoredBy: authored === "user" || authored === "skill" ? authored : null,
        date: dateStr(d.date),
        restsOn: stripWiki(d.rests_on),
        supersedes: stripWiki(d.supersedes),
        supersededBy: stripWiki(d.superseded_by),
        tags: strList(d.tags),
        title: (h1 ?? file).replace(/^\d+\s*—\s*/, "").trim(),
        file,
        body: parsed.content,
      };
    }),
  );

  return decisions
    .filter((x): x is Decision => x !== null)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
});

// ---- knowledge graph (Obsidian-style link graph over the vault) -------------

const GRAPH_ROOTS = ["Design Studio", "Studio Wiki", "Learning"];
const GRAPH_SKIP_DIRS = new Set(["_assets", "raw", ".obsidian", ".git", "node_modules", ".trash"]);

async function collectGraphFiles(dir: string, relBase: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const rel = `${relBase}/${e.name}`;
    if (e.isDirectory()) {
      if (GRAPH_SKIP_DIRS.has(e.name)) continue;
      await collectGraphFiles(path.join(dir, e.name), rel, out);
    } else if (e.isFile() && e.name.endsWith(".md") && e.name !== "CLAUDE.md") {
      out.push(rel.replace(/\.md$/, ""));
    }
  }
}

function graphGroupFor(rel: string, type: string | null): { group: GraphGroup; url: string | null } {
  const parts = rel.split("/");
  if (rel.startsWith("Design Studio/")) {
    const slug = parts[1];
    if (/\/00 Dashboard$/.test(rel) && type === "design-project") {
      return { group: "project", url: `/project/${slug}` };
    }
    if (parts.includes("Decisions")) {
      return { group: "decision", url: `/project/${slug}?tab=decisions` };
    }
    return { group: "note", url: null };
  }
  if (rel.startsWith("Studio Wiki/")) return { group: "wiki", url: null };
  if (rel.startsWith("Learning/")) return { group: "learning", url: null };
  return { group: "note", url: null };
}

export const getGraph = cache(async (): Promise<VaultGraph> => {
  const root = await getVaultRoot();
  const rels: string[] = [];
  for (const r of GRAPH_ROOTS) await collectGraphFiles(path.join(root, r), r, rels);
  if (await exists(path.join(root, "Home.md"))) rels.push("Home");

  interface Raw {
    rel: string;
    raw: string;
    label: string;
    group: GraphGroup;
    url: string | null;
  }
  const raws: Raw[] = [];
  await Promise.all(
    rels.map(async (rel) => {
      let raw: string;
      try {
        raw = await fs.readFile(path.join(root, rel + ".md"), "utf8");
      } catch {
        return;
      }
      let type: string | null = null;
      let body = raw;
      try {
        // {} bypasses gray-matter's cache — see the comment in readProject().
        const parsed = matter(raw, {});
        type = str((parsed.data as Record<string, unknown>).type);
        body = parsed.content;
      } catch {
        // malformed frontmatter — treat the whole file as body
      }
      const { group, url } = graphGroupFor(rel, type);
      const label = firstH1(body) ?? rel.split("/").pop() ?? rel;
      raws.push({ rel, raw, label, group, url });
    }),
  );

  // Resolution indices (Obsidian-style: exact path → path suffix → basename).
  const byId = new Map<string, string>();
  const byBase = new Map<string, string[]>();
  for (const r of raws) {
    byId.set(r.rel.toLowerCase(), r.rel);
    const base = (r.rel.split("/").pop() ?? r.rel).toLowerCase();
    const arr = byBase.get(base);
    if (arr) arr.push(r.rel);
    else byBase.set(base, [r.rel]);
  }

  const resolve = (rawTarget: string, sourceId: string): string | null => {
    const t = rawTarget.split("|")[0].split("#")[0].trim().replace(/\.md$/i, "");
    if (!t) return null;
    const tl = t.toLowerCase();
    if (byId.has(tl)) return byId.get(tl)!;
    const suffix = "/" + tl;
    for (const [idl, id] of byId) if (idl.endsWith(suffix)) return id;
    const base = tl.split("/").pop()!;
    const cands = byBase.get(base);
    if (cands && cands.length) {
      if (cands.length === 1) return cands[0];
      const srcTop = sourceId.split("/")[0];
      return cands.find((c) => c.split("/")[0] === srcTop) ?? cands[0];
    }
    return null;
  };

  const seen = new Set<string>();
  const links: GraphLink[] = [];
  const degree = new Map<string, number>();
  const WIKILINK = /\[\[([^\]]+)\]\]/g;
  for (const r of raws) {
    WIKILINK.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WIKILINK.exec(r.raw)) !== null) {
      const target = resolve(m[1], r.rel);
      if (!target || target === r.rel) continue;
      const key = r.rel + " " + target;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: r.rel, target });
      degree.set(r.rel, (degree.get(r.rel) ?? 0) + 1);
      degree.set(target, (degree.get(target) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = raws.map((r) => ({
    id: r.rel,
    label: r.label,
    group: r.group,
    val: 1 + (degree.get(r.rel) ?? 0),
    url: r.url,
  }));

  return { nodes, links };
});
