"use client";

import type { FramingModel } from "@/lib/types";
import { Reading } from "./markdown";

/**
 * The framing pane — the board's opening view. The debrief's central move,
 * task → problem, is made *visible* by placing the original brief beside the
 * restated problem. Then the hidden rubric, the guiding principle set large,
 * success criteria in both registers, and the Full/Lite route decision.
 */
export function FramingPane({ framing, id }: { framing: FramingModel; id: string }) {
  return (
    <article id={id} className="card-sheet w-[64rem] max-w-[92vw] px-8 py-7" data-card-kind="framing">
      <p className="eyebrow mb-4">Debrief · the framing</p>

      {/* The transformation, made spatial: brief beside problem. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2" data-testid="framing-transform">
        <Facet label="Original brief" tone="muted" testid="facet-original">
          {framing.originalBrief ? (
            <Reading blocks={framing.originalBrief} />
          ) : (
            <Empty>No original brief recorded.</Empty>
          )}
        </Facet>
        <Facet label="Restated problem" tone="ink" testid="facet-restated">
          {framing.restatedProblem ? (
            <Reading blocks={framing.restatedProblem} />
          ) : (
            <Empty>No restated problem recorded.</Empty>
          )}
        </Facet>
      </div>

      {/*
        SPEC-CALL: §4 asks that selecting the guiding principle highlight every
        Decision Stream entry that cites it. Decisions cite the principle by
        prose ("ladders to the guiding principle"), not a structured field, so
        reliable citation detection needs a heuristic that risks false matches.
        Consistent with the spec's "assert what users see" principle, we render
        the principle prominently now and defer the click-to-highlight ladder to
        a later slice rather than ship an unreliable match. The blast-radius
        mechanism it would reuse (assumption → decisions) already ships (slice 3).
      */}
      {framing.guidingPrinciple ? (
        <div className="my-8 border-y border-rule py-7 text-center">
          <p className="eyebrow mb-3">Guiding principle</p>
          <p className="mx-auto max-w-3xl font-serif text-[2.4rem] font-normal leading-tight tracking-[-0.02em] text-ink">
            {framing.guidingPrinciple}
          </p>
          <p className="mt-3 text-[0.8125rem] text-ink-faint">Every decision&rsquo;s Why ladders to this.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-x-10 gap-y-7 md:grid-cols-2">
        {framing.hiddenRubric ? (
          <Facet label="Hidden rubric">
            <Reading blocks={framing.hiddenRubric} />
          </Facet>
        ) : null}
        {framing.routeDecision ? (
          <Facet label="Route — Full vs Lite">
            <Reading blocks={framing.routeDecision} />
          </Facet>
        ) : null}
        {framing.successOutcome ? (
          <Facet label="Success — shipped outcome">
            <Reading blocks={framing.successOutcome} />
          </Facet>
        ) : null}
        {framing.successSignal ? (
          <Facet label="Success — in-session signal">
            <Reading blocks={framing.successSignal} />
          </Facet>
        ) : null}
        {framing.extras.map((s, i) => (
          <Facet key={i} label={s.title}>
            <Reading blocks={s.blocks} />
          </Facet>
        ))}
      </div>
    </article>
  );
}

function Facet({
  label,
  tone = "ink",
  testid,
  children,
}: {
  label: string;
  tone?: "ink" | "muted";
  testid?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid={testid}
      className={
        tone === "muted"
          ? "rounded-inset bg-paper-raised px-5 py-4"
          : "rounded-inset border border-rule px-5 py-4"
      }
    >
      <p className="eyebrow mb-2.5">{label}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.9375rem] italic text-ink-faint">{children}</p>;
}
