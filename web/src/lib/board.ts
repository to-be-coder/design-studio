import { cache } from "react";
import { ROOT_DOCS, STAGES } from "./schema";
import {
  getProject,
  getStageOutput,
  listDecisions,
  projectFileExists,
} from "./vault";
import { getFraming } from "./brief";
import { getAssumptions, restsOnMatches } from "./assumptions";
import { getLedger } from "./unknowns";
import { getWwb } from "./wwb";
import { findStatusLine, parseLoopStatus } from "./loop-status";
import { buildDecisionStream } from "./decision-stream";
import { blockText, findSection, splitByH2 } from "./blocks";
import { getDesignSystem } from "./design-system";
import { getDesignTokens } from "./design-tokens";
import { resolvePrototypeConfig, isEmbeddable, discoverRoutes } from "./prototype-config";
import type {
  ArtifactCard,
  BoardHeader,
  BoardModel,
  Phase,
  PrototypeInfo,
  RootDocPresence,
  SpineStage,
  Stage,
  StageMarkerState,
  StageState,
} from "./types";
import type { Project } from "./types";

/**
 * Assemble the whole canvas model for a project from the schema + the vault.
 * The pipeline is defined ONCE (schema.ts); this walks it and hangs each
 * stage's artifacts, the consolidated decision stream, and the assumption
 * graph off it. Everything here is JSON-serialisable so a server component can
 * hand it straight to the client `<Canvas>`.
 */
export const getBoard = cache(async (slug: string): Promise<BoardModel | null> => {
  const detail = await getProject(slug);
  if (!detail) return null;
  const { project, dashboardBlocks, dashboardBody, pipeline, decisions, outputsPresent } = detail;

  const config = await resolvePrototypeConfig(slug, project.prototypeRepo);
  const [framing, assumptions, designSystem, tokens, ledger, rootDocs] = await Promise.all([
    getFraming(slug),
    getAssumptions(slug),
    getDesignSystem(slug, config.repo),
    getDesignTokens(slug, config.repo),
    getLedger(slug),
    resolveRootDocs(slug),
  ]);
  // wwb v2 reads the ledger for its questions fallback + evidence-moved check.
  const wwb = await getWwb(slug, ledger);

  // A direct embed loads the app at its own origin (cross-origin): the frame
  // renders but the canvas can't touch its DOM, so it's view-only.
  const direct = config.direct && !!config.url;
  const base = direct ? config.url!.replace(/\/?$/, "/") : `/prototype/${slug}/`;
  const interactive = !direct;
  const degradedReason = direct
    ? "Live app embedded at its own origin — Comment, Tweak, and Tokens are read-only here (the canvas can't reach into another origin)."
    : !tokens.home || tokens.home === "none"
      ? "No DESIGN.md token source — Comment, Tweak, and Tokens are read-only here."
      : null;
  const prototype: PrototypeInfo = {
    slug,
    embeddable: isEmbeddable(config),
    // Client-safe: just whether a run command exists. cmd/cwd stay server-side.
    runnable: !!config.run,
    tokenHome: tokens.home,
    tokenSource: tokens.source,
    hasTokens: tokens.home !== "none",
    base,
    interactive,
    routes: await discoverRoutes(config),
    degradedReason,
  };

  // Link each assumption's blast radius: the decisions whose rests_on cites it.
  for (const a of assumptions) {
    a.dependents = decisions.filter((d) => restsOnMatches(d.restsOn, a)).map((d) => d.id);
  }

  const decisionStream = await buildDecisionStream(decisions, assumptions);

  const stages: SpineStage[] = await Promise.all(
    STAGES.map(async (def): Promise<SpineStage> => {
      const cards = await buildCards(slug, def.stage);
      return {
        stage: def.stage,
        skill: def.skill,
        phase: def.phase,
        autonomy: def.autonomy,
        blurb: def.blurb,
        gate: def.gate ?? null,
        regionId: `region-${def.stage}`,
        markerState: markerState(def.stage, project, pipeline, outputsPresent),
        cards,
        framing: def.stage === "debrief" ? framing : null,
      };
    }),
  );

  return {
    project,
    header: buildHeader(project, dashboardBlocks, dashboardBody),
    phases: ["Understand", "Build"],
    stages,
    decisionStream,
    assumptions,
    designSystem,
    prototype,
    tokens,
    rootDocs,
    wwb,
    ledger,
  };
});

/**
 * Walk ROOT_DOCS (never a hardcoded set) and record which candidate file each
 * resolved to. A derived doc (Questions for you) has no file, so its presence is
 * decided by the ledger downstream, so it's always listed.
 */
async function resolveRootDocs(slug: string): Promise<RootDocPresence[]> {
  return Promise.all(
    ROOT_DOCS.map(async (def): Promise<RootDocPresence> => {
      let file: string | null = null;
      for (const f of def.files) {
        if (await projectFileExists(slug, f)) {
          file = f;
          break;
        }
      }
      return {
        key: def.key,
        label: def.label,
        hero: !!def.hero,
        derived: !!def.derived,
        file,
        present: def.derived ? true : file !== null,
      };
    }),
  );
}

async function buildCards(
  slug: string,
  stage: Stage,
): Promise<ArtifactCard[]> {
  if (stage === "design-system") {
    // The design-system tick renders the living-specimen board (§6) directly
    // from the model's designSystem — BoardView special-cases it, no card here.
    return [];
  }

  if (stage === "build") {
    // The build tick terminates in the live prototype frames (§9) — BoardView
    // special-cases it from the model's prototype info, no card here.
    return [];
  }

  const outputs = await getStageOutput(slug, stage);
  // A root doc (What's Worth Building, the ledger) can be a stage output for the
  // marker/ran logic, but it is surfaced in the PROJECT group with its own
  // designed pane, so it never doubles as a plain reader card here.
  return outputs
    .filter((o) => !isRootDocFile(o.file))
    .map((o, i) => ({
      id: `card-${stage}-${i}`,
      file: o.file,
      title: cardTitle(o.file),
      kind: "artifact" as const,
      blocks: o.blocks,
    }));
}

const ROOT_DOC_BASENAMES = new Set(
  ROOT_DOCS.flatMap((r) => r.files).map((f) => f.toLowerCase()),
);
function isRootDocFile(file: string): boolean {
  return ROOT_DOC_BASENAMES.has((file.split("/").pop() ?? file).toLowerCase());
}

function cardTitle(file: string): string {
  const base = file.split("/").pop() ?? file;
  return base.replace(/\.md$/, "").replace(/^\d+\s*/, "").trim() || base;
}

function markerState(
  stage: Stage,
  project: Project,
  pipeline: StageState[],
  outputsPresent: Stage[],
): StageMarkerState {
  if (project.stage === stage) return "current";
  const ps = pipeline.find((p) => p.stage === stage);
  if (ps) {
    if (ps.state === "skipped") return "skipped";
    if (ps.state === "ran" || ps.state === "derived") return "ran";
    if (ps.state === "pending") return "pending";
  }
  if (outputsPresent.includes(stage)) return "ran";
  return "pending";
}

function buildHeader(
  project: Project,
  dashboardBlocks: import("./types").RenderableBlock[],
  dashboardBody: string,
): BoardHeader {
  const sections = splitByH2(dashboardBlocks);

  const overridesSection = findSection(sections, "overrides");
  const overrides = overridesSection
    ? overridesSection.blocks
        .filter((b) => b.kind === "bulleted_list_item")
        .map((b) => blockText(b).trim())
        .filter(Boolean)
    : [];

  const nextSection = findSection(sections, "next step", "recommended next", "next");
  let nextStep: string | null = null;
  if (nextSection) {
    const first = nextSection.blocks.find(
      (b) => b.kind === "paragraph" || b.kind === "bulleted_list_item",
    );
    nextStep = first ? blockText(first).trim() || null : null;
  }

  // The Understand loop writes its status in the closed colon grammar as a
  // "Current stage:" line; parse it from the raw body (the authoritative source).
  const rawStatus = findStatusLine(dashboardBody);
  const loop = rawStatus ? parseLoopStatus(rawStatus) : null;

  // A human-readable status for the sidebar: a phrase from the parsed loop when
  // present, else the lead sentence of any "## Current stage" prose section.
  let statusLine = loop ? loopSummary(loop) : null;
  if (!statusLine) {
    const stageSection = findSection(sections, "current stage", "current");
    if (stageSection) {
      const para = stageSection.blocks.find((b) => b.kind === "paragraph");
      const text = para ? blockText(para).trim() : "";
      if (text) {
        const lead = text.split(/\.\s/)[0].replace(/\.$/, "").trim();
        statusLine = lead.length > 90 ? `${lead.slice(0, 89)}…` : lead || null;
      }
    }
  }

  return { currentStage: project.stage, nextStep, overrides, statusLine, loop };
}

/** A short human phrase for a parsed loop status (the sidebar sub-header). */
function loopSummary(loop: import("./types").LoopStatus): string | null {
  if (!loop.state) return null;
  const r = loop.round != null ? ` round ${loop.round}` : "";
  switch (loop.terminal) {
    case "converged-humans-needed": {
      const n = loop.reviewCount ?? loop.agendaCount;
      return `Ready for review${n != null ? `, ${n} for you` : ""}`;
    }
    case "converged-complete":
      return "Ready for review, research converged";
    case "capped":
      return "Paused at the round cap";
    case "parked":
      return `Parked${loop.parkedOn ? `: ${loop.parkedOn}` : ""}`;
  }
  if (loop.state === "researching") return `Researching,${r || " running"}`.trim();
  if (loop.state === "seeded") return `Seeded${r}`;
  if (loop.state === "answers-ingested") return "Answers ingested";
  return null;
}
