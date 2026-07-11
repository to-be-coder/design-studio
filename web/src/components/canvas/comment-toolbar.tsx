"use client";

import { useEffect, useState } from "react";
import { useSession } from "./session-context";
import { buildPrototypeExport, copyText } from "./export-feedback";

/**
 * The comment-mode toolbar + hotkey (§10/§12). C toggles comment mode; the
 * granularity toggle switches Element/Page; the count reflects the session's
 * ephemeral annotations; Export copies the validate loop-back block (preamble +
 * routing protocol + entries + closing line) to the clipboard with feedback.
 */
export function CommentToolbar({ project }: { project: string }) {
  const { mode, setMode, granularity, setGranularity, annotations, clearAnnotations } = useSession();
  const [copied, setCopied] = useState<null | "ok" | "fail">(null);

  // Hotkey C — toggle comment mode (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" && e.key !== "C") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      setMode(mode === "comment" ? "read" : "comment");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  const doExport = async () => {
    const text = buildPrototypeExport(project, annotations);
    const ok = await copyText(text);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="flex items-center gap-2" data-testid="comment-toolbar">
      <button
        type="button"
        onClick={() => setMode(mode === "comment" ? "read" : "comment")}
        aria-pressed={mode === "comment"}
        data-testid="mode-comment"
        className="rounded-pill border px-3 py-1.5 text-[0.8125rem] transition-colors"
        style={{
          borderColor: mode === "comment" ? "var(--accent)" : "var(--rule)",
          background: mode === "comment" ? "var(--accent-wash)" : "var(--paper)",
          color: mode === "comment" ? "var(--accent)" : "var(--ink-muted)",
          fontWeight: mode === "comment" ? 600 : 400,
        }}
        title="Comment mode (C)"
      >
        Comment <span className="ml-1 font-mono text-[0.6875rem] opacity-70">C</span>
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "tokens" ? "read" : "tokens")}
        aria-pressed={mode === "tokens"}
        data-testid="mode-tokens"
        className="rounded-pill border px-3 py-1.5 text-[0.8125rem] transition-colors"
        style={{
          borderColor: mode === "tokens" ? "var(--accent)" : "var(--rule)",
          background: mode === "tokens" ? "var(--accent-wash)" : "var(--paper)",
          color: mode === "tokens" ? "var(--accent)" : "var(--ink-muted)",
          fontWeight: mode === "tokens" ? 600 : 400,
        }}
        title="Tokens mode — live DESIGN.md overrides"
      >
        Tokens
      </button>

      {mode === "comment" ? (
        <>
          <div className="flex gap-0.5 rounded-pill border border-rule p-0.5" role="group" aria-label="Granularity">
            {(["element", "page"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                aria-pressed={granularity === g}
                data-testid={`granularity-${g}`}
                className="rounded-pill px-2.5 py-1 text-[0.75rem] capitalize transition-colors"
                style={{
                  background: granularity === g ? "var(--accent-wash)" : "transparent",
                  color: granularity === g ? "var(--accent)" : "var(--ink-muted)",
                  fontWeight: granularity === g ? 600 : 400,
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <span className="text-[0.75rem] text-ink-faint" data-testid="annotation-count">
            {annotations.length} pin{annotations.length === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            onClick={doExport}
            data-testid="export-feedback"
            className="rounded-pill border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink transition-colors hover:text-accent"
          >
            Copy feedback
          </button>
          {annotations.length ? (
            <button
              type="button"
              onClick={clearAnnotations}
              className="text-[0.75rem] text-ink-faint underline"
            >
              Clear all
            </button>
          ) : null}
          {copied ? (
            <span
              className="text-[0.75rem]"
              data-testid="export-status"
              style={{ color: copied === "ok" ? "var(--verified)" : "var(--unverified)" }}
            >
              {copied === "ok" ? "Copied ✓" : "Copy failed"}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
