"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssumptionState, BoardModel, Phase, RenderableBlock } from "@/lib/types";
import { BoardView } from "./board-view";
import { Sidebar } from "./sidebar";
import { ZoomHud } from "./hud";
import { FramesProvider } from "./frames-context";
import { SessionProvider } from "./session-context";
import { CommentController } from "./comment-controller";
import { CommentToolbar } from "./comment-toolbar";
import { TokensPanel } from "./tokens-panel";
import { useSession } from "./session-context";
import { componentBaseNames } from "@/lib/tokens";
import { ThemeToggle } from "@/components/theme-toggle";

export type StreamFilter = "all" | "live" | "scaffold";

export interface RestsOnState {
  assumptionId: string;
  state: AssumptionState;
  riskiest: boolean;
}

interface View {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 5;
const SIDEBAR_W = 272; // 17rem

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * The canvas — pan & zoom engine (§8) over one world container. Zoom is a CSS
 * transform on that single container (never a re-layout or re-render of cards):
 * BoardView is memoised and the transform is applied imperatively in a ref, so
 * wheel pan/zoom never triggers a React render — the 60fps performance law.
 * View state (pan/zoom, sidebar, hidden stages, expanded cards) persists per
 * project in localStorage.
 */
export function Canvas({ model }: { model: BoardModel }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 24, y: 24, scale: 1 });
  const velocity = useRef(1);
  const lastWheel = useRef(0);
  const spaceHeld = useRef(false);
  const drag = useRef<{ active: boolean; px: number; py: number } | null>(null);
  const reduceMotion = useRef(false);

  const [pct, setPct] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenStages, setHiddenStages] = useState<Set<string>>(new Set());
  const [hiddenPhases, setHiddenPhases] = useState<Set<Phase>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── Assumption blast radius (slice 3) ───────────────────────────────────────
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<StreamFilter>("all");
  // Focus mode: which single board is shown. Clicking any sidebar item isolates
  // it ("one board per item"); "all" is the continuous comb. Default is "all"
  // for a first-look overview, then a click narrows — and the choice persists.
  const [focused, setFocused] = useState<string>("all");
  const highlighted = useMemo(() => {
    if (!selected) return null;
    const a = model.assumptions.find((x) => x.id === selected);
    return a ? new Set(a.dependents) : null;
  }, [selected, model.assumptions]);
  const restsOnState = useMemo(() => {
    const m: Record<string, RestsOnState> = {};
    for (const a of model.assumptions) {
      for (const dep of a.dependents) m[dep] = { assumptionId: a.id, state: a.state, riskiest: a.riskiest };
    }
    return m;
  }, [model.assumptions]);

  const storageKey = `canvas-view:${model.project.slug}`;

  // ── Live board (§0): the vault watcher pushes changes over SSE; the affected
  //    card refetches and swaps its blocks in place — no full-page reload. ──────
  const [liveCards, setLiveCards] = useState<Record<string, RenderableBlock[]>>({});
  const fileIndex = useMemo(() => {
    const idx: Record<string, string[]> = {};
    for (const s of model.stages) {
      for (const c of s.cards) {
        if (!c.file) continue;
        (idx[c.file] ??= []).push(c.id);
      }
    }
    return idx;
  }, [model.stages]);

  useEffect(() => {
    const slug = model.project.slug;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/vault-events?slug=${encodeURIComponent(slug)}`);
    } catch {
      return;
    }
    const onChange = (e: MessageEvent) => {
      let file: string | null = null;
      try {
        file = (JSON.parse(e.data) as { file?: string }).file ?? null;
      } catch {
        return;
      }
      if (!file) return;
      const cardIds = fileIndex[file];
      if (!cardIds || cardIds.length === 0) return;
      fetch(`/api/card?slug=${encodeURIComponent(slug)}&file=${encodeURIComponent(file)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { blocks?: RenderableBlock[] } | null) => {
          if (!data?.blocks) return;
          setLiveCards((prev) => {
            const next = { ...prev };
            for (const id of cardIds) next[id] = data.blocks!;
            return next;
          });
        })
        .catch(() => {
          /* transient — the watcher will fire again on the next write */
        });
    };
    es.addEventListener("change", onChange);
    return () => {
      es?.removeEventListener("change", onChange);
      es?.close();
    };
  }, [model.project.slug, fileIndex]);

  // ── Imperative transform (the perf law: no React render on pan/zoom) ─────────
  const applyView = useCallback((animate = false) => {
    const w = worldRef.current;
    if (!w) return;
    const v = view.current;
    w.style.transition = animate && !reduceMotion.current ? "transform 380ms cubic-bezier(0.22,1,0.36,1)" : "none";
    w.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
  }, []);

  // Throttle the HUD readout to one update per frame (React also dedupes equal
  // values, so panning — which doesn't change scale — never re-renders).
  const pctRAF = useRef(0);
  const syncPct = useCallback(() => {
    if (pctRAF.current) return;
    pctRAF.current = requestAnimationFrame(() => {
      pctRAF.current = 0;
      setPct(view.current.scale * 100);
    });
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            view: view.current,
            sidebarOpen,
            hiddenStages: [...hiddenStages],
            hiddenPhases: [...hiddenPhases],
            expanded: [...expanded],
            focused,
          }),
        );
      } catch {
        /* storage unavailable — non-fatal */
      }
    }, 350);
  }, [storageKey, sidebarOpen, hiddenStages, hiddenPhases, expanded, focused]);

  // Load persisted state once.
  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        // Validate the persisted view shape before trusting it: a corrupted or
        // previous-schema record must fall back to defaults, never inject a
        // broken transform (scale(undefined)) or a NaN% HUD readout.
        if (isValidView(s.view)) {
          view.current = { x: s.view.x, y: s.view.y, scale: clamp(s.view.scale, MIN_SCALE, MAX_SCALE) };
        }
        if (typeof s.sidebarOpen === "boolean") setSidebarOpen(s.sidebarOpen);
        if (Array.isArray(s.hiddenStages)) setHiddenStages(new Set(s.hiddenStages));
        if (Array.isArray(s.hiddenPhases)) setHiddenPhases(new Set(s.hiddenPhases));
        if (Array.isArray(s.expanded)) setExpanded(new Set(s.expanded));
        if (typeof s.focused === "string") setFocused(s.focused);
      }
    } catch {
      /* ignore */
    }
    applyView(false);
    syncPct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-assert the transform after any React render (hidden/expanded/selection),
  // since React owns other style props on the world container.
  useEffect(() => {
    applyView(false);
  });

  // Persist when durable state changes.
  useEffect(() => {
    persist();
  }, [sidebarOpen, hiddenStages, hiddenPhases, expanded, persist]);

  // ── Wheel: pan / zoom-to-cursor / horizontal, with velocity ramp ─────────────
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      const dt = now - lastWheel.current;
      lastWheel.current = now;
      if (dt < 40) velocity.current = Math.min(3, velocity.current * 1.12);
      else if (dt > 150) velocity.current = 1;
      const mult = velocity.current;
      const v = view.current;

      if (e.ctrlKey || e.metaKey) {
        // Zoom to cursor (pinch reports as ctrl+wheel on trackpads).
        const rect = vp.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0015 * mult);
        const newScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
        const k = newScale / v.scale;
        v.x = cx - (cx - v.x) * k;
        v.y = cy - (cy - v.y) * k;
        v.scale = newScale;
      } else if (e.shiftKey) {
        v.x -= (e.deltaX || e.deltaY) * mult;
      } else {
        v.x -= e.deltaX * mult;
        v.y -= e.deltaY * mult;
      }
      applyView(false);
      syncPct();
      persist();
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [applyView, syncPct, persist]);

  // ── Space + drag / background drag to pan ────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        spaceHeld.current = true;
        if (viewportRef.current) viewportRef.current.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        if (viewportRef.current) viewportRef.current.style.cursor = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const bgDrag =
      e.currentTarget === e.target ||
      (e.target as HTMLElement).dataset.canvasBg !== undefined ||
      worldRef.current === e.target;
    if (!spaceHeld.current && e.button !== 1 && !bgDrag) return;
    drag.current = { active: true, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (viewportRef.current) viewportRef.current.style.cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active) return;
    view.current.x += e.clientX - d.px;
    view.current.y += e.clientY - d.py;
    d.px = e.clientX;
    d.py = e.clientY;
    applyView(false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current?.active) {
      drag.current = null;
      if (viewportRef.current) viewportRef.current.style.cursor = spaceHeld.current ? "grab" : "";
      persist();
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // ── HUD actions ──────────────────────────────────────────────────────────────
  const zoomAroundCenter = (factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const v = view.current;
    const newScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
    const k = newScale / v.scale;
    v.x = cx - (cx - v.x) * k;
    v.y = cy - (cy - v.y) * k;
    v.scale = newScale;
    applyView(true);
    syncPct();
    persist();
  };

  const resetView = () => {
    view.current = { x: 24, y: 24, scale: 1 };
    applyView(true);
    syncPct();
    persist();
  };

  const fitToContent = () => {
    const vp = viewportRef.current;
    const w = worldRef.current;
    if (!vp || !w) return;
    const pad = 96;
    const cw = w.scrollWidth;
    const ch = w.scrollHeight;
    const s = clamp(Math.min(vp.clientWidth / (cw + pad), vp.clientHeight / (ch + pad)), MIN_SCALE, MAX_SCALE);
    view.current.scale = s;
    view.current.x = Math.max(24, (vp.clientWidth - cw * s) / 2);
    view.current.y = Math.min(24, (vp.clientHeight - ch * s) / 2);
    applyView(true);
    syncPct();
    persist();
  };

  // Fit the isolated board after its DOM commits (measuring in the click
  // handler would catch the previous board). Skip the first run so a reload
  // keeps the persisted view instead of snapping to fit.
  const fitMounted = useRef(false);
  useEffect(() => {
    if (!fitMounted.current) {
      fitMounted.current = true;
      return;
    }
    const id = requestAnimationFrame(() => fitToContent());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const flyTo = useCallback(
    (regionId: string) => {
      const vp = viewportRef.current;
      const w = worldRef.current;
      const el = document.getElementById(regionId);
      if (!vp || !w || !el) return;
      const wr = w.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const v = view.current;
      const lx = (er.left + er.width / 2 - wr.left) / v.scale;
      const ly = (er.top + er.height / 2 - wr.top) / v.scale;
      const targetScale = clamp(Math.max(v.scale, 0.7), MIN_SCALE, MAX_SCALE);
      v.scale = targetScale;
      v.x = vp.clientWidth / 2 - lx * targetScale;
      v.y = vp.clientHeight / 3 - ly * targetScale;
      applyView(true);
      syncPct();
      persist();
    },
    [applyView, syncPct, persist],
  );

  // ── Sidebar collapse compensates the pan offset so content doesn't jump ──────
  const toggleSidebar = () => {
    view.current.x += sidebarOpen ? SIDEBAR_W : -SIDEBAR_W;
    setSidebarOpen((v) => !v);
    applyView(false);
    persist();
  };

  // Stable callbacks so a HUD-only re-render (pct) never re-renders the
  // memoised board — the perf law that keeps card content rendered once.
  // Select a single board (or "all"). The actual fit happens in an effect keyed
  // on `focused` (below) — measuring here would catch the OLD board before React
  // swaps in the isolated one, fitting to the wrong (huge) height.
  const focusItem = useCallback((key: string) => setFocused(key), []);
  const toggleExpand = useCallback(
    (id: string) =>
      setExpanded((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );

  const componentNames = useMemo(() => componentBaseNames(model.tokens), [model.tokens]);

  return (
    <FramesProvider>
    <SessionProvider slug={model.project.slug} componentNames={componentNames}>
    <div className="flex h-screen w-screen overflow-hidden bg-desk">
      {sidebarOpen ? (
        <Sidebar model={model} focused={focused} onFocus={focusItem} onCollapse={toggleSidebar} />
      ) : null}

      <div className="relative min-w-0 flex-1">
        {/* Chrome. Top-left: the reopen-index icon appears only while the
            sidebar is hidden — Projects now lives in the sidebar header, so
            it's reachable by reopening the index (the in-sidebar collapse
            icon is the only hide control while it's open). */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          {sidebarOpen ? null : (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Show index"
              className="flex items-center rounded-pill border border-rule bg-paper px-3 py-1.5 text-ink-muted transition-colors hover:text-ink"
            >
              <PanelOpenIcon />
            </button>
          )}
        </div>
        {/* z-40: the mode toolbar must stay clickable above the tokens panel
            (z-30) — otherwise opening Tokens makes its own toggle unreachable. */}
        <div className="absolute right-4 top-4 z-40 flex items-center gap-2">
          {model.prototype.interactive && model.prototype.hasTokens ? (
            <CommentToolbar project={model.project.name} />
          ) : null}
          <ThemeToggle />
        </div>

        {/* The pannable viewport. */}
        <div
          ref={viewportRef}
          className="h-full w-full touch-none overflow-hidden"
          data-canvas-bg
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          data-testid="canvas-viewport"
        >
          <BoardView
            model={model}
            worldRef={worldRef}
            selectedAssumption={selected}
            onSelectAssumption={setSelected}
            highlightedDecisions={highlighted}
            restsOnState={restsOnState}
            filter={filter}
            onFilter={setFilter}
            hiddenStages={hiddenStages}
            hiddenPhases={hiddenPhases}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            liveCards={liveCards}
            onFly={flyTo}
            focused={focused}
          />
        </div>

        {model.prototype.interactive && model.prototype.hasTokens ? (
          <TokensDrawer tokens={model.tokens} />
        ) : null}

        <ZoomHud
          pct={pct}
          onZoomOut={() => zoomAroundCenter(0.8)}
          onZoomIn={() => zoomAroundCenter(1.25)}
          onReset={resetView}
          onFit={fitToContent}
        />

        <CommentController tokens={model.tokens} />
      </div>
    </div>
    </SessionProvider>
    </FramesProvider>
  );
}

/** Renders the Tokens-mode drawer only when the session is in tokens mode (§13). */
function TokensDrawer({ tokens }: { tokens: import("@/lib/types").DesignTokens }) {
  const { mode } = useSession();
  if (mode !== "tokens") return null;
  return <TokensPanel tokens={tokens} />;
}

/** A persisted view is trustworthy only if x/y/scale are all finite numbers. */
function isValidView(v: unknown): v is View {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.x === "number" &&
    Number.isFinite(o.x) &&
    typeof o.y === "number" &&
    Number.isFinite(o.y) &&
    typeof o.scale === "number" &&
    Number.isFinite(o.scale) &&
    o.scale > 0
  );
}

/** Panel-open glyph for the chrome reopen-index button (shown when hidden). */
function PanelOpenIcon() {
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
      <path d="m14 9 3 3-3 3" />
    </svg>
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}
