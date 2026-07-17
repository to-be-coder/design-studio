"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssumptionState, BoardModel, LoopProgress, RenderableBlock } from "@/lib/types";
import { AddInputButton } from "./add-input";
import { BoardView } from "./board-view";
import { DocView } from "./doc-view";
import { LoopBanner } from "./loop-banner";
import { Sidebar } from "./sidebar";
import { ZoomHud } from "./hud";
import { FramesProvider } from "./frames-context";
import { SessionProvider } from "./session-context";
import { CommentController } from "./comment-controller";
import { CommentToolbar } from "./comment-toolbar";
import { TokensPanel } from "./tokens-panel";
import { useSession } from "./session-context";
import { stageName } from "./util";
import { componentBaseNames } from "@/lib/tokens";

export type StreamFilter = "all" | "live" | "scaffold";

/** Stages with an on-demand "Run" control on their board (must match the runner). */
const RUNNABLE_STAGES = new Set(["research", "structure"]);

/** Doc-mode focuses render off the canvas as a reading pane, not a spatial board. */
const DOC_FOCUSES = new Set(["debrief", "research", "wwb", "ledger", "agenda", "decision-stream"]);

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
 * View state (pan/zoom, sidebar, focused board, expanded cards) persists per
 * project in localStorage.
 */
export function Canvas({ model, runsEnabled }: { model: BoardModel; runsEnabled: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 24, y: 24, scale: 1 });
  const velocity = useRef(1);
  const lastWheel = useRef(0);
  const spaceHeld = useRef(false);
  const drag = useRef<{ active: boolean; px: number; py: number } | null>(null);
  const reduceMotion = useRef(false);
  // True once persisted + URL state is applied; gates the deep-link reflection
  // so it never clobbers the incoming ?focus=&doc= before we've read it.
  const hydrated = useRef(false);
  // Set on the first user-driven focus/doc change: the URL reflects real
  // navigation, so a fresh load stays clean (no ?focus= until you move).
  const interacted = useRef(false);

  const [pct, setPct] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── Assumption blast radius (slice 3) ───────────────────────────────────────
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<StreamFilter>("all");
  // Focus mode: which single board is shown. Clicking any sidebar item isolates
  // it ("one board per item"). Default landing is What's Worth Building (the
  // compiled verdict) when it exists, else the first stage; a click narrows to
  // any other board, and the choice persists.
  const [focused, setFocused] = useState<string>(() =>
    model.rootDocs.find((r) => r.key === "wwb")?.present ? "wwb" : model.stages[0]?.stage ?? "debrief",
  );
  // Which document a doc-mode stage (debrief/research) is showing — picked from
  // the sidebar accordion; null means the stage's first document.
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  // The stage a headless AI draft is currently generating; a runnable stage's
  // Run control reflects it (shows and disables itself). Null when idle.
  const [generatingStage, setGeneratingStage] = useState<string | null>(null);
  // The `.loop-progress` heartbeat, when one exists: the banner's one line.
  const [progress, setProgress] = useState<LoopProgress | null>(null);
  // The last observed fence (the dashboard's committed status line). When it
  // changes value the vault moved under the board; only then do we refetch.
  const lastFence = useRef<string | null>(null);
  // Bump to (re)start the status poll — e.g. right after triggering a run.
  const [pollNonce, setPollNonce] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  // A `?runs=1` client override enables the WWB review-band controls for a
  // preview even when server autorun is off. It affects ONLY the band's UI; the
  // /api/projects/review route still gates the actual recording on autorun, so
  // this can never spawn an agent on its own.
  const [reviewOverride, setReviewOverride] = useState(false);
  const router = useRouter();

  // Poll the skill-run status while a headless generation is in flight: track
  // which stage is generating (a runnable Run control reflects it) and refresh
  // the board once it lands so the freshly-written docs show. Idle projects keep
  // a light watch (a recorder can land minutes after page load, and skills also
  // run outside this server), and every poll carries the fence + the heartbeat.
  useEffect(() => {
    const slug = model.project.slug;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sawDrafting = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/status?slug=${encodeURIComponent(slug)}`);
        const data = (await res.json()) as {
          stage?: string | null;
          state?: string | null;
          fence?: string | null;
          progress?: LoopProgress | null;
        };
        if (stopped) return;
        setProgress(data.progress ?? null);
        // The fence is the vault's committed status line. When its VALUE moves,
        // the server-rendered board is stale (a recorder landed, a round
        // committed): refetch it, so a recorded card never sits looking
        // clickable. Change only, never per tick.
        if (typeof data.fence === "string" && data.fence) {
          if (lastFence.current !== null && lastFence.current !== data.fence) router.refresh();
          lastFence.current = data.fence;
        }
        if (data.state === "drafting") {
          sawDrafting = true;
          setGeneratingStage(data.stage ?? null);
          timer = setTimeout(poll, 2000);
        } else {
          setGeneratingStage(null);
          if (sawDrafting && data.state === "done") {
            sawDrafting = false;
            router.refresh();
          }
          timer = setTimeout(poll, 12_000);
        }
      } catch {
        if (stopped) return;
        setGeneratingStage(null);
        timer = setTimeout(poll, 12_000);
      }
    };
    poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [model.project.slug, router, pollNonce]);

  // Kick off a headless run of a stage's skill, then start polling so the Run
  // control reflects the run while it works.
  const runStage = useCallback(
    async (stage: string) => {
      setRunError(null);
      setGeneratingStage(stage); // optimistic — the poll confirms/clears it
      try {
        const res = await fetch("/api/projects/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: model.project.slug, stage }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setGeneratingStage(null);
          setRunError(data.error ?? "Couldn't start the run.");
          return;
        }
        setPollNonce((n) => n + 1);
      } catch {
        setGeneratingStage(null);
        setRunError("Couldn't reach the server.");
      }
    },
    [model.project.slug],
  );
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
            expanded: [...expanded],
            focused,
          }),
        );
      } catch {
        /* storage unavailable — non-fatal */
      }
    }, 350);
  }, [storageKey, sidebarOpen, expanded, focused]);

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
        if (Array.isArray(s.expanded)) setExpanded(new Set(s.expanded));
        // Ignore a stale "all" (the removed comb overview) so it can't try to
        // render a board that no longer exists — fall back to the default stage.
        // Restoring a board must NOT re-fit (that would clobber the persisted
        // pan/zoom we just loaded); the fit effect honors this flag.
        if (typeof s.focused === "string" && s.focused !== "all") {
          restoredFocus.current = true;
          setFocused(s.focused);
        }
      }
    } catch {
      /* ignore */
    }
    // Deep links win over the persisted focus: a receipt / agenda URL lands the
    // reader exactly where it pointed (?focus=&doc=).
    try {
      const params = new URLSearchParams(window.location.search);
      const f = params.get("focus");
      const d = params.get("doc");
      if (f) {
        restoredFocus.current = true;
        setFocused(f);
      }
      if (d) setSelectedDoc(d);
      if (params.get("runs") === "1") setReviewOverride(true);
    } catch {
      /* ignore */
    }
    hydrated.current = true;
    applyView(false);
    syncPct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect focus/doc into the URL so receipts + agenda links are real,
  // shareable URLs (replaceState, so no history spam, no navigation). Only after
  // a real interaction, so a fresh load with no query string stays clean.
  useEffect(() => {
    if (!hydrated.current || !interacted.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("focus", focused);
      if (selectedDoc) params.set("doc", selectedDoc);
      else params.delete("doc");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    } catch {
      /* history unavailable, non-fatal */
    }
  }, [focused, selectedDoc]);

  // Re-assert the transform after any React render (hidden/expanded/selection),
  // since React owns other style props on the world container.
  useEffect(() => {
    applyView(false);
  });

  // Persist when durable state changes.
  useEffect(() => {
    persist();
  }, [sidebarOpen, expanded, persist]);

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
  const restoredFocus = useRef(false);
  useEffect(() => {
    if (!fitMounted.current) {
      fitMounted.current = true;
      return;
    }
    // The board restored from localStorage keeps its persisted view — only a
    // live (user-driven) focus change fits to the new board.
    if (restoredFocus.current) {
      restoredFocus.current = false;
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
  // Select a single board. The actual fit happens in an effect keyed
  // on `focused` (below) — measuring here would catch the OLD board before React
  // swaps in the isolated one, fitting to the wrong (huge) height.
  // Focusing a board resets the doc selection so a doc-stage opens on its first
  // document; the sidebar accordion drives it from there.
  const focusItem = useCallback((key: string) => {
    interacted.current = true;
    setFocused(key);
    setSelectedDoc(null);
  }, []);
  // A review submission spawns the recorder headless; bump the poll so the
  // board refreshes when it lands.
  const onRunStarted = useCallback(() => setPollNonce((n) => n + 1), []);
  const selectDoc = useCallback((docKey: string) => {
    interacted.current = true;
    setSelectedDoc(docKey);
  }, []);
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

  // Does the project have any structure content yet? The model already knows:
  // the structure stage's cards are empty exactly when 03 Structure.md is
  // absent, so the empty board's centered call-to-action derives from it.
  const hasStructure = useMemo(
    () => (model.stages.find((s) => s.stage === "structure")?.cards.length ?? 0) > 0,
    [model.stages],
  );

  // Debrief and research (prose stages), the project root docs (What's Worth
  // Building, the ledger, the agenda), and the decision stream read as documents,
  // not spatial boards. In doc mode we replace the pannable viewport (and hide the
  // zoom HUD, since there's nothing to zoom) with the reading view. The sidebar
  // still drives `focused`, so navigating in or out is one click away.
  const docMode = DOC_FOCUSES.has(focused);

  return (
    <FramesProvider>
    <SessionProvider slug={model.project.slug} componentNames={componentNames}>
    <div className="flex h-screen w-screen overflow-hidden bg-desk">
      {sidebarOpen ? (
        <Sidebar
          model={model}
          focused={focused}
          selectedDoc={selectedDoc}
          onFocus={focusItem}
          onSelectDoc={selectDoc}
          onCollapse={toggleSidebar}
        />
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
          {/* The loop's heartbeat: one plain line saying what is running and
              for how long. Nothing renders while the loop is quiet. */}
          <LoopBanner progress={progress} />
          {/* Add input, anytime (decision 0036): every project accepts new input
              at any stage; it lands in the research inbox and the loop sorts it
              in. Shown on every board when runs are enabled (?runs=1 previews it). */}
          {runsEnabled || reviewOverride ? (
            <AddInputButton slug={model.project.slug} onRunStarted={onRunStarted} />
          ) : null}
          {/* A runnable stage's on-demand run control (opt-in): spawns that
              stage's skill headless and shows itself as running while it works. */}
          {RUNNABLE_STAGES.has(focused) && runsEnabled ? (
            <>
              {runError ? (
                <span className="text-[0.75rem] text-unverified">{runError}</span>
              ) : null}
              <button
                type="button"
                onClick={() => runStage(focused)}
                disabled={generatingStage === focused}
                className="rounded-pill border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingStage === focused
                  ? `Running ${stageName(focused).toLowerCase()}…`
                  : `Run ${stageName(focused).toLowerCase()}`}
              </button>
            </>
          ) : null}
          {/* Comment has an always-on home on the Build board (even before a
              prototype is built); elsewhere the toolbar rides on a live prototype
              (e.g. the design-system board's token proposals). Tokens editing
              only shows when there are tokens to edit. */}
          {focused === "build" || (model.prototype.interactive && model.prototype.hasTokens) ? (
            <CommentToolbar
              project={model.project.name}
              showTokens={focused === "build" && model.prototype.hasTokens}
            />
          ) : null}
        </div>

        {docMode ? (
          // Off the canvas entirely: the debrief/research/root-doc reading view
          // fills the flex-1 area in place of the pannable viewport.
          <DocView
            model={model}
            focused={focused}
            selectedDoc={selectedDoc}
            runsEnabled={runsEnabled || reviewOverride}
            onFocusReceipt={focusItem}
            onRunStarted={onRunStarted}
          />
        ) : (
          /* The pannable viewport. */
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
              expanded={expanded}
              onToggleExpand={toggleExpand}
              liveCards={liveCards}
              onFly={flyTo}
              focused={focused}
            />
          </div>
        )}

        {/* The empty Structure board's call-to-action, dead middle of the board
            area: one press drafts 03 Structure.md headlessly. The layer itself
            passes pointer events through (panning still works everywhere); only
            the centered block is interactive. Gone once structure content
            exists; read-only line when runs are off. */}
        {!docMode && focused === "structure" && !hasStructure ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div
              className="pointer-events-auto flex max-w-[26rem] flex-col items-center gap-4 px-6 text-center"
              data-testid="structure-cta"
            >
              <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
                No structure yet. Draft the flows and screens from what you confirmed.
              </p>
              {runsEnabled || reviewOverride ? (
                <>
                  <button
                    type="button"
                    onClick={() => runStage("structure")}
                    disabled={generatingStage === "structure"}
                    className="rounded-pill border border-rule-strong bg-paper px-5 py-2.5 text-[0.875rem] font-semibold text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="structure-cta-run"
                  >
                    {generatingStage === "structure" ? "Drafting structure…" : "Create structure"}
                  </button>
                  {runError ? (
                    <span className="text-[0.75rem] text-unverified">{runError}</span>
                  ) : null}
                </>
              ) : (
                <p className="text-[0.8125rem] text-ink-muted" data-testid="structure-cta-readonly">
                  Run from Claude Code: <span className="font-mono">/design-studio-structure</span>
                </p>
              )}
            </div>
          </div>
        ) : null}

        {focused === "build" && model.prototype.interactive && model.prototype.hasTokens ? (
          <TokensDrawer tokens={model.tokens} />
        ) : null}

        {/* Nothing to zoom in doc mode — the reading view scrolls natively. */}
        {docMode ? null : (
          <ZoomHud
            pct={pct}
            onZoomOut={() => zoomAroundCenter(0.8)}
            onZoomIn={() => zoomAroundCenter(1.25)}
            onReset={resetView}
            onFit={fitToContent}
          />
        )}

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
