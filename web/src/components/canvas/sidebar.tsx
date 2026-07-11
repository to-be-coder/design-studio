"use client";

import { useRef, useState } from "react";
import type { BoardModel, Phase } from "@/lib/types";
import { stageName } from "./util";

interface IndexEntry {
  regionId: string;
  label: string;
  phase: Phase;
}

/**
 * The sidebar doubles as a linear, keyboard-navigable index of everything on
 * the board (§14 a11y): arrow through it, Enter to fly the canvas there — so
 * every card is reachable without a drag gesture. Plus per-phase and per-stage
 * show/hide, and a compact cheatsheet. Collapsing it compensates the pan offset
 * (handled by the canvas) so content doesn't jump.
 */
export function Sidebar({
  model,
  hiddenStages,
  hiddenPhases,
  onToggleStage,
  onTogglePhase,
  onFly,
}: {
  model: BoardModel;
  hiddenStages: Set<string>;
  hiddenPhases: Set<Phase>;
  onToggleStage: (stage: string) => void;
  onTogglePhase: (phase: Phase) => void;
  onFly: (regionId: string) => void;
}) {
  const entries: IndexEntry[] = [];
  for (const s of model.stages) {
    entries.push({ regionId: s.regionId, label: stageName(s.stage), phase: s.phase });
    if (s.stage === "converge") {
      entries.push({ regionId: "region-decision-stream", label: "Decision stream", phase: "Decide" });
    }
  }

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focus, setFocus] = useState(0);

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(entries.length - 1, focus + delta));
    setFocus(next);
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
        <p className="mt-0.5 text-[0.75rem] text-ink-faint">Index — arrow keys, Enter to fly</p>
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
            <div className="flex items-center justify-between px-2 py-1">
              <span className="eyebrow text-ink">{phase}</span>
              <ToggleEye
                on={!hiddenPhases.has(phase)}
                label={`Toggle ${phase} phase`}
                onClick={() => onTogglePhase(phase)}
              />
            </div>
            {entries
              .map((e, i) => ({ e, i }))
              .filter(({ e }) => e.phase === phase)
              .map(({ e, i }) => {
                const isStage = model.stages.some((s) => s.regionId === e.regionId);
                const stageTok = model.stages.find((s) => s.regionId === e.regionId)?.stage;
                const hidden = stageTok ? hiddenStages.has(stageTok) : false;
                return (
                  <div key={e.regionId} className="flex items-center gap-1">
                    <button
                      ref={(el) => {
                        btnRefs.current[i] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={focus === i}
                      tabIndex={focus === i ? 0 : -1}
                      onFocus={() => setFocus(i)}
                      onClick={() => onFly(e.regionId)}
                      className="min-w-0 flex-1 truncate rounded-inset px-2 py-1.5 text-left text-[0.875rem] text-ink-muted transition-colors hover:bg-accent-wash hover:text-ink focus-visible:bg-accent-wash focus-visible:text-ink"
                      style={hidden ? { opacity: 0.5 } : undefined}
                    >
                      {e.label}
                    </button>
                    {isStage && stageTok ? (
                      <ToggleEye
                        on={!hidden}
                        label={`Toggle ${e.label}`}
                        onClick={() => onToggleStage(stageTok)}
                      />
                    ) : null}
                  </div>
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

function ToggleEye({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className="shrink-0 rounded-inset px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] transition-colors hover:bg-paper-raised"
      style={{ color: on ? "var(--ink-muted)" : "var(--ink-faint)" }}
    >
      {on ? "shown" : "hidden"}
    </button>
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
