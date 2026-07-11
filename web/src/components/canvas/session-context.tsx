"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CanvasMode } from "@/lib/types";
import { useFrames } from "./frames-context";
import { scanFrame, setVar, type Box, type FrameScan } from "./frame-dom";
import type { TokenProposal } from "./export-feedback";

/**
 * The prototype review session — everything Comment / Tweak / Tokens share and
 * that is intentionally NOT persisted to the vault (§0, §15): the active mode,
 * the granularity, session-only annotations (the vault's one write path is the
 * export, not this app), the live token overrides (localStorage only, §13), and
 * the accumulated instance scan (§7) that the scope selector and component board
 * both read. Scanning runs whenever a frame (re)loads.
 */

export type TweakKind = "typography" | "color" | "spacing" | "gap" | "layout";

export interface Tweak {
  id: string;
  kind: TweakKind;
  label: string;
  /** The DESIGN.md token path this tweak draws from, or null (layout). */
  tokenPath: string | null;
  /** CSS props applied live (camelCase or --var). */
  props: Record<string, string>;
  /** Human-readable spec line carried verbatim into the export. */
  spec: string;
}

export type Scope = "instance" | "component" | "token";

export interface Annotation {
  id: number;
  device: "desktop" | "mobile";
  route: string;
  granularity: "element" | "page";
  box: Box | null;
  selector: string | null;
  text: string;
  classification: "text" | "container";
  note: string;
  /** Matched component base name (from the scan), or null. */
  component: string | null;
  instanceCount: number;
  routeCount: number;
  scope: Scope;
  tweaks: Tweak[];
}

export interface ComponentStat {
  count: number;
  routes: string[];
}

interface SessionValue {
  mode: CanvasMode;
  setMode: (m: CanvasMode) => void;
  granularity: "element" | "page";
  setGranularity: (g: "element" | "page") => void;

  annotations: Annotation[];
  addAnnotation: (a: Omit<Annotation, "id">) => number;
  updateAnnotation: (id: number, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: number) => void;
  clearAnnotations: () => void;

  overrides: Record<string, string>;
  setOverride: (cssVar: string, value: string) => void;
  resetOverride: (cssVar: string) => void;
  resetAllOverrides: () => void;

  /** Design-system board proposals (a DESIGN.md change proposal, §6). */
  proposals: TokenProposal[];
  addProposal: (p: Omit<TokenProposal, "id">) => number;
  removeProposal: (id: number) => void;
  clearProposals: () => void;

  /** Accumulated instance counts + routes per component (§7). */
  componentStats: Record<string, ComponentStat>;
  /** Recurring uncodified signatures on 3+ routes (§7). */
  uncodified: { sig: string; routes: string[]; sample: string }[];
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  slug,
  componentNames,
  children,
}: {
  slug: string;
  componentNames: string[];
  children: React.ReactNode;
}) {
  const { frames, loadVersion } = useFrames();
  const [mode, setMode] = useState<CanvasMode>("read");
  const [granularity, setGranularity] = useState<"element" | "page">("element");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const nextId = useRef(1);

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const overrideKey = `canvas-overrides:${slug}`;

  const [proposals, setProposals] = useState<TokenProposal[]>([]);
  const nextProposalId = useRef(1);
  const addProposal = useCallback((p: Omit<TokenProposal, "id">): number => {
    const id = nextProposalId.current++;
    setProposals((prev) => [...prev, { ...p, id }]);
    return id;
  }, []);
  const removeProposal = useCallback((id: number) => {
    setProposals((prev) => prev.filter((x) => x.id !== id));
  }, []);
  const clearProposals = useCallback(() => setProposals([]), []);

  // Load persisted overrides once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(overrideKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only trust a plain object of string→string. A corrupted or
        // previous-schema record (array, string, nested values) falls back to
        // no overrides rather than feeding junk into setProperty on the frames.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const clean: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "string") clean[k] = v;
          }
          setOverrides(clean);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistOverrides = useCallback(
    (next: Record<string, string>) => {
      try {
        localStorage.setItem(overrideKey, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    },
    [overrideKey],
  );

  const addAnnotation = useCallback((a: Omit<Annotation, "id">): number => {
    const id = nextId.current++;
    setAnnotations((prev) => [...prev, { ...a, id }]);
    return id;
  }, []);
  const updateAnnotation = useCallback((id: number, patch: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);
  const removeAnnotation = useCallback((id: number) => {
    setAnnotations((prev) => prev.filter((x) => x.id !== id));
  }, []);
  const clearAnnotations = useCallback(() => setAnnotations([]), []);

  const applyOverridesToAllFrames = useCallback(
    (next: Record<string, string>) => {
      for (const f of frames) {
        const doc = f.el.contentDocument;
        if (!doc) continue;
        for (const [cssVar, value] of Object.entries(next)) setVar(doc, cssVar, value);
      }
    },
    [frames],
  );

  const setOverride = useCallback(
    (cssVar: string, value: string) => {
      setOverrides((prev) => {
        const next = { ...prev, [cssVar]: value };
        persistOverrides(next);
        return next;
      });
      for (const f of frames) {
        const doc = f.el.contentDocument;
        if (doc) setVar(doc, cssVar, value);
      }
    },
    [frames, persistOverrides],
  );
  const resetOverride = useCallback(
    (cssVar: string) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[cssVar];
        persistOverrides(next);
        return next;
      });
      for (const f of frames) {
        const doc = f.el.contentDocument;
        if (doc) doc.documentElement.style.removeProperty(cssVar);
      }
    },
    [frames, persistOverrides],
  );
  const resetAllOverrides = useCallback(() => {
    for (const f of frames) {
      const doc = f.el.contentDocument;
      if (!doc) continue;
      for (const k of Object.keys(overrides)) doc.documentElement.style.removeProperty(k);
    }
    setOverrides({});
    persistOverrides({});
  }, [frames, overrides, persistOverrides]);

  // ── Scan accumulation + re-apply overrides to newly loaded frames (§7/§13) ──
  const scanByRoute = useRef<Record<string, FrameScan>>({});
  const [scanVersion, setScanVersion] = useState(0);
  useEffect(() => {
    let changed = false;
    for (const f of frames) {
      const doc = f.el.contentDocument;
      if (!doc || !doc.body) continue;
      // Newly loaded frame picks up current overrides.
      for (const [cssVar, value] of Object.entries(overrides)) setVar(doc, cssVar, value);
      try {
        scanByRoute.current[f.route] = scanFrame(doc, componentNames);
        changed = true;
      } catch {
        /* cross-origin/unavailable — skip */
      }
    }
    if (changed) setScanVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadVersion, frames, componentNames]);
  void applyOverridesToAllFrames; // reserved for reload-all flows

  const { componentStats, uncodified } = useMemo(() => {
    const stats: Record<string, ComponentStat> = {};
    const sigRoutes: Record<string, { routes: Set<string>; sample: string }> = {};
    for (const [route, scan] of Object.entries(scanByRoute.current)) {
      for (const c of scan.components) {
        const s = (stats[c.base] ??= { count: 0, routes: [] });
        s.count += c.count;
        if (c.count > 0 && !s.routes.includes(route)) s.routes.push(route);
      }
      for (const sig of scan.signatures) {
        const entry = (sigRoutes[sig.sig] ??= { routes: new Set(), sample: sig.sample });
        if (sig.count > 0) entry.routes.add(route);
      }
    }
    const codified = new Set(componentNames);
    const uncod = Object.entries(sigRoutes)
      .filter(([sig, v]) => v.routes.size >= 3 && !codified.has(sig))
      .map(([sig, v]) => ({ sig, routes: [...v.routes], sample: v.sample }));
    return { componentStats: stats, uncodified: uncod };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanVersion, componentNames]);

  const value = useMemo<SessionValue>(
    () => ({
      mode,
      setMode,
      granularity,
      setGranularity,
      annotations,
      addAnnotation,
      updateAnnotation,
      removeAnnotation,
      clearAnnotations,
      overrides,
      setOverride,
      resetOverride,
      resetAllOverrides,
      proposals,
      addProposal,
      removeProposal,
      clearProposals,
      componentStats,
      uncodified,
    }),
    [
      mode,
      granularity,
      annotations,
      addAnnotation,
      updateAnnotation,
      removeAnnotation,
      clearAnnotations,
      overrides,
      setOverride,
      resetOverride,
      resetAllOverrides,
      proposals,
      addProposal,
      removeProposal,
      clearProposals,
      componentStats,
      uncodified,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
