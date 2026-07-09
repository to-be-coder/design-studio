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
  phase: "Understand" | "Decide" | "Build";
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
    outputs: ["01 Brief & Problem.md"],
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
    blurb: "Parallel fan-out into company, pain, standards, and landscape.",
  },
  {
    stage: "verify",
    skill: "design-studio-verify",
    phase: "Understand",
    autonomy: "draft",
    autonomyIcon: "🟡",
    runnable: true,
    outputs: ["Assumptions & Risks.md"],
    blurb: "Pressure-test the riskiest load-bearing assumption.",
    gate: "Drafts a user-study plan when the assumption needs humans.",
  },
  {
    stage: "reframe",
    skill: "design-studio-reframe",
    phase: "Decide",
    autonomy: "scaffold",
    autonomyIcon: "🔴",
    runnable: false,
    outputs: [],
    blurb: "Reconsider the framing before committing (records decisions only).",
    gate: "Full 🔴 ritual — may conclude no reframe is needed.",
  },
  {
    stage: "scope",
    skill: "design-studio-scope-and-sequence",
    phase: "Decide",
    autonomy: "scaffold",
    autonomyIcon: "🔴",
    runnable: false,
    outputs: ["03 Scope.md"],
    blurb: "Full scope + staged sequence + migration plan.",
    gate: "🔴 sequencing decision + existing-user migration gate.",
  },
  {
    stage: "directions",
    skill: "design-studio-explore-directions",
    phase: "Decide",
    autonomy: "scaffold",
    autonomyIcon: "🔴",
    runnable: false,
    outputs: ["04 Directions.md"],
    blurb: "Contrasting directions + a data-model comparison.",
    gate: "🔴 direction pick.",
  },
  {
    stage: "converge",
    skill: "design-studio-converge",
    phase: "Decide",
    autonomy: "scaffold",
    autonomyIcon: "🔴",
    runnable: false,
    outputs: [],
    blurb: "Name the spine and cut everything else (the cut list is a deliverable).",
    gate: "🔴 — you must articulate the spine + every cut.",
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
    blurb: "Spec-first clickable prototype in a separate repo (see prototype_repo).",
    gate: "States / edge / a11y gate + DESIGN.md token audit.",
  },
  {
    stage: "validate",
    skill: "design-studio-validate",
    phase: "Build",
    autonomy: "draft",
    autonomyIcon: "🟡",
    runnable: true,
    outputs: ["05 Validation.md"],
    blurb: "Test with real users, or an expert/heuristic review.",
    gate: "Back-edge — findings may supersede decisions.",
  },
  {
    stage: "spec",
    skill: "design-studio-compile-spec",
    phase: "Build",
    autonomy: "execute",
    autonomyIcon: "🟢",
    runnable: true,
    outputs: ["06 Spec.md"],
    blurb: "Render the decision log for an audience.",
    gate: "Modes: align / stakeholder / eng-handoff.",
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
 *   scope-and-sequence -> scope   ·   explore-directions -> directions
 *   compile-spec -> spec          ·   harvest -> harvest
 */
export function normalizeStageName(logName: string): Stage | Utility | null {
  const n = logName.trim().toLowerCase().replace(/\s+/g, "-");
  const map: Record<string, Stage | Utility> = {
    debrief: "debrief",
    research: "research",
    verify: "verify",
    reframe: "reframe",
    scope: "scope",
    "scope-and-sequence": "scope",
    directions: "directions",
    "explore-directions": "directions",
    converge: "converge",
    "design-system": "design-system",
    build: "build",
    validate: "validate",
    spec: "spec",
    "compile-spec": "spec",
    harvest: "harvest",
    "wiki-lint": "wiki-lint",
    setup: "setup",
  };
  return map[n] ?? null;
}
