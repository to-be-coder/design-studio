"use client";

import { useRef, useState } from "react";
import type { BoardModel, Phase, StageMarkerState } from "@/lib/types";
import { markerLabel, stageName } from "./util";

interface IndexEntry {
  /** The focus key: a stage token, or "decision-stream". */
  focusKey: string;
  label: string;
  phase: Phase;
  state?: StageMarkerState;
}

/**
 * The sidebar is the board's persistent overview AND its switcher (§ focus
 * mode): every stage listed with its run-state, keyboard-navigable (arrow +
 * Enter), and selecting one shows just that board — one board per item, not one
 * long scrolling flow. "All stages" restores the continuous comb.
 */
export function Sidebar({
  model,
  focused,
  onFocus,
}: {
  model: BoardModel;
  focused: string;
  onFocus: (focusKey: string) => void;
}) {
  const entries: IndexEntry[] = [];
  for (const s of model.stages) {
    entries.push({ focusKey: s.stage, label: stageName(s.stage), phase: s.phase, state: s.markerState });
    if (s.stage === "converge") {
      entries.push({ focusKey: "decision-stream", label: "Decision stream", phase: "Decide" });
    }
  }

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [cursor, setCursor] = useState(0);

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(entries.length - 1, cursor + delta));
    setCursor(next);
    btnRefs.current[next]?.focus();
  };

  return (
    <nav
      aria-label="Board index"
      className="flex h-full w-[17rem] flex-col overflow-y-auto border-r border-rule bg-paper/95 backdrop-blur"
      data-testid="sidebar"
    >
      <div className="border-b border-rule px-4 py-3">
        <p className="eyebrow">{model.project.name}</p>
        <p className="mt-0.5 text-[0.75rem] text-ink-faint">Index — arrow keys, Enter to open</p>
      </div>

      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={() => onFocus("all")}
          aria-pressed={focused === "all"}
          data-testid="focus-all"
          className="w-full rounded-inset px-2 py-1.5 text-left text-[0.8125rem] font-medium transition-colors"
          style={
            focused === "all"
              ? { background: "var(--accent-wash)", color: "var(--accent)" }
              : { color: "var(--ink-muted)" }
          }
        >
          All stages
          <span className="ml-1 text-ink-faint">— the whole flow</span>
        </button>
      </div>

      <div
        className="flex-1 px-2 py-2"
        role="listbox"
        aria-label="Board regions"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        {model.phases.map((phase) => (
          <div key={phase} className="mb-2">
            <div className="px-2 py-1">
              <span className="eyebrow text-ink">{phase}</span>
            </div>
            {entries
              .map((e, i) => ({ e, i }))
              .filter(({ e }) => e.phase === phase)
              .map(({ e, i }) => {
                const active = focused === e.focusKey;
                return (
                  <button
                    key={e.focusKey}
                    ref={(el) => {
                      btnRefs.current[i] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-current={active ? "true" : undefined}
                    tabIndex={cursor === i ? 0 : -1}
                    onFocus={() => setCursor(i)}
                    onClick={() => onFocus(e.focusKey)}
                    className="flex w-full items-center justify-between gap-2 rounded-inset px-2 py-1.5 text-left text-[0.875rem] transition-colors hover:bg-accent-wash focus-visible:bg-accent-wash"
                    style={
                      active
                        ? { background: "var(--accent-wash)", color: "var(--accent)", fontWeight: 600 }
                        : { color: "var(--ink-muted)" }
                    }
                  >
                    <span className="min-w-0 truncate">{e.label}</span>
                    {e.state ? (
                      // Decorative: keep the option's accessible name the stage
                      // label alone (name-by-content would otherwise become
                      // "Build Ran" and break name-based selection).
                      <span aria-hidden className="shrink-0 text-[0.6875rem] text-ink-faint">
                        {markerLabel(e.state)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      <div className="border-t border-rule px-4 py-3 text-[0.75rem] leading-relaxed text-ink-faint">
        <p className="eyebrow mb-1.5 text-ink-muted">Canvas</p>
        <dl className="space-y-0.5">
          <Cheat k="Scroll" v="pan" />
          <Cheat k="⌘/Ctrl + scroll" v="zoom" />
          <Cheat k="Shift + scroll" v="pan sideways" />
          <Cheat k="Space + drag" v="pan" />
        </dl>
      </div>
    </nav>
  );
}

function Cheat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-mono text-ink-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
