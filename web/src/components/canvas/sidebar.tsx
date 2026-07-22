"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { BoardModel, Phase } from "@/lib/types";
import { shortProjectName } from "@/lib/project-name";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildSections } from "./doc-sections";
import { navRowActiveStyle, navRowClass, stageName } from "./util";

type Group = "Project" | Phase | "Decisions";

/** A root doc, a stage row, or a document sub-row folded in under a doc-mode stage. */
type Entry =
  | {
      kind: "rootdoc";
      focusKey: string;
      label: string;
      group: "Project";
      hero: boolean;
      /** Accent review-count pill (on the WWB row), or null. */
      pill: number | null;
    }
  | {
      kind: "stage";
      focusKey: string;
      label: string;
      group: Group;
      /** Doc-mode stages (debrief/research) carry a document list. */
      expandable: boolean;
    }
  | { kind: "doc"; docKey: string; label: string; group: Group; parent: string };

/**
 * The sidebar is the board's persistent overview AND its switcher (§ focus
 * mode): every stage listed with its run-state, keyboard-navigable (arrow +
 * Enter), and selecting one shows just that board. Doc-mode stages (debrief,
 * research) fold their document list in as an accordion — the parent expands to
 * reveal its documents, and picking one shows it in the reading pane; the middle
 * contents column is gone.
 */
export function Sidebar({
  model,
  focused,
  selectedDoc,
  generatingStage,
  onFocus,
  onSelectDoc,
  onCollapse,
}: {
  model: BoardModel;
  focused: string;
  /** Which document the focused doc-stage is showing; null → its first. */
  selectedDoc: string | null;
  /** Stage a headless AI draft is generating right now — pulses a dot on its row. */
  generatingStage: string | null;
  onFocus: (focusKey: string) => void;
  onSelectDoc: (docKey: string) => void;
  onCollapse: () => void;
}) {
  // Which expandable stages the user has manually retracted. A doc-stage is open
  // when it's focused and not retracted; opening one is the accordion default.
  const [retracted, setRetracted] = useState<Set<string>>(new Set());

  // The focused doc-stage's documents drive both the accordion sub-rows and the
  // "which sub-row is active" highlight (selectedDoc, or the first by default).
  const focusedSections = buildSections(model, focused);
  const effectiveDoc = selectedDoc ?? focusedSections[0]?.key ?? null;

  // The PROJECT group: the compiled root docs the canvas surfaces, walked from
  // model.rootDocs (never hardcoded), rendered ABOVE the pipeline phases. The
  // review-count pill rides the WWB row now (the review surface); reviewCount is
  // the WWB's own proposed + questions + still-unruled parked (a parked call
  // whose ruling is already recorded no longer awaits you; mirrors
  // lib/wwb.ts reviewCount, which this client file can't import), else the
  // status line's fallback.
  const reviewItems = model.wwb
    ? model.wwb.proposed.filter((e) => !e.recordedVerdict).length +
      model.wwb.dontBuild.filter((e) => e.source === "proposed" && !e.recordedVerdict).length +
      model.wwb.questions.filter((q) => !q.answered).length +
      model.wwb.parked.filter((p) => !p.recorded).length
    : model.header.loop?.reviewCount ?? 0;
  const terminal = model.header.loop?.terminal;
  const showReviewPill = reviewItems > 0 || terminal === "converged-humans-needed" || terminal === "parked";

  const rootEntries: Entry[] = [];
  for (const rd of model.rootDocs) {
    if (!rd.present) continue;
    rootEntries.push({
      kind: "rootdoc",
      focusKey: rd.key,
      label: rd.label,
      group: "Project",
      hero: rd.hero,
      pill: rd.key === "wwb" && showReviewPill ? reviewItems : null,
    });
  }

  const groups: Group[] = rootEntries.length
    ? ["Project", ...model.phases, "Decisions"]
    : [...model.phases, "Decisions"];

  const entries: Entry[] = [...rootEntries];
  for (const s of model.stages) {
    const expandable = buildSections(model, s.stage).length > 0;
    entries.push({
      kind: "stage",
      focusKey: s.stage,
      label: stageName(s.stage),
      group: s.phase,
      expandable,
    });
    const open = expandable && focused === s.stage && !retracted.has(s.stage);
    if (open) {
      for (const sec of focusedSections) {
        entries.push({ kind: "doc", docKey: sec.key, label: sec.label, group: s.phase, parent: s.stage });
      }
    }
  }
  entries.push({
    kind: "stage",
    focusKey: "decision-stream",
    label: "Decision stream",
    group: "Decisions",
    expandable: false,
  });

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [cursor, setCursor] = useState(0);

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(entries.length - 1, cursor + delta));
    setCursor(next);
    btnRefs.current[next]?.focus();
  };

  const onStageClick = (focusKey: string, expandable: boolean) => {
    if (expandable && focused === focusKey) {
      // Already open — the parent toggles its own accordion (expand / retract).
      setRetracted((prev) => {
        const n = new Set(prev);
        if (n.has(focusKey)) n.delete(focusKey);
        else n.add(focusKey);
        return n;
      });
      return;
    }
    // Focusing a stage opens it (clears any prior retraction).
    setRetracted((prev) => {
      if (!prev.has(focusKey)) return prev;
      const n = new Set(prev);
      n.delete(focusKey);
      return n;
    });
    onFocus(focusKey);
  };

  return (
    <nav
      aria-label="Board index"
      className="flex h-full w-[17rem] flex-col overflow-y-auto border-r border-rule bg-paper/95 backdrop-blur"
      data-testid="sidebar"
    >
      <div className="border-b border-rule">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            className="-ml-1 shrink-0 rounded-inset px-1.5 py-0.5 text-[0.8125rem] text-ink-muted transition-colors hover:bg-paper-raised hover:text-ink"
          >
            ← Projects
          </Link>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Hide index"
            className="-mr-1 shrink-0 rounded-inset p-1 text-ink-faint transition-colors hover:bg-paper-raised hover:text-ink"
          >
            <PanelCloseIcon />
          </button>
        </div>
        <div className="border-t border-rule px-4 py-3">
          <p className="eyebrow">{shortProjectName(model.project.name)}</p>
          {model.header.statusLine ? (
            <p className="mt-1 text-[0.75rem] leading-snug text-ink-faint">{model.header.statusLine}</p>
          ) : null}
        </div>
      </div>

      <div
        className="flex-1 px-2 py-2 pt-4"
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
        {groups.map((group) => (
          <div key={group} className="mb-2">
            <div className="px-2 py-1">
              <span className="nav-label">{group}</span>
            </div>
            {entries
              .map((e, i) => ({ e, i }))
              .filter(({ e }) => e.group === group)
              .map(({ e, i }) => {
                if (e.kind === "rootdoc") {
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
                      // Every sidebar nav row is one size (0.875rem/14px, text-nav-row)
                      // across all groups, the hero (WWB) row included; it keeps its
                      // accent only when active (navRowActiveStyle), never a larger size.
                      className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-nav-row ${navRowClass(active)}`}
                      style={active ? navRowActiveStyle : undefined}
                    >
                      <span className="min-w-0 flex-1 truncate">{e.label}</span>
                      {e.pill != null ? (
                        <span
                          data-testid="review-pill"
                          className="ml-1 shrink-0 rounded-pill px-1.5 py-0.5 text-nav-label font-semibold"
                          style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
                        >
                          {e.pill}
                        </span>
                      ) : null}
                    </button>
                  );
                }
                if (e.kind === "doc") {
                  const active = e.docKey === effectiveDoc;
                  return (
                    <button
                      key={`${e.parent}:${e.docKey}`}
                      ref={(el) => {
                        btnRefs.current[i] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={active}
                      aria-current={active ? "true" : undefined}
                      tabIndex={cursor === i ? 0 : -1}
                      onFocus={() => setCursor(i)}
                      onClick={() => onSelectDoc(e.docKey)}
                      className={`flex w-full items-center gap-2 py-1.5 pl-8 pr-2 text-left text-nav-row ${navRowClass(active)}`}
                      style={active ? navRowActiveStyle : undefined}
                    >
                      <span className="min-w-0 truncate">{e.label}</span>
                    </button>
                  );
                }
                const active = focused === e.focusKey;
                const open = e.expandable && active && !retracted.has(e.focusKey);
                // When the stage is open, its highlighted child carries the
                // active treatment — the parent row yields it (no double
                // highlight), while keeping its aria state for the a11y tree.
                const showActive = active && !open;
                return (
                  <button
                    key={e.focusKey}
                    ref={(el) => {
                      btnRefs.current[i] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-current={showActive ? "true" : undefined}
                    aria-expanded={e.expandable ? open : undefined}
                    tabIndex={cursor === i ? 0 : -1}
                    onFocus={() => setCursor(i)}
                    onClick={() => onStageClick(e.focusKey, e.expandable)}
                    className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-nav-row ${navRowClass(showActive)}`}
                    style={showActive ? navRowActiveStyle : undefined}
                  >
                    <span aria-hidden className="w-3 shrink-0 text-ink-faint">
                      {e.expandable ? <Chevron open={open} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.label}</span>
                    {generatingStage === e.focusKey ? <GeneratingDot /> : null}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      <div className="mt-auto px-3 py-3">
        {model.header.loop?.running ? (
          <div className="mb-2 px-1" data-testid="loop-footer">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.75rem] text-ink-muted">
                round {model.header.loop.round ?? "?"}
              </span>
              <DryStreakPips filled={model.header.loop.dryStreak ?? 0} target={2} />
              <GeneratingDot />
            </div>
            {model.header.loop.parkedCount && model.header.loop.parkedCount > 0 ? (
              <p className="mt-1 text-[0.75rem] leading-snug text-ink-muted" data-testid="loop-parked">
                {model.header.loop.parkedCount} decision
                {model.header.loop.parkedCount === 1 ? "" : "s"} parked for your review
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex justify-end">
          <ThemeToggle iconOnly />
        </div>
      </div>
    </nav>
  );
}

/** A dry-streak meter: dots filling toward the target (K, default 2). */
function DryStreakPips({ filled, target }: { filled: number; target: number }) {
  const n = Math.max(target, filled);
  return (
    <span className="inline-flex items-center gap-1" data-testid="dry-streak" title={`Dry streak ${filled} of ${target}`}>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: i < filled ? "var(--accent)" : "transparent", border: "1px solid var(--rule-strong)" }}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** A live "generating" pulse — a solid accent dot under an expanding ring. */
function GeneratingDot() {
  return (
    <span
      aria-hidden
      className="relative ml-1.5 inline-flex h-2 w-2 shrink-0 items-center justify-center"
    >
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ background: "var(--accent)" }}
      />
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--accent)" }}
      />
    </span>
  );
}

/** Accordion disclosure caret — points right when closed, down when open. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** Panel-close glyph for the in-sidebar collapse button (chevron points inward). */
function PanelCloseIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  );
}
