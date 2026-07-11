import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getDesignDoc } from "./design-tokens";
import { projectDir } from "./vault";
import { parseMarkdownBody } from "./parse-markdown";
import { splitByH2, findSection, blockText } from "./blocks";
import { contrastRatio, wcagLevel, type WcagLevel } from "./color";
import {
  componentSpecs,
  flattenScalars,
  resolveRefs,
  typographyPresets,
  type ComponentSpec,
  type FlatToken,
  type TypePreset,
} from "./tokens";
import type { DesignTokenHome, DesignTokens } from "./types";

/**
 * The design-system board model (§6): the project's DESIGN.md rendered as living
 * specimens generated from the tokens themselves — never hand-drawn, never
 * screenshots. Color pairings carry their computed WCAG ratio (the lint gate made
 * visible), components render every state variant, and candidate/rejected boards
 * from _assets/boards/ ride alongside the live specimen with the chosen one marked.
 */

export interface ColorPairing {
  role: "text" | "action" | "border";
  label: string;
  fgKey: string;
  bgKey: string;
  fg: string;
  bg: string;
  ratio: number | null;
  level: WcagLevel;
  /** Meets AA for normal text (4.5:1). The pass/fail the board flags. */
  passes: boolean;
}

export interface DoDont {
  kind: "do" | "dont";
  text: string;
}

export interface CandidateBoard {
  file: string;
  label: string;
  html: string;
  chosen: boolean;
}

export interface DesignSystemModel {
  hasTokens: boolean;
  home: DesignTokenHome;
  source: string | null;
  colors: FlatToken[];
  colorPairings: ColorPairing[];
  typography: TypePreset[];
  spacing: FlatToken[];
  rounded: FlatToken[];
  components: ComponentSpec[];
  dosDonts: DoDont[];
  boards: CandidateBoard[];
}

function colorValue(tokens: DesignTokens, key: string): string | null {
  const v = (tokens.colors as Record<string, unknown>)[key];
  return v == null ? null : resolveRefs(v, tokens);
}

/** Pair each text/action/border-ish color against the grounds it lands on. */
function buildPairings(tokens: DesignTokens): ColorPairing[] {
  const colors = tokens.colors as Record<string, unknown>;
  const keys = Object.keys(colors);
  const has = (k: string) => keys.includes(k);

  // Heuristic role detection by conventional key names, with graceful fallback.
  const grounds = keys.filter((k) => /^(bg|background|surface|paper|desk|ground|base|card)/i.test(k));
  const textKeys = keys.filter((k) => /(text|ink|fg|foreground|muted|faint|body|heading)/i.test(k));
  const actionBgKeys = keys.filter((k) => /(primary|accent|action|danger|success|warn|cta|brand)/i.test(k));

  const pairs: ColorPairing[] = [];
  const seen = new Set<string>();
  const push = (role: ColorPairing["role"], label: string, fgKey: string, bgKey: string) => {
    const fg = colorValue(tokens, fgKey);
    const bg = colorValue(tokens, bgKey);
    if (!fg || !bg) return;
    const id = `${fgKey}/${bgKey}`;
    if (seen.has(id)) return;
    seen.add(id);
    const ratio = contrastRatio(fg, bg);
    pairs.push({
      role,
      label,
      fgKey,
      bgKey,
      fg,
      bg,
      ratio,
      level: ratio == null ? "Fail" : wcagLevel(ratio),
      passes: ratio != null && ratio >= 4.5,
    });
  };

  const groundList = grounds.length ? grounds : keys.filter((k) => k === "bg" || k === "surface");
  // Text on every ground.
  for (const t of textKeys) {
    for (const g of groundList) {
      if (t === g) continue;
      push("text", `${t} on ${g}`, t, g);
    }
  }
  // Action fills: their own text-on-fill pairing.
  for (const a of actionBgKeys) {
    // The conventional on-color: primaryText / accentInk / a light/white text.
    const onKey =
      keys.find((k) => new RegExp(`^${a}text$`, "i").test(k)) ??
      (has("primaryText") ? "primaryText" : has("accentInk") ? "accentInk" : has("bg") ? "bg" : null);
    if (onKey) push("action", `${onKey} on ${a}`, onKey, a);
  }
  // Border on the first ground (large / non-text — informational).
  const borderKey = keys.find((k) => /border|rule|divider|outline/i.test(k));
  if (borderKey && groundList[0]) push("border", `${borderKey} on ${groundList[0]}`, borderKey, groundList[0]);

  return pairs;
}

function parseDosDonts(dosDontsBlocks: ReturnType<typeof splitByH2>[number]["blocks"]): DoDont[] {
  const out: DoDont[] = [];
  for (const b of dosDontsBlocks) {
    if (b.kind !== "bulleted_list_item") continue;
    const text = blockText(b).trim();
    if (!text) continue;
    // A single bullet often carries both a Do and a Don't; split on "Don't".
    const parts = text.split(/(?=\bDon't\b|\bDon’t\b)/i);
    for (const part of parts) {
      const t = part.trim().replace(/^[-•]\s*/, "");
      if (!t) continue;
      const isDont = /^\**\s*Don['’]t\b/i.test(t);
      out.push({ kind: isDont ? "dont" : "do", text: t });
    }
  }
  return out;
}

async function readBoards(slug: string): Promise<CandidateBoard[]> {
  const dir = path.join(await projectDir(slug), "_assets", "boards");
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const htmlFiles = entries
    .filter((e) => e.isFile() && /\.html?$/i.test(e.name))
    .map((e) => e.name)
    .sort();

  // A CHOSEN file (one basename per line) marks the chosen board; else fall
  // back to a ".chosen." filename convention.
  let chosenNames = new Set<string>();
  try {
    const raw = await fs.readFile(path.join(dir, "CHOSEN"), "utf8");
    chosenNames = new Set(raw.split("\n").map((l) => l.trim()).filter(Boolean));
  } catch {
    /* no CHOSEN file */
  }

  const boards: CandidateBoard[] = [];
  for (const name of htmlFiles) {
    let html = "";
    try {
      html = await fs.readFile(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    const chosen = chosenNames.has(name) || /\.chosen\./i.test(name);
    boards.push({
      file: name,
      label: name.replace(/\.chosen/i, "").replace(/\.html?$/i, "").replace(/[-_]/g, " "),
      html,
      chosen,
    });
  }
  return boards;
}

export const getDesignSystem = cache(
  async (slug: string, prototypeRepo: string | null): Promise<DesignSystemModel> => {
    const { tokens, body } = await getDesignDoc(slug, prototypeRepo);

    let dosDonts: DoDont[] = [];
    if (body) {
      const sections = splitByH2(await parseMarkdownBody(body));
      const section = findSection(sections, "do's and don'ts", "dos and don'ts", "do and don't", "guidelines");
      if (section) dosDonts = parseDosDonts(section.blocks);
    }

    const boards = await readBoards(slug);

    return {
      hasTokens: tokens.home !== "none",
      home: tokens.home,
      source: tokens.source,
      colors: flattenScalars(tokens).filter((t) => t.group === "colors"),
      colorPairings: buildPairings(tokens),
      typography: typographyPresets(tokens),
      spacing: flattenScalars(tokens).filter((t) => t.group === "spacing"),
      rounded: flattenScalars(tokens).filter((t) => t.group === "rounded"),
      components: componentSpecs(tokens),
      dosDonts,
      boards,
    };
  },
);
