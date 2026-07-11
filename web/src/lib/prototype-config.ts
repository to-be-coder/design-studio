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

export interface PrototypeConfig {
  slug: string;
  /** Local checkout dir (DESIGN.md token source; maybe static-servable). */
  repo: string | null;
  /** Dev-server origin to proxy for live frames, or null. */
  url: string | null;
  /** repo exists on disk AND holds an index.html → the proxy can serve it statically. */
  staticRepo: boolean;
  /**
   * Explicit route list (§2 of canvas-maker: enumerate the real route table). A
   * SPA has no static files to discover, so its pages can't be auto-found — list
   * them here to show every page. Null → fall back to discovery.
   */
  routes: string[] | null;
}

function looksLikeUrl(s: string | null | undefined): boolean {
  return !!s && /^https?:\/\//i.test(s.trim());
}

async function readConfigFile(): Promise<{
  config: Record<string, { repo?: string; url?: string; routes?: string[] }>;
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
    return { slug, repo, url, staticRepo, routes };
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
