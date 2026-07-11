"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * A registry of the prototype's live device frames. Everything that reaches into
 * a running frame — instance scanning (§7), hover overlays / click capture (§10),
 * live token overrides (§11/§13) — needs a handle on the currently-loaded frames,
 * and needs to react when a frame (re)loads. This is that shared surface, kept
 * deliberately small: the frames register/unregister themselves, and a load
 * counter lets consumers re-scan on every (re)load.
 */

export interface FrameHandle {
  id: string;
  device: "desktop" | "mobile";
  /** Current route within the prototype ("" = root). Updated on navigation. */
  route: string;
  el: HTMLIFrameElement;
}

interface FramesContextValue {
  frames: FrameHandle[];
  /** Bumps on every frame (re)load — consumers re-scan when it changes. */
  loadVersion: number;
  register: (h: FrameHandle) => void;
  unregister: (id: string) => void;
  markLoaded: (id: string, route: string) => void;
}

const FramesContext = createContext<FramesContextValue | null>(null);

export function FramesProvider({ children }: { children: React.ReactNode }) {
  const [frames, setFrames] = useState<FrameHandle[]>([]);
  const [loadVersion, setLoadVersion] = useState(0);
  const byId = useRef(new Map<string, FrameHandle>());

  const register = useCallback((h: FrameHandle) => {
    byId.current.set(h.id, h);
    setFrames(Array.from(byId.current.values()));
  }, []);

  const unregister = useCallback((id: string) => {
    if (byId.current.delete(id)) setFrames(Array.from(byId.current.values()));
  }, []);

  const markLoaded = useCallback((id: string, route: string) => {
    const h = byId.current.get(id);
    if (h) {
      h.route = route;
      byId.current.set(id, h);
      setFrames(Array.from(byId.current.values()));
    }
    setLoadVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ frames, loadVersion, register, unregister, markLoaded }),
    [frames, loadVersion, register, unregister, markLoaded],
  );
  return <FramesContext.Provider value={value}>{children}</FramesContext.Provider>;
}

export function useFrames(): FramesContextValue {
  const ctx = useContext(FramesContext);
  if (!ctx) throw new Error("useFrames must be used within a FramesProvider");
  return ctx;
}

/** Optional accessor — returns null outside a provider (for chrome that may render without frames). */
export function useFramesOptional(): FramesContextValue | null {
  return useContext(FramesContext);
}
