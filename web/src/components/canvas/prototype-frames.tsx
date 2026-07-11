"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrototypeInfo } from "@/lib/types";
import { useFrames, type FrameHandle } from "./frames-context";

/**
 * The live prototype frames (§9): the flow literally ends at the running thing.
 * Device frames (desktop ~1440px native + a narrower mobile) embed the prototype
 * through the same-origin proxy, so §7/§10–§13 can reach inside them. Frames
 * mount lazily (only near the viewport) and unmount when far off-canvas (the
 * performance law); each frame isolates its own load status with a Retry; wheel
 * events inside a frame are forwarded into canvas world-space so pan/zoom keeps
 * working over a frame. No prototype → a designed empty state.
 */

const DESKTOP = { w: 1440, h: 900 };
const MOBILE = { w: 390, h: 780 };
const SCALE = 0.5; // shared scale so mobile is genuinely narrower

interface FrameStatus {
  state: "loading" | "loaded" | "error";
}

export function PrototypeFrames({ prototype, id }: { prototype: PrototypeInfo; id: string }) {
  const [route, setRoute] = useState<string>(prototype.routes[0] ?? "");
  // A reload-all nonce; bumping remounts every frame (fresh load).
  const [nonce, setNonce] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, FrameStatus>>({});

  const setStatus = useCallback((fid: string, s: FrameStatus) => {
    setStatuses((prev) => ({ ...prev, [fid]: s }));
  }, []);

  const down = Object.entries(statuses).filter(([, s]) => s.state === "error").length;

  if (!prototype.embeddable) {
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

  return (
    <article
      id={id}
      className="card-sheet w-[56rem] max-w-[94vw] px-6 py-6"
      data-card-kind="prototype"
      data-testid="prototype-frames"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden />
            Live prototype
          </p>
          <p className="text-[0.8125rem] text-ink-faint">The real running thing, embedded same-origin.</p>
        </div>
        <div className="flex items-center gap-2">
          {down > 0 ? (
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="rounded-pill border px-2.5 py-1 text-[0.75rem] font-semibold text-unverified"
              style={{ borderColor: "var(--unverified)" }}
              data-testid="frames-down"
            >
              {down} down · Retry
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="rounded-pill border border-rule px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
          >
            Reload all
          </button>
        </div>
      </header>

      {prototype.routes.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-1" role="group" aria-label="Prototype routes" data-testid="route-rail">
          {prototype.routes.map((r) => (
            <button
              key={r || "root"}
              type="button"
              onClick={() => setRoute(r)}
              aria-pressed={route === r}
              className="rounded-pill px-2.5 py-1 text-[0.75rem] transition-colors"
              style={{
                background: route === r ? "var(--accent-wash)" : "transparent",
                color: route === r ? "var(--accent)" : "var(--ink-muted)",
                border: "1px solid var(--rule)",
                fontWeight: route === r ? 600 : 400,
              }}
            >
              {r === "" ? "/" : "/" + r.replace(/\.html?$/i, "")}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-start gap-6">
        <DeviceFrame
          key={`desktop-${route}-${nonce}`}
          device="desktop"
          base={prototype.base}
          route={route}
          onStatus={(s) => setStatus("desktop", s)}
        />
        <DeviceFrame
          key={`mobile-${route}-${nonce}`}
          device="mobile"
          base={prototype.base}
          route={route}
          onStatus={(s) => setStatus("mobile", s)}
        />
      </div>

      {prototype.degradedReason ? (
        <p className="mt-4 rounded-inset border border-dashed border-rule-strong px-3 py-2 text-[0.75rem] text-ink-faint" data-testid="frames-degraded">
          {prototype.degradedReason}
        </p>
      ) : null}
    </article>
  );
}

function DeviceFrame({
  device,
  base,
  route,
  onStatus,
}: {
  device: "desktop" | "mobile";
  base: string;
  route: string;
  onStatus: (s: FrameStatus) => void;
}) {
  const dim = device === "desktop" ? DESKTOP : MOBILE;
  const holderRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const { register, unregister, markLoaded } = useFrames();
  const fid = `${device}`;

  // Lazy mount: only render the iframe when the holder nears the viewport;
  // unmount when far off-canvas (the §8 performance law).
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setNear(entries.some((e) => e.isIntersecting)),
      { rootMargin: "1200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src = base + route + (route.includes("?") ? "&" : "?") + "_r=" + retry;

  // Load isolation: a timeout flips to error so a dead frame shows Retry, never
  // hangs the board.
  useEffect(() => {
    if (!near) return;
    setState("loading");
    onStatus({ state: "loading" });
    const t = setTimeout(() => {
      setState((s) => (s === "loaded" ? s : "error"));
    }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, retry, route]);

  // Register/unregister the live handle for scanning + overrides (§7/§11/§13).
  useEffect(() => {
    if (!near) return;
    const el = iframeRef.current;
    if (!el) return;
    register({ id: fid, device, route, el });
    return () => unregister(fid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, fid, device, route]);

  const onLoad = () => {
    setState("loaded");
    onStatus({ state: "loaded" });
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
      /* cross-origin (shouldn't happen via the proxy) — degrade silently */
    }
    markLoaded(fid, currentRoute);
  };

  return (
    <figure ref={holderRef} className="flex flex-col gap-2" data-testid={`frame-${device}`}>
      <div
        className="relative overflow-hidden rounded-card border border-rule bg-paper"
        style={{ width: dim.w * SCALE, height: dim.h * SCALE }}
      >
        {near ? (
          <>
            <iframe
              ref={iframeRef}
              title={`${device} prototype`}
              src={src}
              onLoad={onLoad}
              onError={() => {
                setState("error");
                onStatus({ state: "error" });
              }}
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: dim.w, height: dim.h, transform: `scale(${SCALE})`, border: 0 }}
              data-frame-device={device}
            />
            {state === "error" ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/95 px-4 text-center"
                data-testid={`frame-error-${device}`}
              >
                <p className="text-[0.8125rem] text-ink-muted">This frame didn&rsquo;t load.</p>
                <button
                  type="button"
                  onClick={() => setRetry((r) => r + 1)}
                  className="rounded-pill border border-rule px-3 py-1 text-[0.8125rem] text-ink transition-colors hover:text-accent"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[0.75rem] text-ink-faint">
            {device}
          </div>
        )}
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
