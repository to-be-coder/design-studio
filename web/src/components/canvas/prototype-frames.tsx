"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { PrototypeInfo } from "@/lib/types";
import { useFrames } from "./frames-context";

/**
 * Every page as its own live frame (§1 comb): ONE COLUMN PER ROUTE, each column
 * a desktop DeviceFrame labelled with its route path. The columns are grouped
 * into ROWS BY DOMAIN — sections stacked down the spine, each section's pages
 * running horizontally — where a row is the route's first path segment (root ""
 * → "/"). The old route rail switched a single frame between routes; now every
 * route is a simultaneous, always-alive column, so the cross-route instance
 * scan (§7) accumulates without any clicking and §7/§10–§13 can reach into all
 * of them at once (same-origin only).
 *
 * The mount discipline — the load-bearing part — comes straight from the proven
 * recipe:
 *
 *   1. SEQUENTIAL MOUNT QUEUE. A prototype that boots a real app instance per
 *      frame can trip its backend's anonymous-sign-in rate limit if many frames
 *      boot at once. So frame i+1 mounts only after frame i settles (its load or
 *      error event fires). Not-yet-cleared columns show a designed "queued…"
 *      placeholder. One code path for direct-embed and same-origin alike — the
 *      only difference is the spacing after each settle.
 *
 *   2. CROSS-ORIGIN FAILURE IS UNDETECTABLE. A direct embed loads the app at its
 *      OWN origin, so this same-origin canvas host cannot read the frame's
 *      document — we literally cannot tell whether the app inside rendered or
 *      printed its own "Anonymous sign-in failed" screen. There is no honest
 *      sniff. The design instead is: (a) sequential mount with a 3s gap after
 *      each load, so frames don't stampede the rate limit; (b) a single
 *      scheduled one-shot reload of frames 4+ at ~30s after they mount, cheap
 *      insurance that a frame which booted into the hot rate-limit window gets a
 *      second chance once the window cools; (c) a manual per-column Reload plus
 *      the global Reload-all for anything still down. Spacing + one-shot reload
 *      + manual retry — because detection is impossible, not because it's ideal.
 *
 *   3. NEVER UNMOUNT-AND-REMOUNT ON SCROLL. For a direct embed a remount is a
 *      fresh boot — another sign-in against the rate limit. So a column mounts
 *      once (when the queue clears it) and stays alive; it is never torn down as
 *      it scrolls off-canvas. Perf is bounded instead by lazy ACTIVATION: the
 *      whole region stays dormant (nothing boots) until it first comes near the
 *      viewport, then the queue runs to completion and every column stays up.
 */

const DESKTOP = { w: 1440, h: 900 };
const MOBILE = { w: 390, h: 780 };
const SCALE = 0.5; // shared scale so mobile is genuinely narrower

// Spacing after a frame settles before the next is cleared to mount. A direct
// embed boots a real backend session, so it needs the wider gap to stay under
// the anonymous-sign-in rate limit; a same-origin static frame just needs the
// queue to be sequential, so a short beat is plenty.
const DIRECT_SETTLE_GAP = 3000;
const STATIC_SETTLE_GAP = 300;
// Direct frames from this index up (1-based "frames 4+") get one scheduled
// reload this long after they mount — the rate-limit cooldown insurance.
const AUTO_RELOAD_FROM_INDEX = 3;
const AUTO_RELOAD_DELAY = 30000;

interface FrameStatus {
  state: "loading" | "loaded" | "error";
}

function routeLabel(route: string): string {
  return route === "" ? "/" : "/" + route.replace(/\.html?$/i, "");
}

// Known acronyms that must stay upper-cased when a route segment is humanized —
// otherwise "mcp-servers" title-cases to the ugly "Mcp Servers". Keyed by the
// lowercased word (canvas-maker §1: "Title strip per card: page label").
const ACRONYMS: Record<string, string> = { mcp: "MCP", otp: "OTP" };

// The human page name for a column's title strip: the route's LAST path segment,
// title-cased with dashes→spaces and known acronyms preserved. Root route "" (and
// any empty tail) reads "Home". A trailing .html is stripped first so static
// fixtures humanize too ("page2.html" → "Page2", "settings/mcp-servers" →
// "MCP Servers"). This is the label sized to read at canvas distance.
function pageName(route: string): string {
  const seg = route.replace(/\.html?$/i, "").split("/").filter(Boolean).pop() ?? "";
  if (seg === "") return "Home";
  return seg
    .split("-")
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Row (domain) key for the comb: the route's FIRST path segment, with the root
// route "" grouping as "/". A trailing .html is stripped first, because static
// fixtures use page2.html-style routes (so "page2.html" → "/page2", and
// "settings/profile" → "/settings"). Grouping by this key stacks each domain's
// pages as one horizontal row down the spine (§1 comb geometry).
function domainKey(route: string): string {
  if (route === "") return "/";
  return "/" + route.replace(/\.html?$/i, "").split("/")[0];
}

interface DomainRow {
  key: string;
  items: { route: string; index: number }[];
}

// Group the flat route list into rows by domain (§1 comb: sections stacked down
// the spine, each section's pages horizontal). Row order = order of first
// appearance in routes; column order within a row = appearance order. The
// GLOBAL mount index is assigned ROW-MAJOR here (row 0's columns first, then
// row 1's, …) so the sequential mount queue boots exactly one frame at a time
// across all rows, in the reading order the comb lays out.
function groupByDomain(routes: string[]): DomainRow[] {
  const rows: DomainRow[] = [];
  for (const route of routes) {
    const key = domainKey(route);
    let row = rows.find((r) => r.key === key);
    if (!row) {
      row = { key, items: [] };
      rows.push(row);
    }
    row.items.push({ route, index: 0 });
  }
  let gi = 0;
  for (const row of rows) for (const item of row.items) item.index = gi++;
  return rows;
}

/**
 * Dispatch on how the prototype reaches the board:
 *   - runnable → the canvas can START the dev server itself (Render control);
 *     once the server reports "ready" it hands off to the live frames.
 *   - embeddable (a running url / static repo, nothing to start) → frames now.
 *   - neither → the designed empty state.
 *
 * `requireBuilt` is the Build board's gate: the prototype repo exists from the
 * structure stage on (as a clickable skeleton), but a bare skeleton belongs to
 * the Structure board, not here. So Build shows the frames only once build owns
 * the repo (flows.json source "build"); until then it shows the empty state.
 */
export function PrototypeFrames({
  prototype,
  id,
  requireBuilt,
}: {
  prototype: PrototypeInfo;
  id: string;
  requireBuilt?: boolean;
}) {
  if (requireBuilt && prototype.skeletonSource === "structure")
    return <EmptyState prototype={prototype} id={id} />;
  if (prototype.runnable) return <RunnablePrototype prototype={prototype} id={id} />;
  if (!prototype.embeddable) return <EmptyState prototype={prototype} id={id} />;
  return <FramesView prototype={prototype} id={id} />;
}

/** The designed empty state — no embeddable source and nothing to start. */
function EmptyState({ prototype, id }: { prototype: PrototypeInfo; id: string }) {
  return (
    <article id={id} className="card-sheet w-[34rem] max-w-[88vw] px-8 py-7" data-card-kind="prototype" data-testid="prototype-empty">
      <p className="eyebrow mb-2">The running thing</p>
      <div className="rounded-inset border border-dashed border-rule-strong px-5 py-8 text-center">
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
          No prototype is running for this project. Running{" "}
          <span className="font-mono text-ink">design-studio-build</span> puts the live, clickable
          prototype here — the flow ends at the real thing, never a screenshot.
        </p>
        {prototype.degradedReason ? (
          <p className="mt-3 text-[0.8125rem] text-ink-faint">{prototype.degradedReason}</p>
        ) : null}
      </div>
    </article>
  );
}

function FramesView({
  prototype,
  id,
  runControls,
}: {
  prototype: PrototypeInfo;
  id: string;
  runControls?: ReactNode;
}) {
  const routes = prototype.routes.length ? prototype.routes : [""];
  const rows = groupByDomain(routes);
  const direct = !prototype.interactive;

  // Reload-all nonce; bumping it re-keys every column so all remount and the
  // queue re-runs from the top.
  const [nonce, setNonce] = useState(0);
  // Lazy region activation: nothing boots until the region first nears the
  // viewport (perf), then the queue runs to completion and stays up (never
  // unmount — a remount is a fresh boot / another rate-limited sign-in).
  const [activated, setActivated] = useState(false);
  // The queue frontier: columns with index <= mountedUpTo are cleared to mount.
  const [mountedUpTo, setMountedUpTo] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, FrameStatus>>({});
  const settledRef = useRef<Set<number>>(new Set());
  const articleRef = useRef<HTMLElement>(null);

  const setStatus = useCallback((index: number, s: FrameStatus) => {
    setStatuses((prev) => ({ ...prev, [index]: s }));
  }, []);

  // A column has settled once its desktop frame fired load OR error. Advance the
  // queue frontier one step, after the spacing gap, so the next column mounts.
  const onColumnSettle = useCallback(
    (index: number) => {
      if (settledRef.current.has(index)) return;
      settledRef.current.add(index);
      const gap = direct ? DIRECT_SETTLE_GAP : STATIC_SETTLE_GAP;
      setTimeout(() => setMountedUpTo((m) => Math.max(m, index + 1)), gap);
    },
    [direct],
  );

  const reloadAll = useCallback(() => {
    settledRef.current = new Set();
    setStatuses({});
    setMountedUpTo(0);
    setNonce((n) => n + 1);
  }, []);

  // Lazy activation. The canvas moves content by a CSS transform on an ancestor
  // and clips it with the viewport's overflow, so an IntersectionObserver
  // mis-reports geometrically-on-screen frames as hidden. Measure the article's
  // real on-screen rect instead, and re-evaluate whenever the world transform
  // settles (pan / zoom / fly). Once near, activate for good.
  useEffect(() => {
    if (activated) return;
    const el = articleRef.current;
    if (!el) return;
    const world = el.closest('[data-testid="canvas-world"]');
    const MARGIN = 1400;
    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const near =
        r.right > -MARGIN &&
        r.left < window.innerWidth + MARGIN &&
        r.bottom > -MARGIN &&
        r.top < window.innerHeight + MARGIN;
      if (near) setActivated(true);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(evaluate);
    };
    schedule();
    const mo = world ? new MutationObserver(schedule) : null;
    if (world && mo) mo.observe(world, { attributes: true, attributeFilter: ["style"] });
    world?.addEventListener("transitionend", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      mo?.disconnect();
      world?.removeEventListener("transitionend", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [activated]);

  const down = Object.values(statuses).filter((s) => s.state === "error").length;

  return (
    <article
      ref={articleRef}
      id={id}
      className="card-sheet w-max max-w-none px-6 py-6"
      data-card-kind="prototype"
      data-testid="prototype-frames"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden />
            01&nbsp; Live product
          </p>
          <p className="max-w-[34rem] text-panel-body leading-relaxed text-ink-muted">
            {direct
              ? "Open each route and test the real app. Pages load one at a time so the server stays stable."
              : "Open each route and test the real, working prototype."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {runControls}
          {down > 0 ? (
            <button
              type="button"
              onClick={reloadAll}
              className="rounded-pill border px-2.5 py-1 text-[0.75rem] font-semibold text-unverified"
              style={{ borderColor: "var(--unverified)" }}
              data-testid="frames-down"
            >
              {down} down · Retry
            </button>
          ) : null}
          <button
            type="button"
            onClick={reloadAll}
            className="rounded-pill border border-rule px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
          >
            Reload all
          </button>
        </div>
      </header>

      {/* Rows stack down the spine; each domain's pages run horizontally. The
          mount queue frontier (mountedUpTo) is a GLOBAL row-major index, so
          reading the rows top-to-bottom, left-to-right is the boot order. */}
      <div className="flex flex-col gap-14" data-testid="route-comb">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-4" data-testid="domain-row" data-domain={row.key}>
            {/* Domain header, sized for world-space viewing: the domain key set at
                the board's serif-display scale so it stays legible at ~30% canvas
                zoom, a hairline rule extending across the row to bind its columns
                into one band, and a muted page count. */}
            <div className="flex items-baseline gap-4">
              <p
                className="font-serif text-[2.75rem] font-semibold leading-none tracking-[-0.02em] text-ink"
                data-testid="domain-label"
              >
                {row.key}
              </p>
              <span className="whitespace-nowrap font-serif text-[1.5rem] leading-none text-ink-faint" data-testid="domain-count">
                {row.items.length} {row.items.length === 1 ? "page" : "pages"}
              </span>
              <span className="h-px flex-1 bg-rule" aria-hidden />
            </div>
            <div className="flex items-start gap-8">
              {row.items.map(({ route, index }) => {
                const cleared = activated && index <= mountedUpTo;
                return cleared ? (
                  <RouteColumn
                    key={`col-${index}-${nonce}`}
                    route={route}
                    index={index}
                    isRoot={route === ""}
                    base={prototype.base}
                    direct={direct}
                    onStatus={(s) => setStatus(index, s)}
                    onSettle={() => onColumnSettle(index)}
                  />
                ) : (
                  <QueuedColumn key={`queued-${index}`} route={route} activated={activated} />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {prototype.degradedReason ? (
        <p className="mt-4 rounded-inset border border-dashed border-rule-strong px-3 py-2 text-[0.75rem] text-ink-faint" data-testid="frames-degraded">
          {prototype.degradedReason}
        </p>
      ) : null}
    </article>
  );
}

// ── Render control (start / stop the project's own dev server) ───────────────

// Mirror of the server's RunStatus (src/lib/prototype-runner.ts); the client
// only ever learns state + log tail + readyUrl, never the command.
type RunState = "stopped" | "starting" | "ready" | "error";
interface RunStatus {
  state: RunState;
  pid?: number;
  lastLines?: string[];
  readyUrl?: string;
  error?: string;
}

async function postRun(slug: string, action: "start" | "stop"): Promise<RunStatus> {
  const res = await fetch("/api/prototype-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, action }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<RunStatus> & { error?: string };
  if (body.state) return body as RunStatus;
  return { state: "error", error: body.error ?? `Request failed (${res.status})` };
}

/**
 * A runnable prototype: the canvas can start its dev server itself. Explicit
 * click only — NEVER auto-start on load. On mount we read the current status
 * (read-only; the process may already be up from an earlier request in this
 * server's lifetime), and if it's already "ready" we hand straight off to the
 * live frames. Otherwise the Render control is shown until the user starts it.
 */
function RunnablePrototype({ prototype, id }: { prototype: PrototypeInfo; id: string }) {
  const slug = prototype.slug;
  const [status, setStatus] = useState<RunStatus>({ state: "stopped" });

  const refresh = useCallback(async (): Promise<RunStatus | null> => {
    try {
      const res = await fetch(`/api/prototype-run?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null; // disabled (404) / bad request — treat as stopped
      const s = (await res.json()) as RunStatus;
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  }, [slug]);

  // Reflect any already-running process on first mount (does NOT start anything).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // While starting, poll for live log lines + the ready/error transition. The
  // POST also resolves with the final status; whichever lands first wins.
  useEffect(() => {
    if (status.state !== "starting") return;
    const t = setInterval(() => void refresh(), 1200);
    return () => clearInterval(t);
  }, [status.state, refresh]);

  const start = useCallback(async () => {
    setStatus({ state: "starting", lastLines: [] });
    setStatus(await postRun(slug, "start"));
  }, [slug]);

  const stop = useCallback(async () => {
    setStatus(await postRun(slug, "stop"));
  }, [slug]);

  if (status.state === "ready") {
    return (
      <FramesView
        prototype={prototype}
        id={id}
        runControls={
          <button
            type="button"
            onClick={stop}
            className="rounded-pill border border-rule px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
            data-testid="render-stop"
          >
            ■ Stop server
          </button>
        }
      />
    );
  }

  return <RenderControl id={id} status={status} onStart={start} onStop={stop} />;
}

/**
 * The Render control card — shown for a runnable project until its dev server is
 * ready. Honest states: idle (▶ Render), starting… (with the live log tail),
 * error/timeout (log tail + Retry). No frames mount until the server is ready.
 */
function RenderControl({
  id,
  status,
  onStart,
  onStop,
}: {
  id: string;
  status: RunStatus;
  onStart: () => void;
  onStop: () => void;
}) {
  const starting = status.state === "starting";
  const errored = status.state === "error";
  const lines = status.lastLines ?? [];

  return (
    <article
      id={id}
      className="card-sheet w-[34rem] max-w-[88vw] px-8 py-7"
      data-card-kind="prototype"
      data-testid="prototype-render"
      data-run-state={status.state}
    >
      <p className="eyebrow mb-2 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${starting ? "animate-pulse bg-accent" : errored ? "" : "bg-accent"}`}
          style={errored ? { background: "var(--unverified)" } : undefined}
          aria-hidden
        />
        The running thing
      </p>

      <div className="rounded-inset border border-dashed border-rule-strong px-5 py-6">
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
          {starting
            ? "Starting this project's dev server…"
            : errored
              ? "The dev server didn't come up."
              : "This project can start its own dev server. Render it to load the live prototype below."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!starting ? (
            <button
              type="button"
              onClick={onStart}
              className="rounded-pill bg-accent px-4 py-1.5 text-[0.8125rem] font-semibold text-accent-ink transition-opacity hover:opacity-90"
              data-testid="render-start"
            >
              {errored ? "↻ Retry" : "▶ Render"}
            </button>
          ) : (
            <>
              <span className="text-[0.8125rem] text-ink-faint" data-testid="render-starting">
                starting…
              </span>
              <button
                type="button"
                onClick={onStop}
                className="rounded-pill border border-rule px-3 py-1 text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
                data-testid="render-stop"
              >
                Stop
              </button>
            </>
          )}
        </div>

        {errored && status.error ? (
          <p className="mt-3 text-[0.8125rem]" style={{ color: "var(--unverified)" }}>
            {status.error}
          </p>
        ) : null}

        {lines.length ? (
          <pre
            className="mt-4 max-h-40 overflow-auto rounded-inset bg-paper-raised px-3 py-2 font-mono text-[0.6875rem] leading-relaxed text-ink-faint"
            data-testid="render-log"
          >
            {lines.join("\n")}
          </pre>
        ) : null}

        <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-faint">
          Some projects need their own backend running too (e.g. an API on another
          port). This control starts only the front-end dev server — start any
          companion services yourself.
        </p>
      </div>
    </article>
  );
}

/**
 * A not-yet-mounted column: the route is anchored and labelled (so the comb's
 * shape is present before its frame boots) with a designed "queued…" state.
 * Before activation it reads "waiting" (the region hasn't been looked at yet);
 * once the queue is running it reads "queued…".
 */
function QueuedColumn({ route, activated }: { route: string; activated: boolean }) {
  return (
    <div
      className="flex flex-col gap-2"
      data-testid="route-column"
      data-route={route}
      data-column-state="queued"
    >
      <ColumnLabel route={route} />
      <div
        className="relative flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-rule-strong bg-paper/60 text-center"
        style={{ width: DESKTOP.w * SCALE, height: DESKTOP.h * SCALE }}
        data-testid="frame-queued"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
        <p className="text-[0.8125rem] text-ink-faint">{activated ? "queued…" : "waiting"}</p>
        <p className="max-w-[70%] text-[0.6875rem] leading-relaxed text-ink-faint">
          Booting one route at a time keeps the app under its sign-in rate limit.
        </p>
      </div>
    </div>
  );
}

/**
 * One route's column: a desktop frame (always) and, on the root only, a mobile
 * frame — each extra frame is a full live app instance, so mobile is opt-in per
 * column (cost discipline). Carries the per-column Reload affordance and, for a
 * direct embed's later frames, the one scheduled rate-limit-cooldown reload.
 */
function RouteColumn({
  route,
  index,
  isRoot,
  base,
  direct,
  onStatus,
  onSettle,
}: {
  route: string;
  index: number;
  isRoot: boolean;
  base: string;
  direct: boolean;
  onStatus: (s: FrameStatus) => void;
  onSettle: () => void;
}) {
  const [retry, setRetry] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(isRoot);
  const reload = useCallback(() => setRetry((r) => r + 1), []);

  // One scheduled reload for a direct embed's later frames (§3): a frame that
  // booted into the hot rate-limit window may be showing the app's own sign-in
  // failure — which we CANNOT read cross-origin — so a single automatic reload
  // once the window has cooled is cheap insurance. Fires ~30s after mount, once.
  useEffect(() => {
    if (!direct || index < AUTO_RELOAD_FROM_INDEX) return;
    const t = setTimeout(() => setRetry((r) => r + 1), AUTO_RELOAD_DELAY);
    return () => clearTimeout(t);
  }, [direct, index]);

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="route-column"
      data-route={route}
      data-column-state="mounted"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <ColumnLabel route={route} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isRoot ? (
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-pressed={mobileOpen}
              className="rounded-pill border border-rule px-2 py-0.5 text-[0.6875rem] text-ink-muted transition-colors hover:text-ink"
              data-testid="toggle-mobile"
            >
              {mobileOpen ? "− mobile" : "+ mobile"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={reload}
            className="rounded-pill border border-rule px-2 py-0.5 text-[0.6875rem] text-ink-muted transition-colors hover:text-ink"
            data-testid="reload-column"
          >
            Reload
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <DeviceFrame
          device="desktop"
          base={base}
          route={route}
          retry={retry}
          direct={direct}
          onStatus={onStatus}
          onSettle={onSettle}
          onReload={reload}
        />
        {mobileOpen ? (
          <DeviceFrame
            device="mobile"
            base={base}
            route={route}
            retry={retry}
            direct={direct}
          />
        ) : null}
      </div>
    </div>
  );
}

// Per-column title strip (canvas-maker §1): the humanized page label set as a
// serif heading large enough to read at ~30% zoom, with the raw route path in the
// existing mono/muted style beneath it. Truncates so a long route can't blow out
// the column width.
function ColumnLabel({ route }: { route: string }) {
  return (
    <a
      href={`#region-build`}
      className="block min-w-0 no-underline"
      data-testid="column-label"
      title={routeLabel(route)}
    >
      <span
        className="block truncate font-serif text-[1.5rem] font-semibold leading-tight tracking-[-0.01em] text-ink"
        data-testid="page-title"
      >
        {pageName(route)}
      </span>
      <span className="block truncate font-mono text-[0.8125rem] text-ink-faint">{routeLabel(route)}</span>
    </a>
  );
}

function DeviceFrame({
  device,
  base,
  route,
  retry,
  direct,
  onStatus,
  onSettle,
  onReload,
}: {
  device: "desktop" | "mobile";
  base: string;
  route: string;
  retry: number;
  direct: boolean;
  onStatus?: (s: FrameStatus) => void;
  onSettle?: () => void;
  onReload?: () => void;
}) {
  const dim = device === "desktop" ? DESKTOP : MOBILE;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const { register, unregister, markLoaded } = useFrames();
  // Unique per column+device — many desktop frames now coexist, so keying on the
  // device alone would collide and clobber the registry / the per-route scan.
  const fid = `${device}:${route}`;

  const src = base + route + (route.includes("?") ? "&" : "?") + "_r=" + retry;

  // Load isolation. A same-origin frame whose load event never fires flips to a
  // visible error with a Retry. A direct (cross-origin) frame's failure is
  // unreadable, so on the timeout we don't claim an error — we just let the
  // queue advance (onSettle) and drop the loading veil; the manual Reload and
  // the scheduled one-shot reload are its recovery, not a fake error state.
  useEffect(() => {
    setState("loading");
    onStatus?.({ state: "loading" });
    const grace = direct ? 15000 : 8000;
    const t = setTimeout(() => {
      if (direct) {
        setState((s) => (s === "loaded" ? s : "loaded"));
        onSettle?.();
      } else {
        setState((s) => {
          if (s === "loaded") return s;
          onStatus?.({ state: "error" });
          return "error";
        });
        onSettle?.();
      }
    }, grace);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry, route, direct]);

  // Register the live handle for scanning + overrides (§7/§11/§13). Direct frames
  // register too (harmless — the same-origin scan skips a cross-origin document).
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    register({ id: fid, device, route, el });
    return () => unregister(fid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, device, route]);

  const onLoad = () => {
    setState("loaded");
    onStatus?.({ state: "loaded" });
    onSettle?.();
    const el = iframeRef.current;
    if (!el) return;
    let currentRoute = route;
    try {
      const win = el.contentWindow;
      const doc = el.contentDocument;
      if (win && doc) {
        // Report the actual route (navigation inside the frame changes it).
        const p = win.location.pathname;
        const idx = p.indexOf(base);
        currentRoute = idx >= 0 ? p.slice(idx + base.length) : route;
        forwardWheel(el, win);
      }
    } catch {
      /* cross-origin (a direct embed) — the DOM is off-limits; degrade silently */
    }
    markLoaded(fid, currentRoute);
  };

  return (
    <figure className="flex flex-col gap-2" data-testid={`frame-${device}`}>
      <div
        className="relative overflow-hidden rounded-card border border-rule bg-paper"
        style={{ width: dim.w * SCALE, height: dim.h * SCALE }}
      >
        <iframe
          ref={iframeRef}
          title={`${device} ${routeLabel(route)} prototype`}
          src={src}
          onLoad={onLoad}
          onError={() => {
            setState("error");
            onStatus?.({ state: "error" });
            onSettle?.();
          }}
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: dim.w, height: dim.h, transform: `scale(${SCALE})`, border: 0 }}
          data-frame-device={device}
          data-route={route}
        />
        {state === "loading" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/70 text-[0.75rem] text-ink-faint">
            loading…
          </div>
        ) : null}
        {state === "error" ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/95 px-4 text-center"
            data-testid={`frame-error-${device}`}
          >
            <p className="text-[0.8125rem] text-ink-muted">This frame didn&rsquo;t load.</p>
            {onReload ? (
              <button
                type="button"
                onClick={onReload}
                className="rounded-pill border border-rule px-3 py-1 text-[0.8125rem] text-ink transition-colors hover:text-accent"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <figcaption className="font-mono text-[0.6875rem] text-ink-faint">
        {device} · {dim.w}×{dim.h}
      </figcaption>
    </figure>
  );
}

/**
 * Forward wheel events from inside a frame into canvas world-space (§8): the
 * iframe swallows wheel, so re-dispatch onto the canvas viewport with the deltas
 * and cursor offset by the frame's position, keeping pan/zoom alive over frames.
 */
function forwardWheel(el: HTMLIFrameElement, win: Window) {
  const viewport = document.querySelector<HTMLElement>('[data-testid="canvas-viewport"]');
  if (!viewport) return;
  win.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const forwarded = new WheelEvent("wheel", {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        clientX: rect.left + e.clientX * SCALE,
        clientY: rect.top + e.clientY * SCALE,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        bubbles: true,
        cancelable: true,
      });
      viewport.dispatchEvent(forwarded);
      e.preventDefault();
    },
    { passive: false },
  );
}
