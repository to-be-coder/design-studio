"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The dashboard's one write action: a "+" that opens a modal to seed a project
 * from its first brief. On save it POSTs to /api/projects (which scaffolds the
 * vault folder), then shows the next step — the web app only seeds the raw
 * brief; the framing (restated problem, rubric, success criteria) is the
 * debrief skill's job, so the modal hands off to it explicitly.
 */
export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; name: string; drafting: boolean } | null>(
    null,
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement | null>(null);

  // The folder attributes are not typed on React inputs, so set them on the
  // element itself when it mounts (a callback ref, stable across renders).
  const folderInputRef = useCallback((el: HTMLInputElement | null) => {
    folderRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
      el.setAttribute("mozdirectory", "");
    }
  }, []);

  const filesRef = useRef<HTMLInputElement | null>(null);

  const clearFolder = () => {
    setFiles([]);
    if (folderRef.current) folderRef.current.value = "";
    if (filesRef.current) filesRef.current.value = "";
  };

  // A common top directory means a whole folder was picked; loose files have
  // none, so we just show the count.
  const commonTop =
    files.length && files.every((f) => f.webkitRelativePath)
      ? files[0].webkitRelativePath.split("/")[0]
      : "";

  const close = () => {
    if (busy) return;
    setOpen(false);
    // A created project needs the dashboard list to refresh; then reset the form.
    if (created) router.refresh();
    setName("");
    setClient("");
    setBrief("");
    clearFolder();
    setError(null);
    setCreated(null);
  };

  // Focus the first field when the modal opens; Escape closes it.
  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brief.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // Multipart when a folder is attached (each file carries its
      // folder-relative path), plain JSON otherwise.
      let res: Response;
      if (files.length > 0) {
        const fd = new FormData();
        fd.append("name", name);
        fd.append("brief", brief);
        if (client.trim()) fd.append("client", client);
        for (const f of files) fd.append("files", f, f.webkitRelativePath || f.name);
        res = await fetch("/api/projects", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, brief, client }),
        });
      }
      const data = (await res.json()) as { slug?: string; drafting?: boolean; error?: string };
      if (!res.ok || !data.slug) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setCreated({ slug: data.slug, name: name.trim(), drafting: !!data.drafting });
      setBusy(false);
    } catch {
      setError("Couldn't reach the server.");
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
        aria-label="New project"
        title="New project"
        onClick={() => setOpen(true)}
        data-testid="new-project"
        className="flex h-9 w-9 items-center justify-center rounded-inset border border-rule bg-paper text-ink-muted transition-colors hover:bg-paper-raised hover:text-ink"
      >
        <PlusIcon />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-scrim px-4 py-[10vh] backdrop-blur-sm"
          onClick={close}
          data-testid="new-project-modal"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New project"
            onClick={(e) => e.stopPropagation()}
            className="card-sheet w-full max-w-lg p-6"
          >
            <p className="eyebrow mb-1">Design Studio</p>

            {created ? (
              <div data-testid="new-project-created">
                <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">Project created</h2>
                {created.drafting ? (
                  <>
                    <p className="mb-4 text-[0.9375rem] leading-relaxed text-ink-muted">
                      &ldquo;{created.name}&rdquo; is seeded, and{" "}
                      <span className="text-ink">design-studio-debrief</span> is drafting the framing
                      now: restating the problem, extracting the rubric, setting success criteria.
                      Then research runs by itself.
                    </p>
                    <div className="mb-5 rounded-inset border border-rule bg-paper-raised px-4 py-3">
                      <p className="text-[0.9375rem] leading-relaxed text-ink">
                        Review <span className="italic">What&rsquo;s Worth Building</span> when the
                        loop stops for you. Everything stays{" "}
                        <span className="italic">proposed</span> until you rule on it.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-[0.9375rem] leading-relaxed text-ink-muted">
                      &ldquo;{created.name}&rdquo; is seeded in your vault with its first brief. The
                      web app only captures the raw brief — next, frame it:
                    </p>
                    <div className="mb-5 rounded-inset border border-rule bg-paper-raised px-4 py-3">
                      <p className="text-[0.9375rem] leading-relaxed text-ink">
                        Run{" "}
                        <code className="rounded-[3px] bg-ink/8 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
                          /design-studio-debrief
                        </code>{" "}
                        in Claude Code to frame this — restate the brief as a problem, extract the
                        hidden rubric and guiding principle, and set success criteria.
                      </p>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-inset px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/canvas/${created.slug}`)}
                    data-testid="new-project-open"
                    className={accentButton}
                    style={accentStyle}
                  >
                    Open project
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New project</h2>

                <form onSubmit={submit} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-muted">
                      Project name
                    </span>
                    <input
                      ref={nameRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Acme — Onboarding rethink"
                      className={inputClass}
                      data-testid="new-project-name"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-muted">
                      Client <span className="text-ink-faint">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="e.g. Acme Co."
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-muted">
                      First brief
                    </span>
                    <textarea
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      rows={5}
                      placeholder="The brief as handed over — what the client asked for, in their words."
                      className={`${inputClass} resize-y leading-relaxed`}
                      data-testid="new-project-brief"
                    />
                  </label>

                  <div>
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-muted">
                      Folder or files <span className="text-ink-faint">(optional)</span>
                    </span>
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                      className="hidden"
                      data-testid="new-project-folder"
                    />
                    <input
                      ref={filesRef}
                      type="file"
                      multiple
                      onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                      className="hidden"
                      data-testid="new-project-files"
                    />
                    {files.length ? (
                      <div
                        className="flex items-center gap-2 rounded-inset border border-rule bg-paper-raised px-3 py-2 text-[0.8125rem] text-ink"
                        data-testid="new-project-folder-picked"
                      >
                        <span className="truncate">
                          {commonTop ? `${commonTop} ` : ""}({files.length} file
                          {files.length === 1 ? "" : "s"})
                        </span>
                        <button
                          type="button"
                          onClick={clearFolder}
                          className="ml-auto shrink-0 text-ink-muted transition-colors hover:text-ink"
                          data-testid="new-project-folder-clear"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => folderRef.current?.click()}
                          className="rounded-inset border border-rule bg-paper px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
                          data-testid="new-project-folder-pick"
                        >
                          Attach a folder
                        </button>
                        <button
                          type="button"
                          onClick={() => filesRef.current?.click()}
                          className="text-[0.8125rem] text-ink-faint underline-offset-2 transition-colors hover:text-ink-muted hover:underline"
                          data-testid="new-project-files-pick"
                        >
                          or pick individual files
                        </button>
                      </div>
                    )}
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-faint">
                      A starter app or reference files, copied into the project for research to read. A
                      folder brings everything inside it, code files included.
                    </p>
                  </div>

                  {error ? (
                    <p className="text-[0.8125rem] text-unverified" data-testid="new-project-error">
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
                      disabled={busy || !name.trim() || !brief.trim()}
                      data-testid="new-project-submit"
                      className={accentButton}
                      style={accentStyle}
                    >
                      {busy ? "Creating…" : "Create project"}
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

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
