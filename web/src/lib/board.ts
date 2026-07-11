import { cache } from "react";
import { STAGES } from "./schema";
import {
  getProject,
  getStageOutput,
  listDecisions,
  projectFileExists,
} from "./vault";
import { getFraming } from "./brief";
import { getAssumptions, restsOnMatches } from "./assumptions";
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
  const { project, dashboardBlocks, pipeline, decisions, outputsPresent } = detail;

  const config = await resolvePrototypeConfig(slug, project.prototypeRepo);
  const [framing, assumptions, designSystem, tokens] = await Promise.all([
    getFraming(slug),
    getAssumptions(slug),
    getDesignSystem(slug, config.repo),
    getDesignTokens(slug, config.repo),
  ]);

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
      const isDecisionStage = def.stage === "reframe" || def.stage === "converge";
      const decisionSlice = decisions
        .filter((d) => d.stage === def.stage)
        .map((d) => d.id);
      const cards = await buildCards(slug, def.stage, isDecisionStage);
      return {
        stage: def.stage,
        skill: def.skill,
        phase: def.phase,
        autonomy: def.autonomy,
        blurb: def.blurb,
        gate: def.gate ?? null,
        regionId: `region-${def.stage}`,
        markerState: markerState(def.stage, project, pipeline, outputsPresent),
        isDecisionStage,
        cards,
        framing: def.stage === "debrief" ? framing : null,
        decisionSlice,
      };
    }),
  );

  return {
    project,
    header: buildHeader(project, dashboardBlocks),
    phases: ["Understand", "Decide", "Build"],
    stages,
    decisionStream,
    assumptions,
    designSystem,
    prototype,
    tokens,
  };
});

async function buildCards(
  slug: string,
  stage: Stage,
  isDecisionStage: boolean,
): Promise<ArtifactCard[]> {
  // Decision stages render as a slice of the stream — no artifact cards.
  if (isDecisionStage) return [];

  if (stage === "verify") {
    // The register expands into the assumption graph; its card is synthesised
    // from the parsed nodes, so no generic artifact card here.
    return [];
  }

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
  return outputs.map((o, i) => ({
    id: `card-${stage}-${i}`,
    file: o.file,
    title: cardTitle(o.file),
    kind: "artifact" as const,
    blocks: o.blocks,
  }));
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

  return { currentStage: project.stage, nextStep, overrides };
}
