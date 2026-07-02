// Studio Wall — shared shape contract. Types only: never served, never built, never imported at
// runtime. server.js (producer) and public/app.js (consumer) both annotate against these via
// JSDoc `import()` types; `npm run check` (tsc --noEmit) enforces them.

export interface Project {
  slug: string;
  status: string;
  stage: string;
  client: string;
  route: string;
  started: string;
  prototype_repo: string;
  idleDays: number;
  flags: number;
  health: 'ok' | 'warn';
}

export interface Prototype {
  slug: string;
  repo: string;
}

export interface WikiState {
  pages: number;
  sparks: number;
  log: string[];
  lastLint: string | null;
}

export interface ActivityItem {
  ts: string | null;
  text: string;
}

export interface PrimaryAction {
  kind: 'run';
  skill: string;
  label: string;
}

export interface WallState {
  generatedAt: string;
  vault: string | null;
  vaultOk: boolean;
  claude: boolean;
  portfolio: Project[];
  wiki: WikiState | null;
  prototypes: Prototype[];
  activity: ActivityItem[];
  primary: PrimaryAction | null;
}

export interface AllowlistEntry {
  label: string;
  argv: string[];
}

export interface RunLogEntry {
  ts: string;
  skill: string;
  ms: number;
  ok: boolean;
}

export type PaletteKind = 'run' | 'copy' | 'drill' | 'refresh' | 'noop';

export interface PaletteAction {
  tag: string;
  id: string;
  label: string;
  kind: PaletteKind;
  disabled?: boolean;
  /** command text for kind: 'copy' */
  text?: string;
  /** project for kind: 'drill' */
  project?: Project;
}
