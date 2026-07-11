"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DesignTokens } from "@/lib/types";
import { useFrames } from "./frames-context";
import { useSession, type Scope, type Tweak } from "./session-context";
import { TweakPanel, tweakCssVar } from "./tweak-panel";
import {
  applyToComponent,
  applyToSelector,
  buildSelector,
  classify,
  componentOf,
  elementBox,
  FRAME_SCALE,
  hideOverlay,
  moveOverlay,
  renderPins,
  setVar,
  visibleText,
  type Box,
} from "./frame-dom";

/**
 * Comment mode on the live frames (§10) + the tweak panel (§11). Hovering
 * highlights the precise element via an overlay injected into the frame; a click
 * opens a floating draft (viewport-clamped, flipping above when tight) with a
 * note, @N autocomplete over existing pins, the token tweak panel, and the scope
 * selector. Saved annotations render as numbered pins injected into every frame.
 * Everything is session-only — the persistence path is the export, not the vault.
 */

interface Draft {
  device: "desktop" | "mobile";
  route: string;
  granularity: "element" | "page";
  box: Box | null;
  selector: string | null;
  text: string;
  classification: "text" | "container";
  component: string | null;
  instanceCount: number;
  routeCount: number;
  screenX: number;
  screenY: number;
  flip: boolean;
}

export function CommentController({ tokens }: { tokens: DesignTokens }) {
  const { frames, loadVersion } = useFrames();
  const { mode, granularity, annotations, addAnnotation, componentStats } = useSession();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [scope, setScope] = useState<Scope>("instance");
  const [tweaks, setTweaks] = useState<Tweak[]>([]);
  const undoRef = useRef<(() => void)[]>([]);
  const prevFocus = useRef<Element | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const revertPreview = useCallback(() => {
    for (const u of undoRef.current) u();
    undoRef.current = [];
  }, []);

  const closeDraft = useCallback(
    (revert: boolean) => {
      if (revert) revertPreview();
      setDraft(null);
      setNote("");
      setTweaks([]);
      undoRef.current = [];
      if (prevFocus.current instanceof HTMLElement) prevFocus.current.focus();
    },
    [revertPreview],
  );

  // ── Attach hover + click capture to each frame while in comment mode ─────────
  useEffect(() => {
    if (mode !== "comment") return;
    const cleanups: (() => void)[] = [];
    for (const f of frames) {
      const doc = f.el.contentDocument;
      const win = f.el.contentWindow;
      if (!doc || !win) continue;

      const onMove = (e: Event) => {
        if (granularity !== "element") return;
        const t = e.target as Element | null;
        if (!t || (t as HTMLElement).id?.startsWith?.("__ds")) return;
        moveOverlay(doc, win, t);
      };
      const onLeave = () => hideOverlay(doc);
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = f.el.getBoundingClientRect();
        const screenX = rect.left + e.clientX * FRAME_SCALE;
        const screenY = rect.top + e.clientY * FRAME_SCALE;
        const flip = screenY > window.innerHeight - 380;

        if (granularity === "page") {
          openDraft({
            device: f.device,
            route: f.route,
            granularity: "page",
            box: null,
            selector: null,
            text: "",
            classification: "container",
            component: null,
            instanceCount: 0,
            routeCount: 0,
            screenX,
            screenY,
            flip,
          });
          return;
        }

        const el = e.target as Element;
        const component = componentOf(el, Object.keys(componentStats));
        const stat = component ? componentStats[component] : undefined;
        openDraft({
          device: f.device,
          route: f.route,
          granularity: "element",
          box: elementBox(el, win),
          selector: buildSelector(el),
          text: visibleText(el),
          classification: classify(el),
          component,
          instanceCount: stat?.count ?? 0,
          routeCount: stat?.routes.length ?? 0,
          screenX,
          screenY,
          flip,
        });
      };

      doc.addEventListener("mousemove", onMove, true);
      doc.addEventListener("mouseleave", onLeave, true);
      doc.addEventListener("click", onClick, true);
      cleanups.push(() => {
        doc.removeEventListener("mousemove", onMove, true);
        doc.removeEventListener("mouseleave", onLeave, true);
        doc.removeEventListener("click", onClick, true);
        hideOverlay(doc);
      });
    }
    return () => cleanups.forEach((c) => c());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, granularity, frames, loadVersion, componentStats]);

  // Leaving comment mode closes any open draft.
  useEffect(() => {
    if (mode !== "comment" && draft) closeDraft(true);
  }, [mode, draft, closeDraft]);

  const openDraft = (d: Draft) => {
    revertPreview();
    prevFocus.current = document.activeElement;
    setNote("");
    setTweaks([]);
    // Default scope: component when a match exists, instance otherwise (§11).
    setScope(d.component ? "component" : "instance");
    setDraft(d);
  };

  // ── Live tweak application per scope (blast-radius preview) ───────────────────
  const applyTweak = useCallback(
    (t: Tweak, sc: Scope, d: Draft) => {
      const undos: (() => void)[] = [];
      const cssVar = tweakCssVar(t);
      if (sc === "token" && cssVar) {
        const value = Object.values(t.props)[0];
        for (const f of frames) {
          const doc = f.el.contentDocument;
          if (doc) undos.push(setVar(doc, cssVar, value));
        }
      } else if ((sc === "component" || (sc === "token" && !cssVar)) && d.component) {
        for (const f of frames) {
          const doc = f.el.contentDocument;
          if (doc) undos.push(applyToComponent(doc, d.component, t.props));
        }
      } else if (d.selector) {
        const doc = frames.find((f) => f.device === d.device)?.el.contentDocument;
        if (doc) undos.push(applyToSelector(doc, d.selector, t.props));
      }
      return () => undos.forEach((u) => u());
    },
    [frames],
  );

  const onAddTweak = (t: Tweak) => {
    if (!draft) return;
    const undo = applyTweak(t, scope, draft);
    undoRef.current.push(undo);
    setTweaks((prev) => [...prev, t]);
  };

  const onScopeChange = (sc: Scope) => {
    if (!draft) return;
    // Re-preview all tweaks at the new scope so the blast radius is live.
    revertPreview();
    setScope(sc);
    const undos: (() => void)[] = [];
    for (const t of tweaks) undos.push(applyTweak(t, sc, draft));
    undoRef.current = undos;
  };

  const clearTweaks = () => {
    revertPreview();
    setTweaks([]);
  };

  const save = () => {
    if (!draft) return;
    addAnnotation({
      device: draft.device,
      route: draft.route,
      granularity: draft.granularity,
      box: draft.box,
      selector: draft.selector,
      text: draft.text,
      classification: draft.classification,
      note,
      component: draft.component,
      instanceCount: draft.instanceCount,
      routeCount: draft.routeCount,
      scope,
      tweaks,
    });
    // Keep the preview applied (it's the accepted change); commit without revert.
    undoRef.current = [];
    setDraft(null);
    setNote("");
    setTweaks([]);
    if (prevFocus.current instanceof HTMLElement) prevFocus.current.focus();
  };

  // ── Numbered pins injected into every frame (per device + route) ─────────────
  useEffect(() => {
    for (const f of frames) {
      const doc = f.el.contentDocument;
      if (!doc || !doc.body) continue;
      const pins = annotations
        .filter((a) => a.device === f.device && a.route === f.route && a.box)
        .map((a) => ({ n: a.id, box: a.box! }));
      renderPins(doc, pins);
    }
  }, [annotations, frames, loadVersion]);

  // Focus the note when a draft opens.
  useEffect(() => {
    if (draft) {
      const ta = panelRef.current?.querySelector("textarea");
      (ta as HTMLTextAreaElement | null)?.focus();
    }
  }, [draft]);

  if (!draft) return null;

  const pinNo = annotations.length + 1;
  const margin = 8;
  const top = draft.flip ? undefined : draft.screenY + margin;
  const bottom = draft.flip ? window.innerHeight - draft.screenY + margin : undefined;
  const left = Math.min(Math.max(8, draft.screenX), window.innerWidth - 340);
  // Cap the panel to the space between its anchor and the far viewport edge so a
  // tall draft (tweak panel expanded) never pushes Save off-screen — it scrolls
  // internally instead. (§10: "height capped with internal scroll".)
  const maxHeight =
    (draft.flip ? window.innerHeight - (bottom ?? 0) : window.innerHeight - (top ?? 0)) - margin;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Comment draft"
      data-testid="comment-draft"
      className="fixed z-50 flex w-[20rem] max-w-[92vw] flex-col overflow-y-auto rounded-card border border-rule bg-paper p-4 shadow-lg"
      style={{ top, bottom, left, maxHeight }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeDraft(true);
        }
        // Focus trap.
        if (e.key === "Tab") {
          const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
            'button, textarea, select, [tabindex]:not([tabindex="-1"])',
          );
          if (!focusables || focusables.length === 0) return;
          const list = Array.from(focusables);
          const first = list[0];
          const last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">
          Pin {pinNo} · {draft.granularity === "page" ? "full page" : draft.classification}
        </span>
        <span className="font-mono text-[0.6875rem] text-ink-faint">
          {draft.device} · {draft.route === "" ? "/" : "/" + draft.route.replace(/\.html?$/i, "")}
        </span>
      </div>

      {draft.selector ? (
        <p className="mb-2 truncate font-mono text-[0.6875rem] text-ink-faint" title={draft.selector}>
          {draft.selector}
        </p>
      ) : null}

      <NoteField note={note} setNote={setNote} annotations={annotations} onSave={save} onCancel={() => closeDraft(true)} />

      {/* Scope selector — reviewer's starting claim, live blast-radius preview. */}
      {draft.granularity === "element" ? (
        <div className="mt-3" data-testid="scope-selector">
          {draft.component ? (
            <p className="mb-1.5 text-[0.75rem] text-ink-muted">
              This is a <span className="font-semibold text-ink">{draft.component}</span> —{" "}
              <span data-testid="scope-instance-count">
                {draft.instanceCount} instance{draft.instanceCount === 1 ? "" : "s"} across{" "}
                {draft.routeCount} route{draft.routeCount === 1 ? "" : "s"}
              </span>
              .
            </p>
          ) : (
            <p className="mb-1.5 text-[0.75rem] text-ink-faint">No matched component — instance scope.</p>
          )}
          <div className="flex flex-col gap-1">
            <ScopeRadio label="This instance only" value="instance" scope={scope} onChange={onScopeChange} />
            {draft.component ? (
              <ScopeRadio
                label={`Every ${draft.component} (${draft.instanceCount})`}
                value="component"
                scope={scope}
                onChange={onScopeChange}
              />
            ) : null}
            <ScopeRadio label="The token, everywhere" value="token" scope={scope} onChange={onScopeChange} />
          </div>
        </div>
      ) : null}

      {draft.granularity === "element" ? (
        <div className="mt-3 border-t border-rule pt-3">
          <TweakPanel tokens={tokens} classification={draft.classification} onAdd={onAddTweak} />
          {tweaks.length ? (
            <ul className="mt-2 space-y-1" data-testid="tweak-specs">
              {tweaks.map((t) => (
                <li key={t.id} className="text-[0.75rem] text-ink">
                  · {t.spec}
                </li>
              ))}
            </ul>
          ) : null}
          {tweaks.length ? (
            <button type="button" onClick={clearTweaks} className="mt-1 text-[0.6875rem] text-ink-faint underline">
              Clear tweaks
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => closeDraft(true)}
          className="rounded-pill border border-rule px-3 py-1 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          data-testid="comment-save"
          className="rounded-pill bg-accent px-3 py-1 text-[0.8125rem] font-semibold text-accent-ink"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NoteField({
  note,
  setNote,
  annotations,
  onSave,
  onCancel,
}: {
  note: string;
  setNote: (s: string) => void;
  annotations: { id: number }[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [mentions, setMentions] = useState<number[]>([]);
  return (
    <div className="relative">
      <textarea
        value={note}
        data-testid="comment-note"
        onChange={(e) => {
          const v = e.target.value;
          setNote(v);
          const m = v.match(/@(\d*)$/);
          if (m) {
            const q = m[1];
            setMentions(
              annotations.map((a) => a.id).filter((id) => (q ? String(id).startsWith(q) : true)),
            );
          } else setMentions([]);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={3}
        placeholder="Note… (@N to reference a pin, Enter to save, Shift+Enter for newline)"
        className="w-full resize-none rounded-inset border border-rule bg-paper-raised px-2.5 py-2 text-[0.875rem] text-ink outline-none focus:border-accent"
      />
      {mentions.length ? (
        <ul
          className="absolute left-0 top-full z-10 mt-1 max-h-32 w-full overflow-auto rounded-inset border border-rule bg-paper shadow"
          data-testid="mention-list"
        >
          {mentions.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setNote(note.replace(/@(\d*)$/, `@${id} `));
                  setMentions([]);
                }}
                className="block w-full px-2.5 py-1 text-left text-[0.8125rem] text-ink hover:bg-accent-wash"
              >
                @{id}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ScopeRadio({
  label,
  value,
  scope,
  onChange,
}: {
  label: string;
  value: Scope;
  scope: Scope;
  onChange: (s: Scope) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[0.8125rem] text-ink">
      <input
        type="radio"
        name="scope"
        checked={scope === value}
        onChange={() => onChange(value)}
        data-testid={`scope-${value}`}
      />
      {label}
    </label>
  );
}
