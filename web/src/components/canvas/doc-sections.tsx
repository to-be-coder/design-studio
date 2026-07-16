import type { BoardModel, RenderableBlock } from "@/lib/types";
import { Reading } from "./markdown";
import { RegisterCard } from "./register";

/** One document in a doc-mode stage: a nav label and the body shown when picked. */
export interface DocSection {
  /** Slug used for the `doc-<key>` anchor id and the sidebar sub-row key. */
  key: string;
  /** Sidebar sub-row label + reading-pane eyebrow. */
  label: string;
  /** Rendered body. */
  body: React.ReactNode;
  /**
   * The register brings its own heading, so its doc suppresses the generic
   * eyebrow to avoid a doubled "Assumptions & Risks".
   */
  ownHeading?: boolean;
  /** One line on what this document is for — shown as a tooltip by the title. */
  about?: string;
}

/** What each debrief document is for (the reading-pane title tooltip). */
const DEBRIEF_ABOUT: Record<string, string> = {
  "original-brief":
    "The brief verbatim — exactly as it was handed over, before any interpretation.",
  "restated-problem":
    "The brief reframed from a task into a problem — what the whole project ladders back to.",
  "guiding-principle":
    "The one idea everything ladders back to — the north star that keeps decisions coherent.",
  "hidden-rubric":
    "The criteria you're really judged against but nobody said out loud, plus scope the wording quietly decided.",
  route: "The Full vs Lite path call, based on how ambiguous or net-new the brief is.",
  "success-outcome": "How you'd know it worked in the world, once shipped.",
  "success-signal":
    "The behaviour a prototype test can measure that would predict the shipped outcome.",
  "clarification-agenda": "The plain-language questions to take to your client or PM.",
  agreements:
    "The living ledger — what's agreed, decided against, deferred, and the full vision. Regenerated from the decision log.",
};

/**
 * The documents of a doc-mode stage (debrief + research), in reading order.
 * Shared by the sidebar (which folds them in as an accordion under the stage)
 * and the reading pane (which renders the selected one). Non-doc stages → [].
 */
export function buildSections(model: BoardModel, focused: string): DocSection[] {
  if (focused === "debrief") return debriefSections(model);
  if (focused === "research") return researchSections(model);
  return [];
}

/**
 * The debrief documents: the task → problem transformation and everything that
 * frames it — brief, restatement, the guiding principle set large, the hidden
 * rubric, the route call, both success registers, then any extra sections.
 * Absent parts are skipped, not stubbed.
 */
function debriefSections(model: BoardModel): DocSection[] {
  const framing = model.stages.find((s) => s.stage === "debrief")?.framing;
  if (!framing) return [];
  const out: DocSection[] = [];
  const prose = (key: string, label: string, blocks: RenderableBlock[] | null) => {
    if (blocks) out.push({ key, label, about: DEBRIEF_ABOUT[key], body: <Reading blocks={blocks} /> });
  };

  prose("original-brief", "Original brief", framing.originalBrief);
  prose("restated-problem", "Problem statement", framing.restatedProblem);
  if (framing.guidingPrinciple) {
    out.push({
      key: "guiding-principle",
      label: "Guiding principle",
      about: DEBRIEF_ABOUT["guiding-principle"],
      // Rendered at the same reading size as every other document — one
      // consistent type scale across the pane, not a one-off display line.
      body: (
        <div className="reading">
          <p>{framing.guidingPrinciple}</p>
        </div>
      ),
    });
  }
  prose("hidden-rubric", "Hidden rubric", framing.hiddenRubric);
  prose("route", "Route", framing.routeDecision);
  prose("success-outcome", "Shipped outcome", framing.successOutcome);
  prose("success-signal", "In-session signal", framing.successSignal);
  if (framing.clarifications) {
    out.push({
      key: "clarification-agenda",
      label: "Clarification agenda",
      about: DEBRIEF_ABOUT["clarification-agenda"],
      body: <Reading blocks={framing.clarifications} />,
    });
  }
  if (framing.agreements) {
    out.push({
      key: "agreements",
      label: "Agreements",
      about: DEBRIEF_ABOUT["agreements"],
      body: <Reading blocks={framing.agreements} />,
    });
  }
  framing.extras.forEach((extra, i) => {
    prose(`extra-${i}`, extra.title, extra.blocks);
  });
  return out;
}

/**
 * The research documents: each research artifact as its own document, then the
 * risk register — reusing the same register the canvas shows at
 * region-assumptions, so assumption ids and state marks stay identical.
 */
function researchSections(model: BoardModel): DocSection[] {
  const stage = model.stages.find((s) => s.stage === "research");
  const out: DocSection[] = [];
  for (const card of stage?.cards ?? []) {
    out.push({ key: card.id, label: card.title, body: <Reading blocks={card.blocks} /> });
  }
  out.push({
    key: "assumptions",
    label: "Assumptions & risks",
    ownHeading: true,
    body: <RegisterCard assumptions={model.assumptions} id="region-assumptions" />,
  });
  return out;
}
