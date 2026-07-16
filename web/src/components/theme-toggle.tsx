"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * A quiet light/dark switch — both themes are first-class (DESIGN.md §1). The
 * default is a labelled pill (dashboard chrome); `iconOnly` renders a sun/moon
 * glyph styled like a nav row (transparent, `rounded-inset`, hover fill) for the
 * canvas sidebar footer.
 */
export function ThemeToggle({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const base = iconOnly
    ? "inline-flex items-center justify-center rounded-inset p-1.5 text-ink-muted transition-colors hover:bg-paper-raised hover:text-ink "
    : "rounded-pill border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink ";

  return (
    <button
      type="button"
      // Remount when the resolved theme lands: React does not reliably patch an
      // aria-label whose SSR value differed pre-hydration (observed: label stuck
      // at the SSR "Switch to dark theme" while the text updated). A key swap
      // replaces the element, so every attribute is written fresh.
      key={mounted ? (isDark ? "dark" : "light") : "ssr"}
      // Theme-dependent attributes must stay stable until mounted so the first
      // client render matches the SSR HTML (next-themes only resolves the theme
      // on the client); the key swap then re-renders with the real values.
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Switch theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={base + (className ?? "")}
    >
      {iconOnly ? (
        mounted && isDark ? <SunIcon /> : <MoonIcon />
      ) : mounted ? (
        isDark ? "Light" : "Dark"
      ) : (
        "Theme"
      )}
    </button>
  );
}

/** Sun — shown in dark mode (tap to go light). */
function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

/** Moon — shown in light mode (tap to go dark), and as the pre-hydration glyph. */
function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
