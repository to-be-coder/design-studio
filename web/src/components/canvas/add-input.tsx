"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Add input to a project, anytime (decision 0036: every submission is another
 * brief). A small chrome button opens a modal in the New-project idiom (an
 * optional title + a textarea), posts the text to /api/projects/input, and on
 * success bumps the status poll via onRunStarted so it picks the research loop
 * up. The app writes the text verbatim into the project's research
 * inbox; research sorts it into the ledger on the round it runs.
 */
export function AddInputButton({
  slug,
  onRunStarted,
}: {
  slug: string;
  onRunStarted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTitle("");
    setText("");
    setError(null);
    setDone(false);
  };

  // Focus the textarea when the modal opens; Escape closes it.
  useEffect(() => {
    if (!open) return;
    textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title: title.trim() || undefined, text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not record the input.");
        setBusy(false);
        return;
      }
      setDone(true);
      setBusy(false);
      onRunStarted?.();
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-inset border border-rule bg-paper px-3 py-2 text-[0.9375rem] text-ink outline-none transition-colors focus-visible:border-accent";
  const accentButton =
    "rounded-inset border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const accentStyle = {
    borderColor: "var(--accent)",
    background: "var(--accent-wash)",
    color: "var(--accent)",
  } as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="add-input"
        className="rounded-pill border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
      >
        Add input
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-scrim px-4 py-[10vh] backdrop-blur-sm"
          onClick={close}
          data-testid="add-input-modal"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add input"
            onClick={(e) => e.stopPropagation()}
            className="card-sheet w-full max-w-lg p-6"
          >
            <p className="eyebrow mb-1">Design Studio</p>

            {done ? (
              <div data-testid="add-input-done">
                <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">Input added</h2>
                <p className="mb-5 text-[0.9375rem] leading-relaxed text-ink-muted">
                  Input recorded. Research is running.
                </p>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className={accentButton}
                    style={accentStyle}
                    data-testid="add-input-close"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mb-1 font-serif text-2xl font-semibold text-ink">Add input</h2>
                <p className="mb-5 text-[0.8125rem] leading-relaxed text-ink-muted">
                  New context, a design brief, a decision from a call. It lands in the research inbox
                  verbatim, and research sorts it into the ledger.
                </p>

                <form onSubmit={submit} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-muted">
                      Title <span className="text-ink-faint">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Notes from the kickoff call"
                      className={inputClass}
                      data-testid="add-input-title"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-muted">
                      Input
                    </span>
                    <textarea
                      ref={textRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      placeholder="Paste or type the input, in its own words."
                      className={`${inputClass} resize-y leading-relaxed`}
                      data-testid="add-input-text"
                    />
                  </label>

                  {error ? (
                    <p className="text-[0.8125rem] text-unverified" data-testid="add-input-error">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={close}
                      disabled={busy}
                      className="rounded-inset px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy || !text.trim()}
                      data-testid="add-input-submit"
                      className={accentButton}
                      style={accentStyle}
                    >
                      {busy ? "Adding…" : "Add input"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
