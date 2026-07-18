"use client";

import { useMemo } from "react";
import type { BoardModel } from "@/lib/types";
import { buildSections, type DocCtx } from "./doc-sections";

/**
 * The document reading view (debrief + research). These two stages are prose —
 * a brief restated, success criteria, a synthesis, a risk register — so they
 * read best as documents, not as cards on a zoomable canvas. The contents list
 * lives in the sidebar now (folded in as an accordion under the stage); this is
 * purely the reading pane, showing exactly ONE selected document at a time —
 * the one the sidebar sub-row picked, defaulting to the first. The decision
 * stream reads here too (its own scrollable column); the build-phase stages stay
 * on the canvas. This is off it entirely.
 */
export function DocView({
  model,
  focused,
  selectedDoc,
  runsEnabled,
  onFocusReceipt,
  onRunStarted,
}: {
  model: BoardModel;
  focused: string;
  /** Which document the sidebar picked; null → the stage's first document. */
  selectedDoc: string | null;
  runsEnabled?: boolean;
  /** Focus a doc the canvas surfaces (a receipt click, an old agenda link). */
  onFocusReceipt?: (docKey: string) => void;
  /** Bump the status poll after a review submission spawns the recorder. */
  onRunStarted?: () => void;
}) {
  // A doc-mode focus is a debrief/research stage, a project root doc (`agenda`
  // is a kept alias landing on the WWB review surface), or the decision stream.
  const isStage = !!model.stages.find((s) => s.stage === focused);
  const isRootDoc = focused === "wwb" || focused === "ledger" || focused === "agenda";
  const isDecisionStream = focused === "decision-stream";
  const ctx = useMemo<DocCtx>(
    () => ({ slug: model.project.slug, runsEnabled, onFocusReceipt, onRunStarted }),
    [model.project.slug, runsEnabled, onFocusReceipt, onRunStarted],
  );
  const sections = useMemo(
    () => (isStage || isRootDoc || isDecisionStream ? buildSections(model, focused, ctx) : []),
    [model, focused, isStage, isRootDoc, isDecisionStream, ctx],
  );

  if (!isStage && !isRootDoc && !isDecisionStream) {
    return (
      <div className="flex h-full w-full items-center justify-center" data-testid="doc-view">
        <p className="text-ink-muted">No such document.</p>
      </div>
    );
  }

  const current = sections.find((s) => s.key === selectedDoc) ?? sections[0];

  return (
    <div
      data-testid="doc-view"
      data-doc-mode={focused}
      className="h-full w-full overflow-y-auto"
    >
      <div className="mx-auto max-w-[44rem] px-8 pb-24 pt-16 md:px-12">
        {current ? (
          <section
            id={`doc-${current.key}`}
            data-doc-key={current.key}
            data-testid="doc-section"
            className="scroll-mt-8"
          >
            {current.ownHeading ? null : (
              <div className="mb-4 flex items-center gap-1.5">
                <p className="panel-label">{current.label}</p>
                {current.about ? <AboutTip text={current.about} /> : null}
              </div>
            )}
            {current.body}
          </section>
        ) : (
          <p className="text-panel-body italic text-ink-faint">Nothing to show here yet.</p>
        )}
      </div>
    </div>
  );
}

/** An "i" by the document title; hover or focus reveals what the doc is for. */
function AboutTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="flex h-4 w-4 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-ink focus-visible:text-ink"
      >
        <InfoIcon />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-64 rounded-inset border border-rule bg-paper-raised px-3 py-2 text-panel-body font-normal normal-case leading-relaxed tracking-normal text-ink-muted opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
