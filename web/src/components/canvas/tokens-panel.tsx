"use client";

import type { DesignTokens } from "@/lib/types";
import { flattenScalars, type FlatToken } from "@/lib/tokens";
import { useSession } from "./session-context";
import { isRenderableCssValue } from "./frame-dom";

/**
 * Tokens mode (§13): the prototype's DESIGN.md, live. Every token — label, path,
 * swatch, editable value, per-token reset — and editing restyles every loaded
 * frame immediately (via the CSS-variable override the prototype is authored
 * against). Overrides persist in localStorage (unlike annotations); newly loaded
 * frames pick up current overrides. A visible banner keeps the honesty: this is
 * an experiment surface, not an edit path — real changes are DESIGN.md edits
 * (additive = growth, reshaping = a superseding decision).
 */
export function TokensPanel({ tokens }: { tokens: DesignTokens }) {
  const { overrides, setOverride, resetOverride, resetAllOverrides } = useSession();
  const scalars = flattenScalars(tokens);
  const groups: { name: string; tokens: FlatToken[] }[] = [
    { name: "Colors", tokens: scalars.filter((s) => s.group === "colors") },
    { name: "Spacing", tokens: scalars.filter((s) => s.group === "spacing") },
    { name: "Radii", tokens: scalars.filter((s) => s.group === "rounded") },
  ];
  const dirty = Object.keys(overrides).length;

  return (
    <aside
      className="absolute right-0 top-0 z-30 flex h-full w-[20rem] flex-col border-l border-rule bg-paper/97 backdrop-blur"
      data-testid="tokens-panel"
      aria-label="Tokens"
    >
      <div className="border-b border-rule px-4 py-3">
        <p className="eyebrow">Tokens · live</p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-faint" data-testid="tokens-banner">
          An experiment surface, not an edit path. Real token changes are DESIGN.md edits in the
          prototype repo — additive is growth, reshaping is a superseding decision.
        </p>
        {dirty ? (
          <button
            type="button"
            onClick={resetAllOverrides}
            data-testid="tokens-reset-all"
            className="mt-2 rounded-pill border border-rule px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
          >
            Reset all ({dirty})
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) =>
          g.tokens.length ? (
            <section key={g.name} className="mb-4">
              <p className="eyebrow mb-2 px-1 text-ink-muted">{g.name}</p>
              <ul className="space-y-1.5">
                {g.tokens.map((t) => {
                  const current = overrides[t.cssVar] ?? t.value;
                  const changed = overrides[t.cssVar] != null;
                  // A hand-typed value that isn't real CSS is flagged, not
                  // injected — the frame keeps its default (see setVar's guard).
                  const invalid = changed && !isRenderableCssValue(current);
                  return (
                    <li key={t.path} className="flex items-center gap-2" data-testid="token-row" data-token={t.path}>
                      {t.group === "colors" ? (
                        <span
                          className="h-5 w-5 shrink-0 rounded-[3px] border border-rule"
                          style={{ background: current }}
                          aria-hidden
                        />
                      ) : null}
                      <label className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[0.6875rem] text-ink-faint">{t.path}</span>
                        <input
                          value={current}
                          data-testid="token-input"
                          aria-invalid={invalid || undefined}
                          data-invalid={invalid ? "true" : undefined}
                          onChange={(e) => setOverride(t.cssVar, e.target.value)}
                          className="w-full rounded-inset border bg-paper-raised px-2 py-0.5 font-mono text-[0.75rem] text-ink"
                          style={{
                            borderColor: invalid
                              ? "var(--danger)"
                              : changed
                                ? "var(--accent)"
                                : "var(--rule)",
                          }}
                        />
                      </label>
                      {changed ? (
                        <button
                          type="button"
                          onClick={() => resetOverride(t.cssVar)}
                          aria-label={`Reset ${t.path}`}
                          className="shrink-0 text-[0.75rem] text-ink-faint hover:text-ink"
                        >
                          ↺
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </aside>
  );
}
