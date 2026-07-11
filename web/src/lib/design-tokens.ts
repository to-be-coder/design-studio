import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { readProjectFile } from "./vault";
import type { DesignTokens } from "./types";

/**
 * Parse a prototype's DESIGN.md front matter (google-labs design.md format) —
 * the ONLY source the tweak system (later slices) may ever offer. The file has
 * a moving home (§4): canonical in the vault until `build`, then moved to the
 * prototype repo leaving a link note. We follow the live copy and label where
 * it currently lives; we never render two as if both exist.
 *
 * Slices 1–4 only surface a compact design-system placeholder, so this parser
 * is here as substrate — proven now, consumed by slices 5+.
 */
function shapeTokens(data: Record<string, unknown>): Omit<DesignTokens, "home" | "source"> {
  const group = (k: string): Record<string, unknown> =>
    (data[k] && typeof data[k] === "object" ? (data[k] as Record<string, unknown>) : {});
  return {
    colors: group("colors"),
    typography: group("typography"),
    spacing: group("spacing"),
    rounded: group("rounded"),
    components: group("components"),
  };
}

function looksLikeTokens(data: Record<string, unknown>): boolean {
  return Boolean(data.colors || data.typography || data.components);
}

async function readDesignFile(abs: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
  try {
    // {} bypasses gray-matter's cache — same contract as vault.ts.
    return matter(raw, {}).data as Record<string, unknown>;
  } catch (err) {
    console.warn(`[design-tokens] Skipping ${abs}: ${(err as Error).message}`);
    return null;
  }
}

export async function getDesignTokens(
  slug: string,
  prototypeRepo: string | null,
): Promise<DesignTokens> {
  const none: DesignTokens = {
    home: "none",
    source: null,
    colors: {},
    typography: {},
    spacing: {},
    rounded: {},
    components: {},
  };

  // Prefer the prototype-repo copy when the repo is a reachable local path.
  if (prototypeRepo && prototypeRepo.startsWith("/")) {
    const data = await readDesignFile(path.join(prototypeRepo, "DESIGN.md"));
    if (data && looksLikeTokens(data)) {
      return { home: "prototype", source: path.join(prototypeRepo, "DESIGN.md"), ...shapeTokens(data) };
    }
  }

  // Otherwise the vault copy (canonical before build).
  const vault = await readProjectFile(slug, "DESIGN.md");
  if (vault && looksLikeTokens(vault.data)) {
    return { home: "vault", source: `${slug}/DESIGN.md`, ...shapeTokens(vault.data) };
  }

  return none;
}
