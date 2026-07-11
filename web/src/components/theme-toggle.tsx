"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/** A quiet light/dark switch — both themes are first-class (DESIGN.md §1). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      // Remount when the resolved theme lands: React does not reliably patch an
      // aria-label whose SSR value differed pre-hydration (observed: label stuck
      // at the SSR "Switch to dark theme" while the text updated). A key swap
      // replaces the element, so every attribute is written fresh.
      key={mounted ? (isDark ? "dark" : "light") : "ssr"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={
        "rounded-pill border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink " +
        (className ?? "")
      }
    >
      {mounted ? (isDark ? "Light" : "Dark") : "Theme"}
    </button>
  );
}
