// ---- Vault schema types (mirror design-studio-shared/CONVENTIONS.md) --------

export type ProjectStatus = "active" | "blocked" | "done" | "archived";
export type Route = "full" | "lite";

/** The 11 pipeline stages — the `stage` frontmatter enum (short tokens). */
export type Stage =
  | "debrief"
  | "research"
  | "verify"
  | "reframe"
  | "scope"
  | "directions"
  | "converge"
  | "design-system"
  | "build"
  | "validate"
  | "spec";

/** Utility skills that are not pipeline stages. */
export type Utility = "harvest" | "wiki-lint" | "setup";

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

export interface Decision {
  /** Zero-padded id, e.g. "0021". */
  id: string;
  stage: string | null;
  status: DecisionStatus | null;
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
