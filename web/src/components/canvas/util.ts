import type { Autonomy, AssumptionState, StageMarkerState } from "@/lib/types";

/**
 * Strip the retired traffic-light emojis (🟢🟡🔴) from any schema-sourced text
 * before it reaches the board — the pipeline's gate prose names the "🔴 moment",
 * but this surface expresses autonomy/state through words, never dots (§1).
 */
export function stripDots(s: string): string {
  return s.replace(/[🟢🟡🔴]/gu, "").replace(/\s{2,}/g, " ").trim();
}

/** "design-system" → "Design system". */
export function stageName(stage: string): string {
  const s = stage.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Autonomy as a WORD, never a coloured dot (DESIGN.md §1 retires the idiom).
 * execute → Auto · draft → Review · scaffold → You decide.
 */
export function autonomyWord(a: Autonomy): string {
  return a === "execute" ? "Auto" : a === "draft" ? "Review" : "You decide";
}

/** An Obsidian deep-link to a project-relative file (read-only affordance). */
export function obsidianHref(slug: string, file: string | null): string | null {
  if (!file) return null;
  const rel = `Design Studio/${slug}/${file}`.replace(/\.md$/, "");
  return `obsidian://open?file=${encodeURIComponent(rel)}`;
}

/** Human label for a stage marker state. */
export function markerLabel(state: StageMarkerState): string {
  return state === "current"
    ? "Current"
    : state === "ran"
      ? "Ran"
      : state === "skipped"
        ? "Not run"
        : "Pending";
}

/** Human label for an assumption state. */
export function assumptionLabel(state: AssumptionState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

/**
 * The state → fill treatment mapping. State is carried by a designed mark
 * (filled / half / outline) PLUS a word — never colour alone — so it survives
 * greyscale and colour-blindness (DESIGN.md Colors).
 */
export type Fill = "solid" | "half" | "outline";
export function assumptionFill(state: AssumptionState): Fill {
  return state === "verified"
    ? "solid"
    : state === "partial"
      ? "half"
      : state === "accepted"
        ? "half"
        : "outline";
}
export function assumptionColorVar(state: AssumptionState): string {
  return `var(--${state})`;
}
