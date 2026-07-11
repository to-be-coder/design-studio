"use client";

import type { DesignTokens } from "@/lib/types";
import { componentSpecs } from "@/lib/tokens";
import { useFrames } from "./frames-context";
import { useSession } from "./session-context";
import { ComponentSpecimen } from "./design-system-board";
import { flashComponent } from "./frame-dom";

/**
 * The component board (§7): the app's reusability map. One cell per DESIGN.md
 * `components` entry, rendered as a live specimen from its token bag in every
 * state variant, and — beneath it — its REAL instances harvested from the loaded
 * frames' DOMs (data-component / test-id, class-signature fallback) with live
 * counts + routes, each click-to-fly to the frame and flash. Recurring DOM
 * signatures that match no component (3+ routes) surface in an "uncodified" row —
 * a reusable unit that exists in code but not the contract, made visible and
 * exportable as an additive DESIGN.md proposal (§6). The scope selector (§11) and
 * export routing (§12) read their instance counts from this same scan.
 */
export function ComponentBoard({
  tokens,
  id,
  onFly,
}: {
  tokens: DesignTokens;
  id: string;
  onFly?: (regionId: string) => void;
}) {
  const specs = componentSpecs(tokens);
  const { componentStats, uncodified, addProposal, proposals } = useSession();
  const { frames } = useFrames();

  if (specs.length === 0) {
    return (
      <article id={id} className="card-sheet w-[28rem] max-w-[88vw] px-8 py-6" data-card-kind="component-board">
        <p className="eyebrow mb-2">Component board</p>
        <p className="text-[0.9375rem] italic text-ink-faint">
          No components in the prototype&rsquo;s DESIGN.md yet.
        </p>
      </article>
    );
  }

  const inspect = (base: string) => {
    onFly?.("region-build");
    // After the fly + lazy remount settle, flash the instances in each frame.
    setTimeout(() => {
      for (const f of frames) {
        const doc = f.el.contentDocument;
        if (doc) flashComponent(doc, base);
      }
    }, 480);
  };

  return (
    <article
      id={id}
      className="card-sheet w-[42rem] max-w-[92vw] px-8 py-7"
      data-card-kind="component-board"
      data-testid="component-board"
    >
      <header className="mb-5">
        <p className="eyebrow mb-1">Component board · the reusability map</p>
        <p className="text-[0.8125rem] text-ink-faint">
          Every reusable unit, with its live instances across the running frames.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {specs.map((c) => {
          const stat = componentStats[c.base];
          const count = stat?.count ?? 0;
          const routeCount = stat?.routes.length ?? 0;
          return (
            <div key={c.base} data-testid="component-cell" data-component-name={c.base}>
              <ComponentSpecimen base={c.base} variants={c.variants} />
              <button
                type="button"
                onClick={() => inspect(c.base)}
                data-testid="component-instances"
                className="mt-1.5 flex w-full items-center gap-1.5 rounded-inset px-1 text-left text-[0.8125rem] transition-colors hover:text-accent"
                title="Fly to the frames and flash instances"
              >
                <span className="font-semibold text-ink">{c.base}</span>
                <span className="text-ink-muted">
                  · <span data-testid="instance-count">{count}</span> instance{count === 1 ? "" : "s"} ·{" "}
                  {routeCount} route{routeCount === 1 ? "" : "s"}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Uncodified — recurring signatures with no DESIGN.md component (3+ routes). */}
      <div className="mt-6 border-t border-rule pt-5">
        <p className="eyebrow mb-1 text-ink">Uncodified</p>
        <p className="mb-3 text-[0.75rem] text-ink-faint">
          Recurring markup on 3+ routes that matches no component — drift waiting to happen.
        </p>
        {uncodified.length === 0 ? (
          <p className="text-[0.8125rem] italic text-ink-faint" data-testid="uncodified-empty">
            None yet — visit more routes to accumulate the scan.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="uncodified-list">
            {uncodified.map((u) => {
              const proposed = proposals.some((p) => p.tokenPath === `components.${sigName(u.sig)}`);
              return (
                <li
                  key={u.sig}
                  data-testid="uncodified-row"
                  className="flex items-center justify-between gap-3 rounded-inset border border-rule px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-[0.8125rem] text-ink">{u.sig}</span>
                    <span className="ml-2 text-[0.75rem] text-ink-muted">{u.routes.length} routes</span>
                  </span>
                  {proposed ? (
                    <span className="text-[0.6875rem] text-ink-faint" data-testid="uncodified-proposed">
                      proposed
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="promote-uncodified"
                      onClick={() =>
                        addProposal({
                          tokenPath: `components.${sigName(u.sig)}`,
                          current: "(uncodified — exists in code, not in DESIGN.md)",
                          proposed: u.sig,
                          affectedPairs: [],
                          reshaping: false,
                          note: `Promote the recurring "${u.sig}" signature (${u.routes.length} routes) into the components group.`,
                        })
                      }
                      className="shrink-0 rounded-pill border border-rule px-2 py-0.5 text-[0.6875rem] text-ink-muted hover:text-accent"
                    >
                      Propose
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}

/** A stable component name from a class signature, e.g. "div.stat-tile" → "statTile". */
function sigName(sig: string): string {
  const cls = sig.split(".").slice(1).join("-") || sig;
  return cls.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}
