"use client";

import type { DecisionStreamEntry } from "@/lib/types";
import { STAGES } from "@/lib/schema";
import type { RestsOnState, StreamFilter } from "./canvas";
import { Reading } from "./markdown";
import { Swatch } from "./marks";
import { assumptionColorVar, assumptionFill, assumptionLabel, stageName } from "./util";

const SCAFFOLD_STAGES = new Set<string>(
  STAGES.filter((s) => s.autonomy === "scaffold").map((s) => s.stage),
);

function leadingId(ref: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/^\s*(\S+)/);
  return m ? m[1] : null;
}

const FILTERS: { key: StreamFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live only" },
  { key: "scaffold", label: "You-decide only" },
];

/**
 * The Decision Stream: all Decisions/*.md merged into ONE continuous
 * chronological page — the board's centerpiece, not ninety file tiles.
 * In-their-words quotes get pull-quote treatment; authored_by is shown plainly;
 * superseded entries stay in place, visibly retired. Supersede connectors, the
 * rests_on edges, the filter, and blast-radius highlighting are drawn by the
 * graph layer (slice 3); this renders the readable entries + their anchors.
 */
export function DecisionStream({
  entries,
  id,
  highlighted,
  registerHref,
  restsOnState,
  filter = "all",
  onFilter,
}: {
  entries: DecisionStreamEntry[];
  id: string;
  highlighted?: Set<string> | null;
  registerHref?: (assumptionId: string) => void;
  restsOnState?: Record<string, RestsOnState>;
  filter?: StreamFilter;
  onFilter?: (f: StreamFilter) => void;
}) {
  const shown = entries.filter((e) => {
    if (filter === "live") return e.status !== "superseded";
    if (filter === "scaffold") return e.stage != null && SCAFFOLD_STAGES.has(e.stage);
    return true;
  });

  return (
    <article id={id} className="card-sheet w-[52rem] max-w-[92vw] px-8 py-7" data-card-kind="decision-stream">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">The decision stream</p>
          <p className="text-[0.8125rem] text-ink-faint">
            Every decision, in order. Loop-backs stay visible — the real path is the point.
          </p>
        </div>
        <div className="flex gap-1 rounded-pill border border-rule p-0.5" role="group" aria-label="Filter decisions" data-testid="stream-filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter?.(f.key)}
              aria-pressed={filter === f.key}
              className="rounded-pill px-2.5 py-1 text-[0.75rem] transition-colors"
              style={{
                background: filter === f.key ? "var(--accent-wash)" : "transparent",
                color: filter === f.key ? "var(--accent)" : "var(--ink-muted)",
                fontWeight: filter === f.key ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-[0.9375rem] italic text-ink-faint">No decisions match this filter.</p>
      ) : (
        <ol data-testid="decision-stream" className="space-y-7">
          {shown.map((e) => {
            const retired = e.status === "superseded";
            const isHot = highlighted?.has(e.id) ?? false;
            const supersedesId = leadingId(e.supersedes);
            const supersededById = leadingId(e.supersededBy);
            return (
              <li
                key={e.id}
                id={`d-${e.id}`}
                data-decision={e.id}
                data-highlighted={isHot ? "true" : undefined}
                data-superseded={retired ? "true" : undefined}
                className="scroll-mt-8 rounded-card px-5 py-4 transition-colors"
                style={{
                  background: isHot
                    ? "var(--accent-wash)"
                    : retired
                      ? "var(--paper-raised)"
                      : "transparent",
                  border: isHot ? "1px solid var(--accent-edge)" : "1px solid var(--rule)",
                  opacity: retired && !isHot ? 0.82 : 1,
                }}
              >
                <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[0.8125rem] text-ink-faint">{e.id}</span>
                  <h4
                    className={
                      "font-sans text-[1rem] font-semibold text-ink " +
                      (retired ? "line-through decoration-ink-faint/60" : "")
                    }
                  >
                    {e.title}
                  </h4>
                  {e.stage ? <span className="eyebrow">{stageName(e.stage)}</span> : null}
                  <StatusWord status={e.status} />
                  {e.authoredBy ? (
                    <span className="text-[0.75rem] text-ink-faint">by {e.authoredBy}</span>
                  ) : null}
                  {e.date ? <span className="text-[0.75rem] text-ink-faint">{e.date}</span> : null}
                </header>

                {/* rests_on — a marginal link to the assumption it stands on,
                    carrying that assumption's state so an unverified support
                    renders the decision visibly at-risk. */}
                {e.restsOnId ? (
                  <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-ink-faint">
                    Rests on{" "}
                    <button
                      type="button"
                      onClick={() => registerHref?.(e.restsOnId!)}
                      className="font-mono text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    >
                      {e.restsOnId}
                    </button>
                    {(() => {
                      const r = restsOnState?.[e.id];
                      if (!r) return null;
                      const atRisk = r.state === "unverified" || r.state === "partial";
                      return (
                        <span className="inline-flex items-center gap-1" data-testid={atRisk ? "at-risk" : undefined}>
                          <Swatch fill={assumptionFill(r.state)} color={assumptionColorVar(r.state)} size={8} />
                          <span style={{ color: assumptionColorVar(r.state) }}>
                            {assumptionLabel(r.state)}
                          </span>
                          {atRisk ? <span className="font-semibold text-unverified">· at risk</span> : null}
                        </span>
                      );
                    })()}
                  </p>
                ) : null}

                {e.inTheirWords ? (
                  <blockquote
                    data-testid="in-their-words"
                    className="my-3 rounded-inset bg-paper-raised px-5 py-3 font-serif text-[1.2rem] italic leading-snug text-ink"
                  >
                    <span aria-hidden className="mr-1 text-ink-faint">
                      &ldquo;
                    </span>
                    {e.inTheirWords}
                    <span aria-hidden className="ml-1 text-ink-faint">
                      &rdquo;
                    </span>
                    <footer className="mt-1.5 text-[0.6875rem] font-semibold uppercase not-italic tracking-[0.1em] text-ink-faint">
                      In their words
                    </footer>
                  </blockquote>
                ) : null}

                <div className="max-w-[34rem]">
                  <Reading blocks={e.blocks} />
                </div>

                {(supersedesId || supersededById) && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-faint">
                    {supersedesId ? (
                      <a href={`#d-${supersedesId}`} className="text-accent hover:underline">
                        supersedes {supersedesId} ↑
                      </a>
                    ) : null}
                    {supersededById ? (
                      <a href={`#d-${supersededById}`} className="text-accent hover:underline">
                        superseded by {supersededById} ↓
                      </a>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}

function StatusWord({ status }: { status: DecisionStreamEntry["status"] }) {
  if (!status) return null;
  const retired = status === "superseded";
  return (
    <span
      className="rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
      style={{
        border: `1px solid ${retired ? "var(--rule-strong)" : "var(--accent-edge)"}`,
        color: retired ? "var(--ink-faint)" : "var(--accent)",
      }}
    >
      {status}
    </span>
  );
}
