import type { BoardModel, RenderableBlock } from "@/lib/types";
import { Reading } from "./markdown";
import { RegisterCard } from "./register";
import { WwbPane } from "./wwb-pane";
import { LedgerPane } from "./ledger-pane";
import { DecisionStreamPane } from "./decision-stream";

/** Interaction context threaded from the canvas into the reading-pane bodies. */
export interface DocCtx {
  slug: string;
  runsEnabled?: boolean;
  onFocusReceipt?: (docKey: string) => void;
  /** Bump the status poll after a review submission spawns the recorder. */
  onRunStarted?: () => void;
}

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
};

/**
 * The documents of a doc-mode focus (debrief + research stages, or a project
 * root doc). Shared by the sidebar (which folds stage documents in as an
 * accordion) and the reading pane (which renders the selected one). Non-doc
 * focuses → []. `ctx` carries interaction wiring for the interactive root-doc
 * panes; the sidebar calls without it (it reads labels only).
 */
export function buildSections(model: BoardModel, focused: string, ctx?: DocCtx): DocSection[] {
  if (focused === "debrief") return debriefSections(model);
  if (focused === "research") return researchSections(model);
  // `agenda` is a kept focus alias (old deep links): the review surface is now
  // the WWB pane, so it lands there.
  if (focused === "wwb" || focused === "agenda") return wwbSection(model, ctx);
  if (focused === "ledger") return ledgerSection(model, ctx);
  if (focused === "decision-stream") return decisionStreamSection(model);
  return [];
}

/** The decision stream, read off the canvas as a scrollable reading column. */
function decisionStreamSection(model: BoardModel): DocSection[] {
  return [
    {
      key: "decision-stream",
      label: "Decision stream",
      ownHeading: true,
      body: <DecisionStreamPane model={model} />,
    },
  ];
}

/** What's Worth Building, the hero root doc, and the single review surface. */
function wwbSection(model: BoardModel, ctx?: DocCtx): DocSection[] {
  const body = model.wwb ? (
    <WwbPane
      wwb={model.wwb}
      slug={model.project.slug}
      runsEnabled={ctx?.runsEnabled}
      onFocusReceipt={ctx?.onFocusReceipt}
      onRunStarted={ctx?.onRunStarted}
    />
  ) : (
    <p className="text-[0.9375rem] italic text-ink-faint">
      Not compiled yet. Research writes What&rsquo;s Worth Building once the loop has evidence.
    </p>
  );
  return [{ key: "wwb", label: "What's worth building", ownHeading: true, body }];
}

/** The knowns/unknowns ledger, in full (Questions for you → Open → Retired). */
function ledgerSection(model: BoardModel, ctx: DocCtx | undefined): DocSection[] {
  const body = model.ledger ? (
    <LedgerPane
      ledger={model.ledger}
      slug={model.project.slug}
      onFocusReceipt={ctx?.onFocusReceipt}
    />
  ) : (
    <p className="text-[0.9375rem] italic text-ink-faint">
      No ledger yet. Debrief seeds the knowns and unknowns; research works them.
    </p>
  );
  return [{ key: "ledger", label: "Knowns & unknowns", ownHeading: true, body }];
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
