"use client";

import type { DecisionStreamEntry } from "@/lib/types";
import { Reading } from "./markdown";
import { stageName } from "./util";

function leadingId(ref: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/^\s*(\S+)/);
  return m ? m[1] : null;
}

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
}: {
  entries: DecisionStreamEntry[];
  id: string;
  highlighted?: Set<string> | null;
  registerHref?: (assumptionId: string) => void;
}) {
  return (
    <article id={id} className="card-sheet w-[52rem] max-w-[92vw] px-8 py-7" data-card-kind="decision-stream">
      <p className="eyebrow mb-1">The decision stream</p>
      <p className="mb-6 text-[0.8125rem] text-ink-faint">
        Every decision, in order. Loop-backs stay visible — the real path is the point.
      </p>

      {entries.length === 0 ? (
        <p className="text-[0.9375rem] italic text-ink-faint">No decisions recorded yet.</p>
      ) : (
        <ol data-testid="decision-stream" className="space-y-7">
          {entries.map((e) => {
            const retired = e.status === "superseded";
            const isHot = highlighted?.has(e.id) ?? false;
            const supersedesId = leadingId(e.supersedes);
            const supersededById = leadingId(e.supersededBy);
            return (
              <li
                key={e.id}
                id={`d-${e.id}`}
                data-decision={e.id}
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

                {/* rests_on — a marginal link to the assumption it stands on. */}
                {e.restsOnId ? (
                  <p className="mb-2 text-[0.75rem] text-ink-faint">
                    Rests on{" "}
                    <button
                      type="button"
                      onClick={() => registerHref?.(e.restsOnId!)}
                      className="font-mono text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    >
                      {e.restsOnId}
                    </button>
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
