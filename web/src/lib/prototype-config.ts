import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

/**
 * Resolve where a project's prototype lives — WITHOUT ever reading the vault for
 * server/origin config (§9: "PROTOTYPE_URL env or local config file, never the
 * vault"). Two things are resolved per project:
 *
 *   - repo: a local checkout directory. Its DESIGN.md is the token source the
 *     Comment/Tweak/Tokens slices read. If it also holds servable static files
 *     (an index.html), the same-origin proxy serves it directly (the hermetic
 *     fixture case).
 *   - url: a running dev-server origin to proxy for the live frames (§9). Real
 *     prototypes are source, not static, so they need a dev server; url is how
 *     the frame reaches it, same-origin, through this app's /prototype route.
 *
 * Resolution order (first hit wins per field):
 *   1. A local JSON config file: { "<slug>": { "repo": "...", "url": "..." } }.
 *      Path from PROTOTYPE_CONFIG env, else web/prototypes.local.json (cwd).
 *   2. The dashboard's `prototype_repo` (passed in): a URL → url, a /path → repo.
 *   3. PROTOTYPE_URL env → url (a global default).
 */

/**
 * A pre-authored command that starts this project's dev server (§9 "the running
 * thing"). SERVER-ONLY: the argv + cwd never cross to the client — the browser
 * learns only `runnable: true|false` and the live run status. The whole security
 * model rests on this: the browser sends a slug, and the SERVER maps slug → this
 * command read from the LOCAL CONFIG FILE, never from the request. A slug with no
 * `run` here can never spawn anything.
 */
export interface PrototypeRunConfig {
  /** argv array — spawned directly, never through a shell string. */
  cmd: string[];
  /** Absolute working directory the command is spawned in. */
  cwd: string;
  /** Polled with GET until it answers 2xx/3xx → the server is "ready". */
  readyUrl: string;
  /** How long to poll readyUrl before declaring an error. Default 60000. */
  readyTimeoutMs: number;
}

export interface PrototypeConfig {
  slug: string;
  /** Local checkout dir (DESIGN.md token source; maybe static-servable). */
  repo: string | null;
  /** Dev-server origin to proxy for live frames, or null. */
  url: string | null;
  /**
   * Pre-authored dev-server start command, or null. SERVER-ONLY — never leaked
   * to the client (board.ts derives just a `runnable` boolean from it).
   */
  run: PrototypeRunConfig | null;
  /** repo exists on disk AND holds an index.html → the proxy can serve it statically. */
  staticRepo: boolean;
  /**
   * Explicit route list (§2 of canvas-maker: enumerate the real route table). A
   * SPA has no static files to discover, so its pages can't be auto-found — list
   * them here to show every page. Null → fall back to discovery.
   */
  routes: string[] | null;
  /**
   * Embed the `url` directly at its own origin (cross-origin) instead of through
   * the same-origin proxy. Required for an app whose router has no basename (it
   * would 404 under a path prefix) — e.g. a Vite/React-Router SPA. View-only:
   * Comment/Tweak/Tokens can't reach a cross-origin DOM.
   */
  direct: boolean;
}

function looksLikeUrl(s: string | null | undefined): boolean {
  return !!s && /^https?:\/\//i.test(s.trim());
}

interface RawRun {
  cmd?: unknown;
  cwd?: unknown;
  readyUrl?: unknown;
  readyTimeoutMs?: unknown;
}

async function readConfigFile(): Promise<{
  config: Record<
    string,
    { repo?: string; url?: string; routes?: string[]; direct?: boolean; run?: RawRun }
  >;
  dir: string;
}> {
  const explicit = process.env.PROTOTYPE_CONFIG?.trim();
  const candidates = explicit
    ? [explicit]
    : [path.resolve(process.cwd(), "prototypes.local.json")];
  for (const c of candidates) {
    try {
      const raw = await fs.readFile(c, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return { config: parsed, dir: path.dirname(c) };
    } catch {
      /* absent/unparseable → next candidate */
    }
  }
  return { config: {}, dir: process.cwd() };
}

async function hasIndex(dir: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, "index.html"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a raw `run` block into a PrototypeRunConfig, or null if malformed.
 * A relative `cwd` resolves against the config file's dir (so a checked-in
 * fixture config stays portable). Only trusted config-file input reaches here —
 * the client never supplies any of this.
 */
function parseRun(raw: RawRun | undefined, dir: string): PrototypeRunConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const cmd = Array.isArray(raw.cmd)
    ? raw.cmd.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
  if (cmd.length === 0) return null;
  const cwdRaw = typeof raw.cwd === "string" && raw.cwd.trim() ? raw.cwd.trim() : null;
  if (!cwdRaw) return null;
  const cwd = path.resolve(dir, cwdRaw);
  const readyUrl = typeof raw.readyUrl === "string" && raw.readyUrl.trim() ? raw.readyUrl.trim() : null;
  if (!readyUrl) return null;
  const readyTimeoutMs =
    typeof raw.readyTimeoutMs === "number" && raw.readyTimeoutMs > 0 ? raw.readyTimeoutMs : 60000;
  return { cmd, cwd, readyUrl, readyTimeoutMs };
}

export const resolvePrototypeConfig = cache(
  async (slug: string, prototypeRepo: string | null): Promise<PrototypeConfig> => {
    const { config, dir } = await readConfigFile();
    const entry = config[slug] ?? {};

    // A config-file `repo` may be relative — resolved against the config's dir,
    // so a checked-in fixture config stays portable (no absolute paths).
    let repo: string | null = entry.repo?.trim()
      ? path.resolve(dir, entry.repo.trim())
      : null;
    let url: string | null = entry.url?.trim() || null;

    // Dashboard prototype_repo fills whichever field it fits.
    if (prototypeRepo) {
      if (looksLikeUrl(prototypeRepo)) url = url ?? prototypeRepo.trim();
      else if (prototypeRepo.startsWith("/")) repo = repo ?? prototypeRepo.trim();
    }

    // Global env default (a single dev server for the whole app).
    if (!url && process.env.PROTOTYPE_URL?.trim()) url = process.env.PROTOTYPE_URL.trim();

    const staticRepo = repo ? await hasIndex(repo) : false;
    const routes = Array.isArray(entry.routes) && entry.routes.length ? entry.routes : null;
    const direct = entry.direct === true && !!url;
    const run = parseRun(entry.run, dir);
    return { slug, repo, url, staticRepo, routes, direct, run };
  },
);

/** Does the project have any embeddable prototype source (a url or a static repo)? */
export function isEmbeddable(cfg: PrototypeConfig): boolean {
  return !!cfg.url || cfg.staticRepo;
}

/**
 * Discover the prototype's routes (§7/§9 navigation + cross-route scan). For a
 * static checkout we can enumerate top-level .html files (index.html → the root
 * route ""). For a dev server we can't enumerate, so we return just the root and
 * let routes accrue as the reviewer navigates the frame.
 */
export async function discoverRoutes(cfg: PrototypeConfig): Promise<string[]> {
  // Explicit config routes win (the only way to enumerate a SPA's pages).
  if (cfg.routes && cfg.routes.length) {
    return Array.from(new Set(["", ...cfg.routes.map((r) => r.replace(/^\//, ""))]));
  }
  if (cfg.staticRepo && cfg.repo) {
    try {
      const entries = await fs.readdir(cfg.repo, { withFileTypes: true });
      const html = entries
        .filter((e) => e.isFile() && /\.html?$/i.test(e.name))
        .map((e) => e.name)
        .sort();
      const routes = html.map((n) => (/^index\.html?$/i.test(n) ? "" : n));
      // Root first, deduped.
      const uniq = Array.from(new Set(["", ...routes]));
      return uniq;
    } catch {
      return [""];
    }
  }
  return [""];
}
