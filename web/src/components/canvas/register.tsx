"use client";

import type { AssumptionNode } from "@/lib/types";
import { Reading } from "./markdown";
import { StateChip } from "./marks";

/**
 * The Assumptions & Risks register, rendered as a designed register (§4/§5):
 * each assumption carries its verified / partial / unverified / accepted state
 * in the §1 idiom (a mark + a word). Accepted-risk admissions are as visible as
 * any artifact. The rests_on edges + blast-radius highlighting are drawn in the
 * assumption-graph layer (slice 3); nodes carry stable ids for those edges.
 */
export function RegisterCard({
  assumptions,
  id,
  selectedId,
  onSelect,
  embedded,
}: {
  assumptions: AssumptionNode[];
  id: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /**
   * Render only the register list, no card-sheet chrome, for embedding inside
   * another surface (the WWB pane's Build input tab) that brings its own
   * section header. The default (card) path is unchanged.
   */
  embedded?: boolean;
}) {
  if (assumptions.length === 0) {
    if (embedded) {
      return <p className="text-[0.9375rem] italic text-ink-faint">No register yet.</p>;
    }
    return (
      <article id={id} className="card-sheet w-[34rem] max-w-[88vw] px-8 py-6">
        <p className="eyebrow mb-2">Assumptions &amp; Risks</p>
        <p className="text-[0.9375rem] italic text-ink-faint">No register yet.</p>
      </article>
    );
  }

  const list = (
      <ul className="space-y-4" data-testid="register">
        {assumptions.map((a) => {
          const selected = selectedId === a.id;
          const heading = (
            <>
              {embedded ? (
                <span className="mb-1 block text-panel-label font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Build checks this
                </span>
              ) : null}
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-mono text-[0.75rem] text-ink-faint">{a.id}</span>{" "}
                  <span
                    className={
                      embedded
                        ? "font-sans text-[1.125rem] font-semibold leading-snug text-ink"
                        : "font-sans text-[0.9375rem] font-semibold text-ink"
                    }
                  >
                    {a.title}
                  </span>
                </span>
                <StateChip state={a.state} />
              </span>
            </>
          );
          return (
            <li
              key={a.id}
              id={`assumption-${a.id}`}
              data-assumption={a.id}
              data-testid="register-entry"
              className={
                embedded
                  ? "rounded-inset border border-b-0 px-5 py-5 transition-colors"
                  : "rounded-inset border px-4 py-3 transition-colors"
              }
              style={{
                borderColor: selected ? "var(--accent)" : embedded ? "var(--rule-strong)" : "var(--rule)",
                background: selected ? "var(--accent-wash)" : embedded ? "var(--paper)" : "transparent",
              }}
            >
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(selected ? null : a.id)}
                  className="w-full text-left"
                  aria-pressed={selected}
                >
                  {heading}
                </button>
              ) : (
                <div>{heading}</div>
              )}

              <div className="mt-1.5 flex flex-wrap gap-2">
                {a.riskiest ? (
                  <span className="rounded-pill border border-accent px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-accent">
                    Riskiest load-bearing
                  </span>
                ) : null}
                {a.accepted ? (
                  <span
                    className="rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                    style={{ border: "1px solid var(--accepted)", color: "var(--accepted)" }}
                  >
                    Accepted risk
                  </span>
                ) : null}
                {a.dependents.length ? (
                  <span className="text-[0.75rem] text-ink-faint">
                    {a.dependents.length} decision{a.dependents.length > 1 ? "s" : ""} rest on this
                  </span>
                ) : null}
              </div>

              {embedded ? (
                <details className="mt-3" data-testid="register-evidence">
                  <summary className="text-panel-body font-medium text-ink-muted">Show the evidence</summary>
                  <div className="mt-2.5">
                    <Reading blocks={a.blocks} />
                  </div>
                </details>
              ) : (
                <div className="mt-2.5">
                  <Reading blocks={a.blocks} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
  );

  if (embedded) {
    return <div id={id}>{list}</div>;
  }

  return (
    <article id={id} className="card-sheet w-[38rem] max-w-[88vw] px-8 py-6" data-card-kind="register">
      <p className="eyebrow mb-1">Assumptions &amp; Risks</p>
      <p className="mb-5 text-[0.8125rem] text-ink-faint">
        Before trusting a decision, see what it stands on.
      </p>
      {list}
    </article>
  );
}
