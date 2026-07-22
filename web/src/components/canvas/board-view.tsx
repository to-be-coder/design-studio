"use client";

import { memo, type RefObject } from "react";
import type { BoardModel, SpineStage } from "@/lib/types";
import type { RestsOnState, StreamFilter } from "./canvas";
import { ArtifactCard } from "./artifact-card";
import { DesignSystemBoard } from "./design-system-board";
import { ComponentBoard } from "./component-board";
import { PrototypeFrames } from "./prototype-frames";
import { DecisionStream } from "./decision-stream";
import type { RenderableBlock } from "@/lib/types";
import { Connectors } from "./connectors";
import { stageName } from "./util";

export interface BoardViewProps {
  model: BoardModel;
  worldRef?: RefObject<HTMLDivElement | null>;
  selectedAssumption?: string | null;
  onSelectAssumption?: (id: string | null) => void;
  highlightedDecisions?: Set<string> | null;
  restsOnState?: Record<string, RestsOnState>;
  filter?: StreamFilter;
  onFilter?: (f: StreamFilter) => void;
  expanded?: Set<string>;
  onToggleExpand?: (id: string) => void;
  /** Live in-place card overrides (§0): cardId → freshly-fetched blocks. */
  liveCards?: Record<string, RenderableBlock[]>;
  /** Fly the canvas to a region (component board → frames click-to-fly). */
  onFly?: (regionId: string) => void;
  /**
   * Which single board to show (§ focus mode): a stage token or
   * "decision-stream". One board per sidebar item — so clicking Debrief shows
   * only Debrief, not the whole scrolling flow.
   */
  focused?: string;
}

/**
 * The canvas geometry — one board in focus (§ focus mode). The chosen sidebar
 * item renders in isolation (a single stage's row, or the Decision Stream) with
 * a small phase/stage header. This is one world container; slice 4 pans and
 * zooms it as a unit.
 */
export const BoardView = memo(function BoardView({
  model,
  worldRef,
  selectedAssumption,
  onSelectAssumption,
  highlightedDecisions,
  restsOnState,
  filter = "all",
  onFilter,
  expanded,
  onToggleExpand,
  liveCards,
  onFly,
  focused = "debrief",
}: BoardViewProps) {
  return (
    <div ref={worldRef} data-testid="canvas-world" className="relative flex w-max flex-col gap-6 p-16" style={{ transformOrigin: "0 0", willChange: "transform" }}>
      {/* Connectors skip any edge whose endpoint isn't on screen, so this is
          safe in focus mode: the decision stream's own supersede chains draw,
          cross-stage rests_on edges cleanly no-op. */}
      {worldRef ? (
        <Connectors
          worldRef={worldRef}
          model={model}
          selectedAssumption={selectedAssumption ?? null}
        />
      ) : null}

      <FocusedBoard
        focused={focused}
        model={model}
        worldRef={worldRef}
        selectedAssumption={selectedAssumption}
        onSelectAssumption={onSelectAssumption}
        highlightedDecisions={highlightedDecisions}
        restsOnState={restsOnState}
        filter={filter}
        onFilter={onFilter}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        liveCards={liveCards}
        onFly={onFly}
      />
    </div>
  );
});

/**
 * One board, isolated (§ focus mode). Renders exactly the chosen sidebar item —
 * a single stage's row, or the Decision Stream — with a small phase/stage
 * header, and nothing else. The connectors overlay is off here (its cross-stage
 * targets aren't on screen); a board's own internal edges (the decision stream's
 * supersede chains) draw within DecisionStream.
 */
function FocusedBoard({
  focused,
  model,
  selectedAssumption,
  onSelectAssumption,
  highlightedDecisions,
  restsOnState,
  filter,
  onFilter,
  expanded,
  onToggleExpand,
  liveCards,
  onFly,
}: {
  focused: string;
  model: BoardModel;
  worldRef?: RefObject<HTMLDivElement | null>;
  selectedAssumption?: string | null;
  onSelectAssumption?: (id: string | null) => void;
  highlightedDecisions?: Set<string> | null;
  restsOnState?: Record<string, RestsOnState>;
  filter?: StreamFilter;
  onFilter?: (f: StreamFilter) => void;
  expanded?: Set<string>;
  onToggleExpand?: (id: string) => void;
  liveCards?: Record<string, RenderableBlock[]>;
  onFly?: (regionId: string) => void;
}) {
  if (focused === "decision-stream") {
    return (
      <section className="relative z-10 ml-2" data-focused-board="decision-stream">
        <DecisionStream
          entries={model.decisionStream}
          id="region-decision-stream"
          highlighted={highlightedDecisions}
          registerHref={(aid) => onSelectAssumption?.(aid)}
          restsOnState={restsOnState}
          filter={filter}
          onFilter={onFilter}
        />
      </section>
    );
  }
  const stage = model.stages.find((s) => s.stage === focused);
  if (!stage) {
    return <p className="ml-2 text-ink-muted">No such stage.</p>;
  }
  return (
    <section className="relative z-10 ml-2" data-focused-board={stage.stage}>
      <StageRow
        stage={stage}
        model={model}
        onSelectAssumption={onSelectAssumption}
        selectedAssumption={selectedAssumption}
        highlightedDecisions={highlightedDecisions}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        liveCards={liveCards}
        onFly={onFly}
      />
    </section>
  );
}

function StageRow({
  stage,
  model,
  selectedAssumption,
  onSelectAssumption,
  highlightedDecisions,
  expanded,
  onToggleExpand,
  liveCards,
  onFly,
}: {
  stage: SpineStage;
  model: BoardModel;
  selectedAssumption?: string | null;
  onSelectAssumption?: (id: string | null) => void;
  highlightedDecisions?: Set<string> | null;
  expanded?: Set<string>;
  onToggleExpand?: (id: string) => void;
  liveCards?: Record<string, RenderableBlock[]>;
  onFly?: (regionId: string) => void;
}) {
  const label = stageName(stage.stage);
  const hasBuildOutput =
    model.prototype.skeletonSource !== "structure" &&
    (model.prototype.runnable || model.prototype.embeddable);
  return (
    <div id={stage.regionId} className="relative mb-16 flex w-max scroll-mt-8 items-start gap-10">
      <div className="flex items-start gap-12">
        {stage.stage === "design-system" ? (
          <DesignSystemBoard model={model.designSystem} prototype={model.prototype} id="design-system-board" />
        ) : stage.stage === "structure" ? (
          // Structure terminates in the scaffolded skeleton's device frames (same
          // idiom as build). When no repo exists yet the CTA overlay owns the
          // empty state, so render nothing here.
          model.prototype.repoPresent ? (
            <PrototypeFrames prototype={model.prototype} id="structure-frames-region" />
          ) : null
        ) : stage.stage === "build" ? (
          <>
            <BuildOutputGuide
              routeCount={model.prototype.routes.length || 1}
              hasBuildOutput={hasBuildOutput}
              showsComponentCheck={hasBuildOutput && model.prototype.interactive && model.prototype.hasTokens}
            />
            <PrototypeFrames prototype={model.prototype} id="prototype-frames-region" requireBuilt />
            {/* The component board lives with the frames it scans: its instance
                counts are harvested from the loaded prototype DOMs, so isolating
                Build keeps frames + inventory together (§ focus mode / §7). */}
            {hasBuildOutput && model.prototype.interactive && model.prototype.hasTokens ? (
              <ComponentBoard tokens={model.tokens} id="component-board" onFly={onFly} />
            ) : null}
          </>
        ) : (
          stage.cards.map((c) => (
            <ArtifactCard
              key={c.id}
              card={c}
              slug={model.project.slug}
              stageLabel={label}
              liveBlocks={liveCards?.[c.id]}
              expanded={onToggleExpand ? expanded?.has(c.id) ?? false : undefined}
              onToggleExpand={onToggleExpand ? () => onToggleExpand(c.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BuildOutputGuide({
  routeCount,
  hasBuildOutput,
  showsComponentCheck,
}: {
  routeCount: number;
  hasBuildOutput: boolean;
  showsComponentCheck: boolean;
}) {
  return (
    <article
      className="card-sheet w-[34rem] max-w-[88vw] px-8 py-7"
      data-card-kind="build-guide"
      data-testid="build-output-guide"
    >
      <p className="eyebrow mb-2">Build output</p>
      <h3 className="font-serif text-[1.6rem] font-semibold leading-tight text-ink">
        Review the product in two passes
      </h3>
      <p className="mt-3 max-w-[30rem] text-panel-body leading-relaxed text-ink-muted">
        Start with the working pages. Then check whether the same interface pieces stay consistent across them.
      </p>

      <ol className="mt-6 space-y-3">
        <li className="rounded-inset border border-rule-strong bg-paper-raised px-4 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-sans text-[1.125rem] font-semibold text-ink">01&nbsp; Live product</p>
            <span className="text-panel-body tabular-nums text-ink-faint">
              {hasBuildOutput ? `${routeCount} ${routeCount === 1 ? "page" : "pages"}` : "Waiting for build"}
            </span>
          </div>
          <p className="mt-1 text-panel-body leading-relaxed text-ink-muted">
            {hasBuildOutput
              ? "Open each page and test the real, clickable result."
              : "The Structure skeleton is ready. Build has not produced the working prototype yet."}
          </p>
        </li>
        <li className="rounded-inset border border-rule-strong bg-paper-raised px-4 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-sans text-[1.125rem] font-semibold text-ink">02&nbsp; UI consistency</p>
            <span className="text-panel-body text-ink-faint">
              {showsComponentCheck ? "Ready" : "Starts after build"}
            </span>
          </div>
          <p className="mt-1 text-panel-body leading-relaxed text-ink-muted">
            {showsComponentCheck
              ? "Find reused components and repeated UI that is missing from the design system."
              : "Once the prototype is running, this checks component reuse across its pages."}
          </p>
        </li>
      </ol>
    </article>
  );
}
