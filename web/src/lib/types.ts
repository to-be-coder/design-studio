// ---- Vault schema types (mirror design-studio-shared/CONVENTIONS.md) --------

export type ProjectStatus = "active" | "blocked" | "done" | "archived";
export type Route = "full" | "lite";

/** The 5 pipeline stages — the `stage` frontmatter enum (short tokens). */
export type Stage =
  | "debrief"
  | "research"
  | "structure"
  | "design-system"
  | "build";

/**
 * Utility skills that are not pipeline stages. `compile-spec` joined them when
 * it was reclassified from terminal stage to on-demand render utility (decision
 * 0028) — the pipeline now ends at `build`.
 */
export type Utility = "harvest" | "wiki-lint" | "setup" | "compile-spec";

export type Autonomy = "execute" | "draft" | "scaffold";

export type DecisionStatus =
  | "proposed"
  | "decided"
  | "deferred"
  | "superseded";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "blocked",
  "done",
  "archived",
];

export interface Project {
  slug: string;
  /** Human name from the dashboard H1 (falls back to a humanized slug). */
  name: string;
  status: ProjectStatus | null;
  stage: Stage | null;
  client: string | null;
  route: Route | null;
  started: string | null;
  prototypeRepo: string | null;
  /** File mtime of the dashboard, ISO date (yyyy-mm-dd). */
  mtime: string;
}

/** One parsed bullet of a dashboard's `## Pipeline log` block. */
export interface StageState {
  /** Normalized stage/utility token. */
  stage: Stage | Utility;
  /** The raw status phrase, e.g. "derived + reconciled". */
  rawState: string;
  /** Coarse category used for coloring. */
  state: "ran" | "derived" | "pending" | "skipped" | "unknown";
  date: string | null;
  note: string | null;
}

/** Who supplied a decision's verdict (CONVENTIONS Authorship rule). */
export type AuthoredBy = "user" | "skill";

export interface Decision {
  /** Zero-padded id, e.g. "0021". */
  id: string;
  stage: string | null;
  status: DecisionStatus | null;
  /** Who supplied the verdict — 🔴 stages require `user` + an In-their-words quote. */
  authoredBy: AuthoredBy | null;
  date: string | null;
  /** Wikilink targets, kept as raw "[[..]]"-stripped display strings. */
  restsOn: string | null;
  supersedes: string | null;
  supersededBy: string | null;
  tags: string[];
  /** One-line title from the body H1 (falls back to filename). */
  title: string;
  /** Source filename without extension, e.g. "0021 fit-snapshot-no-edge". */
  file: string;
  body: string;
}

// ---- Canvas board model (rendered by the pannable canvas) --------------------

/**
 * Interaction modes. Only "read" ships in slices 1–4; the rest are declared
 * here so later slices (comment/tweak/tokens) bolt on without a schema change.
 */
export type CanvasMode = "read" | "comment" | "tweak" | "tokens";

/** How a stage marker renders on the spine — shape/weight, never a colour dot. */
export type StageMarkerState = "current" | "ran" | "skipped" | "pending";

export type CardKind =
  | "framing"
  | "artifact"
  | "register"
  | "decision-slice"
  | "design-system-placeholder"
  | "prototype-placeholder";

export interface ArtifactCard {
  /** Stable region id for fly-to / anchors, e.g. "card-research-0". */
  id: string;
  /** Vault-relative source path, or null for synthesized cards. */
  file: string | null;
  title: string;
  kind: CardKind;
  blocks: RenderableBlock[];
  /** For a design-system placeholder / prototype placeholder: a short note. */
  note?: string;
}

/** The debrief framing pane — task→problem transformation made visible. */
export interface FramingModel {
  originalBrief: RenderableBlock[] | null;
  restatedProblem: RenderableBlock[] | null;
  hiddenRubric: RenderableBlock[] | null;
  /** Set large; every decision's Why ladders to it. */
  guidingPrinciple: string | null;
  /** Success criteria in two registers (CONVENTIONS). */
  successOutcome: RenderableBlock[] | null;
  successSignal: RenderableBlock[] | null;
  /** The Full vs Lite route decision + reasoning. */
  routeDecision: RenderableBlock[] | null;
  /** Any other H2 sections, rendered in order. */
  extras: { title: string; blocks: RenderableBlock[] }[];
}

export type AssumptionState = "verified" | "partial" | "unverified" | "accepted";

export interface AssumptionNode {
  /** Short id used to match a decision's rests_on, e.g. "A1". */
  id: string;
  title: string;
  state: AssumptionState;
  /** research's single riskiest load-bearing assumption (surfaced by its pressure-test move). */
  riskiest: boolean;
  /** An accepted-risk admission (e.g. "no primary user contact"). */
  accepted: boolean;
  blocks: RenderableBlock[];
  /** Decision ids whose rests_on cites this assumption (the blast radius). */
  dependents: string[];
}

export interface DecisionStreamEntry {
  id: string;
  title: string;
  stage: string | null;
  status: DecisionStatus | null;
  authoredBy: AuthoredBy | null;
  date: string | null;
  /** Assumption id this rests on (matched to an AssumptionNode), or null. */
  restsOnId: string | null;
  restsOnLabel: string | null;
  supersedes: string | null;
  supersededBy: string | null;
  /** The verbatim In-their-words quote, pulled out for pull-quote treatment. */
  inTheirWords: string | null;
  /** Body blocks with the In-their-words quote removed (rendered separately). */
  blocks: RenderableBlock[];
  file: string;
}

// The Decide phase disappeared with converge/explore-directions (decisions
// 0021/0023): the grouping is now Understand → Build. Decisions are made
// throughout the loop and build, so the Decision Stream renders as its own
// standalone section, not under a phase.
export type Phase = "Understand" | "Build";

export interface SpineStage {
  stage: Stage;
  skill: string;
  phase: Phase;
  autonomy: Autonomy;
  blurb: string;
  gate: string | null;
  /** Stable region id for fly-to, e.g. "region-research". */
  regionId: string;
  markerState: StageMarkerState;
  cards: ArtifactCard[];
  /** Present only on the debrief stage. */
  framing: FramingModel | null;
}

export interface BoardHeader {
  currentStage: Stage | null;
  nextStep: string | null;
  overrides: string[];
}

/** Client-safe descriptor of a project's prototype (server config never leaks). */
export interface PrototypeInfo {
  slug: string;
  /** Has an embeddable source: a dev-server url or a static-servable repo. */
  embeddable: boolean;
  /**
   * The project has a pre-authored `run` command (server-side config), so the
   * canvas can start its dev server itself via the Render control. The command
   * itself NEVER crosses to the client — only this boolean does.
   */
  runnable: boolean;
  /** Where the live DESIGN.md sits (moving-home §4). */
  tokenHome: DesignTokenHome;
  tokenSource: string | null;
  hasTokens: boolean;
  /**
   * Where the frames load from. Same-origin proxy base (/prototype/<slug>/) for
   * static/proxied prototypes, or a raw cross-origin origin for a direct embed.
   */
  base: string;
  /**
   * Same-origin (proxied/static) → the canvas can reach into the frame DOM, so
   * Comment/Tweak/Tokens/instance-scan work. A direct cross-origin embed is
   * view-only: the frame renders but the DOM is off-limits.
   */
  interactive: boolean;
  /** Discovered routes ("" = root); more may accrue as the reviewer navigates. */
  routes: string[];
  /** Human note when Comment/Tweak/Tokens must degrade (no token source, etc). */
  degradedReason: string | null;
}

export interface BoardModel {
  project: Project;
  header: BoardHeader;
  phases: Phase[];
  stages: SpineStage[];
  decisionStream: DecisionStreamEntry[];
  assumptions: AssumptionNode[];
  designSystem: import("./design-system").DesignSystemModel;
  prototype: PrototypeInfo;
  /** The prototype's resolved DESIGN.md tokens — the ONLY tweakable values. */
  tokens: DesignTokens;
}

// ---- Prototype DESIGN.md tokens (google-labs design.md format) ---------------

/** Where the live DESIGN.md copy is (moving-home rule, §4). */
export type DesignTokenHome = "vault" | "prototype" | "none";

export interface DesignTokens {
  home: DesignTokenHome;
  /** Human label of where the live copy sits (path/URL), or null. */
  source: string | null;
  colors: Record<string, unknown>;
  typography: Record<string, unknown>;
  spacing: Record<string, unknown>;
  rounded: Record<string, unknown>;
  components: Record<string, unknown>;
}

// ---- Markdown rendering types (lifted from careerbot web/) -------------------

export type RenderableBlock =
  | { kind: "heading_1"; text: InlineSegment[] }
  | { kind: "heading_2"; text: InlineSegment[] }
  | { kind: "heading_3"; text: InlineSegment[] }
  | { kind: "paragraph"; text: InlineSegment[] }
  | { kind: "bulleted_list_item"; text: InlineSegment[] }
  | { kind: "numbered_list_item"; text: InlineSegment[] }
  | { kind: "code"; text: InlineSegment[]; language: string | null }
  | { kind: "callout"; text: InlineSegment[]; emoji: string | null }
  | { kind: "divider" }
  | { kind: "unsupported"; type: string };

export interface InlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  underline: boolean;
  strikethrough: boolean;
  href: string | null;
}

// ---- Knowledge graph (Obsidian-style link graph over the vault) --------------

export type GraphGroup = "project" | "decision" | "wiki" | "learning" | "note";

export interface GraphNode {
  /** Vault-relative path without .md — the canonical id. */
  id: string;
  label: string;
  group: GraphGroup;
  /** Sizing weight (connection count). */
  val: number;
  /** In-app route if the node maps to one (projects, decisions), else null. */
  url: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface VaultGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}
