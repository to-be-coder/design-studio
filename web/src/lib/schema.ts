import type { Autonomy, Stage, Utility } from "./types";

/**
 * THE schema. One source of truth the whole UI renders from — derived from
 * design-studio-shared/CONVENTIONS.md's pipeline table. Screens read stages,
 * skills, autonomy, the runnable flag, and the output-file map from here; they
 * never hardcode the pipeline per-view.
 */

export interface StageDef {
  /** The `stage` frontmatter token. */
  stage: Stage;
  /** Full skill name (what you invoke: /<skill>). */
  skill: string;
  phase: "Understand" | "Build";
  autonomy: Autonomy;
  /** Emoji shorthand shown in the UI (🟢 execute · 🟡 draft · 🔴 scaffold). */
  autonomyIcon: "🟢" | "🟡" | "🔴";
  /**
   * True → the skill completes without a 🔴 human decision mid-run, so the
   * Hybrid runner may spawn it headlessly. False → copy-command only.
   */
  runnable: boolean;
  /**
   * Vault-relative artifact(s) this stage produces (a folder ends with "/").
   * Empty = the stage records decisions only (or writes to an external repo).
   */
  outputs: string[];
  /** One-line description of what the stage does. */
  blurb: string;
  /** The gate/note from the pipeline table. */
  gate?: string;
}

export const STAGES: StageDef[] = [
  {
    stage: "debrief",
    skill: "design-studio-debrief",
    phase: "Understand",
    autonomy: "scaffold",
    autonomyIcon: "🔴",
    runnable: false,
    outputs: ["01 Brief & Problem.md", "Clarifications.md", "Agreements.md"],
    blurb: "Turn the brief into a restated problem + rubric; set up the workspace.",
    gate: "The route decision (Full vs Lite) is the 🔴 moment.",
  },
  {
    stage: "research",
    skill: "design-studio-research",
    phase: "Understand",
    autonomy: "draft",
    autonomyIcon: "🟡",
    runnable: true,
    outputs: ["02 Research/"],
    blurb: "Parallel fan-out into company, pain, standards, and landscape; directions + pressure-test moves on demand.",
    gate: "Directions move (🔴 pick) on demand; owns the risk register; forced framing-check + migration-flag + primary-contact + trap-check every report.",
  },
  {
    stage: "structure",
    skill: "design-studio-structure",
    phase: "Build",
    autonomy: "draft",
    autonomyIcon: "🟡",
    runnable: false,
    outputs: ["03 Structure.md"],
    blurb: "Draft user flows + information architecture from the accepted recommendation.",
    gate: "🟡 — the skill drafts; you edit. Consumed by design-system and build.",
  },
  {
    stage: "design-system",
    skill: "design-studio-design-system",
    phase: "Build",
    autonomy: "draft",
    autonomyIcon: "🟡",
    runnable: false,
    outputs: ["DESIGN.md"],
    blurb: "Fix the visual language once, in writing, as DESIGN.md.",
    gate: "Lint (structure + WCAG) + user sign-off.",
  },
  {
    stage: "build",
    skill: "design-studio-build",
    phase: "Build",
    autonomy: "execute",
    autonomyIcon: "🟢",
    runnable: true,
    outputs: [],
    blurb: "Spec-first clickable prototype in a separate repo (see prototype_repo), built in rounds.",
    gate: "Round-closing checklist: states / edge / a11y + content + DESIGN.md audit & design:diff drift + register receipt.",
  },
];

export interface UtilityDef {
  utility: Utility;
  skill: string;
  autonomy: Autonomy;
  autonomyIcon: "🟢" | "🟡" | "🔴";
  runnable: boolean;
  outputs: string[];
  blurb: string;
}

export const UTILITIES: UtilityDef[] = [
  {
    // Reclassified from terminal stage to on-demand render utility (decision
    // 0028): the pipeline ends at build, and a document is a projection of the
    // decision log, not a milestone. Its Spec.md / Align.md / Handoff.md
    // outputs are on-demand artifacts — declared here for completeness, but not
    // rendered on the board spine (the board walks STAGES only, same as harvest's
    // Harvest.md).
    utility: "compile-spec",
    skill: "design-studio-compile-spec",
    autonomy: "execute",
    autonomyIcon: "🟢",
    runnable: true,
    outputs: ["Spec.md"],
    blurb: "On-demand render of the decision log for an audience (align / stakeholder / eng-handoff).",
  },
  {
    utility: "harvest",
    skill: "design-studio-harvest",
    autonomy: "scaffold",
    autonomyIcon: "🔴",
    runnable: false,
    outputs: ["Harvest.md"],
    blurb: "The only writer of the Studio Wiki — distills lessons across the membrane.",
  },
  {
    utility: "wiki-lint",
    skill: "design-studio-wiki-lint",
    autonomy: "execute",
    autonomyIcon: "🟢",
    runnable: true,
    outputs: [],
    blurb: "Wiki health check — contradictions, orphans, stale claims, harvest debt.",
  },
  {
    utility: "setup",
    skill: "design-studio-setup",
    autonomy: "draft",
    autonomyIcon: "🟡",
    runnable: false,
    outputs: [],
    blurb: "First-run onboarding: writes the vault pointer and scaffolds the home.",
  },
];

/** Short UI labels for autonomy (shown instead of the 🟢🟡🔴 icons). */
export const AUTONOMY_SHORT: Record<Autonomy, string> = {
  execute: "Auto",
  draft: "Review",
  scaffold: "Action",
};

/** Human-readable autonomy labels (used as tooltips). */
export const AUTONOMY_LABEL: Record<Autonomy, string> = {
  execute: "Auto — the skill does it",
  draft: "Review — drafts a first version you edit",
  scaffold: "Action — you decide; the skill won't supply the answer",
};

/** Every skill name the Hybrid runner is allowed to spawn headlessly. */
export const RUNNABLE_SKILLS: ReadonlySet<string> = new Set(
  [...STAGES, ...UTILITIES].filter((s) => s.runnable).map((s) => s.skill),
);

export function stageDef(stage: Stage): StageDef | undefined {
  return STAGES.find((s) => s.stage === stage);
}

/**
 * Map a name as it appears in a dashboard's `## Pipeline log` (which uses the
 * LONG skill-derived names) to the short stage/utility token.
 *   structure -> structure   ·   compile-spec -> compile-spec   ·   harvest -> harvest
 *
 * `compile-spec` (and its legacy `spec` alias) maps to the `compile-spec`
 * UTILITY token — reclassified from terminal stage to on-demand render utility
 * (decision 0028). Like a `harvest` line, a `compile-spec` line is KEPT in the
 * parsed StageState[] (not silently dropped) — it just isn't one of the five
 * spine STAGES, so the board (which walks STAGES) never renders it as a tick.
 *
 * The removed-stage tokens are deliberately NOT in this map, so a historical
 * project's pipeline log drops them silently (never crashes, never mis-attributes
 * onto a neighbouring stage): `verify` (decision 0018, folded into research),
 * `reframe` + `scope` / `scope-and-sequence` (decision 0020, folded into the
 * Understand loop + Agreements.md), `directions` / `explore-directions` +
 * `converge` (decisions 0021 + 0023: directions became a research MOVE and
 * converge dissolved — nothing locks before production), and `validate`
 * (decision 0027: the drift check moved into build's round-closing checklist,
 * user testing + expert review became research's evaluate move, and the
 * decision-log-vs-reality check became its reconcile move). Real vaults still
 * carry "Verify — Ran, ...", "Explore directions — ...", "Converge — ...", and
 * "Validate — Ran, ..." lines from the old pipeline; they're left on disk
 * untouched. Falling through to `?? null` means the line is dropped from the
 * parsed StageState[] (parsePipelineLog in vault.ts `continue`s past any null) —
 * the same silent-drop path as any other unrecognized line. The pipeline is now
 * 5 stages.
 */
export function normalizeStageName(logName: string): Stage | Utility | null {
  const n = logName.trim().toLowerCase().replace(/\s+/g, "-");
  const map: Record<string, Stage | Utility> = {
    debrief: "debrief",
    research: "research",
    structure: "structure",
    "design-system": "design-system",
    build: "build",
    spec: "compile-spec",
    "compile-spec": "compile-spec",
    harvest: "harvest",
    "wiki-lint": "wiki-lint",
    setup: "setup",
  };
  return map[n] ?? null;
}
