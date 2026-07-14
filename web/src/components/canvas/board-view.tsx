"use client";

import { memo, type RefObject } from "react";
import type { BoardModel, Phase, SpineStage, StageMarkerState } from "@/lib/types";
import type { RestsOnState, StreamFilter } from "./canvas";
import { ArtifactCard } from "./artifact-card";
import { FramingPane } from "./framing-pane";
import { RegisterCard } from "./register";
import { DesignSystemBoard } from "./design-system-board";
import { ComponentBoard } from "./component-board";
import { PrototypeFrames } from "./prototype-frames";
import { DecisionStream } from "./decision-stream";
import type { RenderableBlock } from "@/lib/types";
import { Connectors } from "./connectors";
import { ProjectHeader } from "./header";
import { autonomyWord, markerLabel, stageName, stripDots } from "./util";

export interface BoardViewProps {
  model: BoardModel;
  worldRef?: RefObject<HTMLDivElement | null>;
  selectedAssumption?: string | null;
  onSelectAssumption?: (id: string | null) => void;
  highlightedDecisions?: Set<string> | null;
  restsOnState?: Record<string, RestsOnState>;
  filter?: StreamFilter;
  onFilter?: (f: StreamFilter) => void;
  hiddenStages?: Set<string>;
  hiddenPhases?: Set<Phase>;
  expanded?: Set<string>;
  onToggleExpand?: (id: string) => void;
  /** Live in-place card overrides (§0): cardId → freshly-fetched blocks. */
  liveCards?: Record<string, RenderableBlock[]>;
  /** Fly the canvas to a region (component board → frames click-to-fly). */
  onFly?: (regionId: string) => void;
  /**
   * Which single board to show (§ focus mode): a stage token, "decision-stream",
   * or "all" for the continuous comb. One board per sidebar item — so clicking
   * Debrief shows only Debrief, not the whole scrolling flow.
   */
  focused?: string;
}

/**
 * The canvas geometry — the journey as a comb (§3). A vertical spine (the three
 * phases as sections, each stage a marker) with artifact cards running
 * horizontally off each tick. Every stage appears, including skipped ones,
 * rendered honestly as "not run". This is one world container; slice 4 pans and
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
  hiddenStages,
  hiddenPhases,
  expanded,
  onToggleExpand,
  liveCards,
  onFly,
  focused = "all",
}: BoardViewProps) {
  const single = focused !== "all";
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

      <div className="relative z-10">
        <ProjectHeader project={model.project} header={model.header} />
      </div>

      {single ? (
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
      ) : (
        <>
          {model.phases
            .filter((phase) => !hiddenPhases?.has(phase))
            .map((phase) => (
              <PhaseSection
                key={phase}
                phase={phase}
                stages={model.stages.filter((s) => s.phase === phase && !hiddenStages?.has(s.stage))}
                model={model}
                selectedAssumption={selectedAssumption}
                onSelectAssumption={onSelectAssumption}
                highlightedDecisions={highlightedDecisions}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                liveCards={liveCards}
                onFly={onFly}
              />
            ))}
          {/* The Decision Stream is its own standalone section (no "Decide"
              phase since converge/explore-directions dissolved — decisions 0021/
              0023): it consolidates the whole log, made throughout the loop and
              build, not at a single stage. */}
          <DecisionStreamSection
            model={model}
            highlightedDecisions={highlightedDecisions}
            restsOnState={restsOnState}
            filter={filter}
            onFilter={onFilter}
            onSelectAssumption={onSelectAssumption}
          />
        </>
      )}
    </div>
  );
});

function DecisionStreamSection({
  model,
  highlightedDecisions,
  restsOnState,
  filter,
  onFilter,
  onSelectAssumption,
}: {
  model: BoardModel;
  highlightedDecisions?: Set<string> | null;
  restsOnState?: Record<string, RestsOnState>;
  filter?: StreamFilter;
  onFilter?: (f: StreamFilter) => void;
  onSelectAssumption?: (id: string | null) => void;
}) {
  return (
    <section className="relative z-10 ml-6 border-l border-rule pl-12" data-section="decisions">
      <h2 className="eyebrow mb-8 text-ink">Decisions</h2>
      <div className="relative mb-16 flex items-start gap-10">
        <Marker state="ran" />
        <div className="w-[13rem] shrink-0 pt-0.5">
          <p className="font-sans text-[1rem] font-semibold text-ink">Decision stream</p>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            The whole log consolidated into one readable page.
          </p>
        </div>
        <DecisionStream
          entries={model.decisionStream}
          id="region-decision-stream"
          highlighted={highlightedDecisions}
          registerHref={(aid) => onSelectAssumption?.(aid)}
          restsOnState={restsOnState}
          filter={filter}
          onFilter={onFilter}
        />
      </div>
    </section>
  );
}

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
        <h2 className="eyebrow mb-1 text-ink">Decisions</h2>
        <p className="mb-6 font-sans text-[1rem] font-semibold text-ink">Decision stream</p>
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
      <h2 className="eyebrow mb-6 text-ink">{stage.phase}</h2>
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

function PhaseSection({
  phase,
  stages,
  model,
  selectedAssumption,
  onSelectAssumption,
  highlightedDecisions,
  expanded,
  onToggleExpand,
  liveCards,
  onFly,
}: {
  phase: Phase;
  stages: SpineStage[];
  model: BoardModel;
  selectedAssumption?: string | null;
  onSelectAssumption?: (id: string | null) => void;
  highlightedDecisions?: Set<string> | null;
  expanded?: Set<string>;
  onToggleExpand?: (id: string) => void;
  liveCards?: Record<string, RenderableBlock[]>;
  onFly?: (regionId: string) => void;
}) {
  return (
    <section className="relative z-10 ml-6 border-l border-rule pl-12" data-phase={phase}>
      <h2 className="eyebrow mb-8 text-ink">{phase}</h2>

      {stages.map((s) => (
        <StageRow key={s.stage} stage={s} model={model} onSelectAssumption={onSelectAssumption} selectedAssumption={selectedAssumption} highlightedDecisions={highlightedDecisions} expanded={expanded} onToggleExpand={onToggleExpand} liveCards={liveCards} onFly={onFly} />
      ))}
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
  return (
    <div id={stage.regionId} className="relative mb-16 flex w-max scroll-mt-8 items-start gap-10">
      <Marker state={stage.markerState} />
      <StageMeta stage={stage} label={label} />
      <div className="flex items-start gap-12">
        {stage.stage === "debrief" && stage.framing ? (
          <>
            <FramingPane framing={stage.framing} id="region-framing" />
            {/* The framing pane already renders "01 Brief & Problem.md" in
                full; the loop's other outputs (Clarifications.md,
                Agreements.md) still need the generic artifact-card path. */}
            {stage.cards
              .filter((c) => c.file !== "01 Brief & Problem.md")
              .map((c) => (
                <ArtifactCard
                  key={c.id}
                  card={c}
                  slug={model.project.slug}
                  stageLabel={label}
                  liveBlocks={liveCards?.[c.id]}
                  expanded={onToggleExpand ? expanded?.has(c.id) ?? false : undefined}
                  onToggleExpand={onToggleExpand ? () => onToggleExpand(c.id) : undefined}
                />
              ))}
          </>
        ) : stage.stage === "research" ? (
          <>
            {/* Research owns the risk register (decision 0018: verify folded
                into research) — its pressure-test move updates the same
                Assumptions & Risks.md the register renders, so the register
                sits beside research's own artifact cards, not off on its own
                stage. */}
            {stage.cards.map((c) => (
              <ArtifactCard
                key={c.id}
                card={c}
                slug={model.project.slug}
                stageLabel={label}
                liveBlocks={liveCards?.[c.id]}
                expanded={onToggleExpand ? expanded?.has(c.id) ?? false : undefined}
                onToggleExpand={onToggleExpand ? () => onToggleExpand(c.id) : undefined}
              />
            ))}
            <RegisterCard
              assumptions={model.assumptions}
              id="region-assumptions"
              selectedId={selectedAssumption}
              onSelect={onSelectAssumption}
            />
          </>
        ) : stage.stage === "design-system" ? (
          <DesignSystemBoard model={model.designSystem} prototype={model.prototype} id="design-system-board" />
        ) : stage.stage === "build" ? (
          <>
            <PrototypeFrames prototype={model.prototype} id="prototype-frames-region" />
            {/* The component board lives with the frames it scans: its instance
                counts are harvested from the loaded prototype DOMs, so isolating
                Build keeps frames + inventory together (§ focus mode / §7). */}
            {model.prototype.interactive && model.prototype.hasTokens ? (
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

function StageMeta({ stage, label }: { stage: SpineStage; label: string }) {
  const state = stage.markerState;
  const titleColor =
    state === "current"
      ? "text-accent"
      : state === "skipped" || state === "pending"
        ? "text-ink-muted"
        : "text-ink";
  return (
    <div className="w-[13rem] shrink-0 pt-0.5">
      <p className={`font-sans text-[1rem] font-semibold ${titleColor}`}>{label}</p>
      <p className="mt-0.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {markerLabel(state)} · {autonomyWord(stage.autonomy)}
      </p>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{stripDots(stage.blurb)}</p>
      {stage.gate ? (
        <p className="mt-1.5 text-[0.75rem] italic leading-relaxed text-ink-faint">
          {stripDots(stage.gate)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A spine marker. Shape + fill carry stage state — never a colour dot (§1):
 * current (accent fill + glow), ran (ink fill), skipped (dashed hollow),
 * pending (solid hollow). Straddles the phase's left-border spine line.
 */
function Marker({ state }: { state: StageMarkerState }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: -55,
    top: 4,
    width: 14,
    height: 14,
    borderRadius: 9999,
  };
  if (state === "current") {
    style.background = "var(--accent)";
    style.boxShadow = "0 0 0 4px var(--accent-wash)";
  } else if (state === "ran") {
    style.background = "var(--ink)";
  } else if (state === "skipped") {
    style.background = "var(--desk)";
    style.border = "1.5px dashed var(--rule-strong)";
  } else {
    style.background = "var(--desk)";
    style.border = "1.5px solid var(--rule-strong)";
  }
  return <span style={style} aria-hidden />;
}
