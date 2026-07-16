"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  WwbDisposition,
  WwbEntry,
  WwbModel,
  WwbParked,
  WwbQuestion,
} from "@/lib/types";
import { Reading } from "./markdown";
import { ReceiptLinks } from "./receipts";

/**
 * What's Worth Building v2, the single human review surface, organised as an
 * accessible tab bar rather than one long scroll. Tabs, in order: Parked (the 🔴
 * ruling cards), Questions (the agenda answer boxes), Proposed (the triage entries
 * with verdict buttons), Rulings (Build now + Backlog + Don't build), and Context
 * (Implied but unruled + the blocking band). The review batch state (selected
 * verdicts, typed answers, ruling draft) lives on the tab controller, so it
 * survives every tab switch, and the sticky submit bar stays on the three review
 * tabs. A parked 🔴 lands the reader on Parked (ruling-first). Every visual value
 * reuses the existing accent / state idioms; verdict identity is carried by the
 * word, never a semantic colour.
 */
export function WwbPane({
  wwb,
  slug,
  runsEnabled,
  onFocusReceipt,
  onRunStarted,
}: {
  wwb: WwbModel;
  slug: string;
  runsEnabled?: boolean;
  onFocusReceipt?: (docKey: string) => void;
  onRunStarted?: () => void;
}) {
  return (
    <div data-testid="wwb-pane">
      <p className="eyebrow mb-1">What&rsquo;s Worth Building</p>
      <p className="mb-6 text-[0.8125rem] text-ink-faint">
        What to build and what not to, every reason carrying a receipt to the evidence.
        {wwb.updated ? ` Updated ${wwb.updated}.` : ""}
      </p>

      <WwbTabs
        wwb={wwb}
        slug={slug}
        runsEnabled={!!runsEnabled}
        onFocusReceipt={onFocusReceipt}
        onRunStarted={onRunStarted}
      />
    </div>
  );
}

/**
 * The five review tabs, in order. The keys are the contract's section names; the
 * labels are plain words that say what the reader does or finds there (the
 * system vocabulary stays in the docs, never in the chrome).
 */
type TabKey = "parked" | "questions" | "proposed" | "rulings" | "context";

const TABS: { key: TabKey; label: string; showCount: boolean }[] = [
  { key: "parked", label: "Decisions for you", showCount: true },
  { key: "questions", label: "Questions for you", showCount: true },
  { key: "proposed", label: "Ideas to sort", showCount: true },
  { key: "rulings", label: "Already decided", showCount: false },
  { key: "context", label: "Background", showCount: false },
];

// ── The tabbed review surface: state that spans the tabs + the sticky bar ──────

interface VerdictState {
  verdict: WwbDisposition;
  note: string;
  unblocks: string;
}
interface RulingState {
  id: string;
  disposition: "accept" | "reshape" | "reject";
  words: string;
  confirmed: boolean;
}

function WwbTabs({
  wwb,
  slug,
  runsEnabled,
  onFocusReceipt,
  onRunStarted,
}: {
  wwb: WwbModel;
  slug: string;
  runsEnabled: boolean;
  onFocusReceipt?: (docKey: string) => void;
  onRunStarted?: () => void;
}) {
  const router = useRouter();
  const [verdicts, setVerdicts] = useState<Record<string, VerdictState>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ruling, setRuling] = useState<RulingState | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulingFirst = wwb.parked.length > 0;

  // Research's dont-build-lean proposals are NOT human rulings: they render on
  // the Ideas-to-sort tab (a receded, uncounted group), never under Already
  // decided, which holds only what a human ruled.
  const ruledOut = wwb.dontBuild.filter((e) => e.source !== "proposed");
  const recommendedCuts = wwb.dontBuild.filter((e) => e.source === "proposed");

  const counts: Record<TabKey, number> = {
    parked: wwb.parked.length,
    questions: wwb.questions.length,
    proposed: wwb.proposed.length,
    rulings: wwb.buildNow.length + wwb.backlog.length + ruledOut.length,
    context: wwb.unruled.length + wwb.blocking.length,
  };

  // Default tab: the first non-empty of Parked, Questions, Proposed; else Rulings.
  // A parked 🔴 therefore lands the reader on the ruling first (ruling-first mode).
  const defaultTab: TabKey =
    counts.parked > 0
      ? "parked"
      : counts.questions > 0
        ? "questions"
        : counts.proposed > 0
          ? "proposed"
          : "rulings";
  const [active, setActive] = useState<TabKey>(defaultTab);

  const setVerdict = (id: string, verdict: WwbDisposition | null) => {
    setConfirmingSubmit(false);
    setVerdicts((prev) => {
      const next = { ...prev };
      if (verdict == null || prev[id]?.verdict === verdict) delete next[id];
      else next[id] = { verdict, note: prev[id]?.note ?? "", unblocks: prev[id]?.unblocks ?? "" };
      return next;
    });
  };
  const patchVerdict = (id: string, patch: Partial<VerdictState>) =>
    setVerdicts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));

  const rulingCandidate = ruling ? wwb.parked.find((p) => p.id === ruling.id) ?? null : null;

  const verdictList = Object.entries(verdicts).map(([id, v]) => ({
    id,
    verdict: v.verdict,
    note: v.note.trim() || undefined,
    unblocks: v.verdict === "backlog" && v.unblocks.trim() ? v.unblocks.trim() : undefined,
  }));
  const answerList = Object.entries(answers)
    .map(([id, text]) => ({ id, text: text.trim() }))
    .filter((a) => a.text.length > 0);
  const rulingPayload =
    ruling && ruling.confirmed && ruling.words.trim() && rulingCandidate
      ? {
          id: ruling.id,
          kind: rulingCandidate.kind,
          disposition: ruling.disposition,
          words: ruling.words.trim(),
          confirmed: true as const,
          candidate: rulingCandidate.candidate,
        }
      : undefined;

  const batchSize = verdictList.length + answerList.length + (rulingPayload ? 1 : 0);

  const submit = async () => {
    if (batchSize === 0 || busy) return;
    if (!confirmingSubmit) {
      setConfirmingSubmit(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          wwbRound: wwb.round,
          entriesHash: wwb.entriesHash,
          verdicts: verdictList,
          answers: answerList,
          ruling: rulingPayload,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not record the review.");
        setBusy(false);
        setConfirmingSubmit(false);
        return;
      }
      setDone(true);
      setBusy(false);
      onRunStarted?.();
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
      setConfirmingSubmit(false);
    }
  };

  const isReviewTab = active === "parked" || active === "questions" || active === "proposed";

  // #wwb-review lands here (the tabs), which show the default tab on mount.
  return (
    <div id="wwb-review" data-testid="wwb-review">
      <TabBar counts={counts} active={active} onSelect={setActive} />

      <TabPanel tabKey="parked" active={active}>
        {counts.parked === 0 ? (
          <EmptyTab>Nothing is waiting on your decision right now.</EmptyTab>
        ) : (
          // Ruling-first: the parked 🔴 leads; proposed entries wait on the ruling.
          wwb.parked.map((p) => (
            <RulingCard
              key={p.id}
              parked={p}
              slug={slug}
              interactive={runsEnabled && !done}
              ruling={ruling}
              onFocusReceipt={onFocusReceipt}
              onPick={(disposition) =>
                setRuling((prev) =>
                  prev && prev.id === p.id && prev.disposition === disposition
                    ? null
                    : { id: p.id, disposition, words: prev?.id === p.id ? prev.words : "", confirmed: false },
                )
              }
              onWords={(words) =>
                setRuling((prev) => (prev && prev.id === p.id ? { ...prev, words } : prev))
              }
              onConfirm={() =>
                setRuling((prev) => (prev && prev.id === p.id ? { ...prev, confirmed: true } : prev))
              }
            />
          ))
        )}
      </TabPanel>

      <TabPanel tabKey="questions" active={active}>
        {counts.questions === 0 ? (
          <EmptyTab>No open questions for you right now.</EmptyTab>
        ) : (
          <ul className="space-y-4" data-testid="wwb-questions">
            {wwb.questions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                slug={slug}
                interactive={runsEnabled && !done}
                value={answers[q.id] ?? ""}
                onFocusReceipt={onFocusReceipt}
                onChange={(text) => {
                  setConfirmingSubmit(false);
                  setAnswers((prev) => ({ ...prev, [q.id]: text }));
                }}
              />
            ))}
          </ul>
        )}
      </TabPanel>

      <TabPanel tabKey="proposed" active={active}>
        {counts.proposed === 0 && recommendedCuts.length === 0 ? (
          <EmptyTab>No ideas to sort right now.</EmptyTab>
        ) : (
          <>
            {rulingFirst && counts.proposed > 0 ? (
              <p className="mb-3 text-[0.8125rem] italic text-ink-muted" data-testid="proposed-rescope-note">
                These re-scope after you rule the framing.
              </p>
            ) : null}
            <ul className="space-y-4" data-testid="wwb-proposed">
              {wwb.proposed.map((e) => (
                <ProposedEntry
                  key={e.id}
                  entry={e}
                  slug={slug}
                  onFocusReceipt={onFocusReceipt}
                  triage={runsEnabled && !rulingFirst && !done}
                  state={verdicts[e.id]}
                  onVerdict={(v) => setVerdict(e.id, v)}
                  onPatch={(patch) => patchVerdict(e.id, patch)}
                />
              ))}
            </ul>
            <RecommendedCuts entries={recommendedCuts} slug={slug} onFocusReceipt={onFocusReceipt} />
          </>
        )}
      </TabPanel>

      <TabPanel tabKey="rulings" active={active}>
        {counts.rulings === 0 ? (
          <EmptyTab>Nothing decided yet. What you rule lands here: build now, backlog, or don&rsquo;t build.</EmptyTab>
        ) : (
          <>
            <BuildNow entries={wwb.buildNow} slug={slug} onFocusReceipt={onFocusReceipt} />
            <Backlog entries={wwb.backlog} slug={slug} onFocusReceipt={onFocusReceipt} />
            <DontBuild entries={ruledOut} slug={slug} onFocusReceipt={onFocusReceipt} />
          </>
        )}
      </TabPanel>

      <TabPanel tabKey="context" active={active}>
        {counts.context === 0 ? (
          <EmptyTab>Background that does not need a decision yet shows up here.</EmptyTab>
        ) : (
          <>
            <Unruled entries={wwb.unruled} slug={slug} onFocusReceipt={onFocusReceipt} />
            {wwb.blocking.length ? (
              <section
                className="mt-8 rounded-inset border px-4 py-3"
                data-testid="wwb-blocking"
                style={{ borderColor: "var(--accent-edge)", background: "var(--accent-wash)" }}
              >
                <p className="eyebrow mb-1" style={{ color: "var(--accent)" }}>
                  Still being researched
                </p>
                <p className="mb-2 text-[0.8125rem] text-ink-muted">
                  Open questions the loop is still working on. When one gets answered, the idea it was holding back moves tabs.
                </p>
                <ReceiptLinks receipts={wwb.blocking} slug={slug} onFocus={onFocusReceipt} />
              </section>
            ) : null}
          </>
        )}
      </TabPanel>

      {isReviewTab ? (
        <SubmitBar
          runsEnabled={runsEnabled}
          done={done}
          busy={busy}
          confirmingSubmit={confirmingSubmit}
          batchSize={batchSize}
          summary={summarize(verdictList, answerList, !!rulingPayload)}
          error={error}
          onSubmit={submit}
          onBack={() => setConfirmingSubmit(false)}
        />
      ) : null}
    </div>
  );
}

/** The accessible tab bar: roving tabindex + arrow keys, accent on the active tab. */
function TabBar({
  counts,
  active,
  onSelect,
}: {
  counts: Record<TabKey, number>;
  active: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    onSelect(TABS[next].key);
    btnRefs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="What's Worth Building sections" className="mb-6 flex flex-wrap gap-2">
      {TABS.map((t, i) => {
        const isActive = active === t.key;
        const empty = counts[t.key] === 0;
        return (
          <button
            key={t.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`wwb-tab-${t.key}`}
            data-testid={`wwb-tab-${t.key}`}
            aria-selected={isActive}
            aria-controls={`wwb-panel-${t.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="rounded-pill border px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors"
            style={
              isActive
                ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
                : {
                    background: "transparent",
                    color: empty ? "var(--ink-faint)" : "var(--ink-muted)",
                    borderColor: "var(--rule-strong)",
                  }
            }
          >
            {t.label}
            {t.showCount ? <span className="ml-1.5 font-normal tabular-nums">({counts[t.key]})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** One tab panel, kept mounted (hidden when inactive) so batch + draft state persists. */
function TabPanel({
  tabKey,
  active,
  children,
}: {
  tabKey: TabKey;
  active: TabKey;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`wwb-panel-${tabKey}`}
      aria-labelledby={`wwb-tab-${tabKey}`}
      hidden={active !== tabKey}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

/** A quiet one-line empty state for a tab with nothing in it. */
function EmptyTab({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.9375rem] italic text-ink-faint" data-testid="wwb-empty">
      {children}
    </p>
  );
}

/** The sticky review bar: the destination-split summary + the two-step submit. */
function SubmitBar({
  runsEnabled,
  done,
  busy,
  confirmingSubmit,
  batchSize,
  summary,
  error,
  onSubmit,
  onBack,
}: {
  runsEnabled: boolean;
  done: boolean;
  busy: boolean;
  confirmingSubmit: boolean;
  batchSize: number;
  summary: string;
  error: string | null;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="sticky bottom-0 z-10 mt-6 border-t bg-desk/95 px-1 py-3 backdrop-blur"
      style={{ borderColor: "var(--accent-edge)" }}
    >
      {!runsEnabled ? (
        <p className="text-[0.8125rem] text-ink-muted" data-testid="review-readonly">
          Review runs from Claude Code.
        </p>
      ) : done ? (
        <p className="text-[0.8125rem] text-ink-muted" data-testid="review-submitted">
          Review recorded. Research is resuming in the background.
        </p>
      ) : (
        <>
          <p className="mb-2 text-[0.8125rem] text-ink-muted" data-testid="review-summary">
            {summary}
          </p>
          {error ? <p className="mb-2 text-[0.8125rem] text-unverified">{error}</p> : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={batchSize === 0 || busy}
            data-testid="submit-review"
            className="rounded-inset border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "var(--accent)", background: "var(--accent-wash)", color: "var(--accent)" }}
          >
            {busy ? "Recording review…" : confirmingSubmit ? "Confirm and record review" : "Record review"}
          </button>
          {confirmingSubmit && !busy ? (
            <button
              type="button"
              onClick={onBack}
              className="ml-3 text-[0.8125rem] text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Back
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/** The destination-split live summary of the pending batch. */
function summarize(
  verdicts: { verdict: WwbDisposition }[],
  answers: unknown[],
  ruling: boolean,
): string {
  const n = (v: WwbDisposition) => verdicts.filter((x) => x.verdict === v).length;
  const decisionBits: string[] = [];
  if (n("build-now")) decisionBits.push(`${n("build-now")} build now`);
  if (n("backlog")) decisionBits.push(`${n("backlog")} backlog`);
  if (n("dont-build")) decisionBits.push(`${n("dont-build")} don't build`);
  if (ruling) decisionBits.push("1 ruling");
  const parts: string[] = [];
  if (decisionBits.length) parts.push(`${decisionBits.join(", ")}: write to Decisions/.`);
  if (answers.length) parts.push(`${answers.length} answer${answers.length === 1 ? "" : "s"}: resumes research.`);
  return parts.length ? parts.join(" ") : "Nothing selected yet.";
}

// ── The ruling card: a decision only the human can make ───────────────────────

function RulingCard({
  parked,
  slug,
  interactive,
  ruling,
  onFocusReceipt,
  onPick,
  onWords,
  onConfirm,
}: {
  parked: WwbParked;
  slug: string;
  interactive: boolean;
  ruling: RulingState | null;
  onFocusReceipt?: (docKey: string) => void;
  onPick: (d: "accept" | "reshape" | "reject") => void;
  onWords: (w: string) => void;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const active = ruling?.id === parked.id ? ruling : null;
  const words = active?.words ?? "";
  const canRecord = interactive && !!active && words.trim().length > 0;

  return (
    <article
      data-testid="wwb-ruling"
      data-parked={parked.id}
      className="mb-5 rounded-inset border bg-paper px-5 py-4"
      style={{ borderColor: "var(--accent-edge)" }}
    >
      <p className="eyebrow mb-1" style={{ color: "var(--accent)" }}>
        A decision only you can make
      </p>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="font-sans text-[1rem] font-semibold text-ink">{parked.title}</h4>
        <span className="eyebrow">{parked.kind.replace(/-/g, " ")}</span>
      </div>

      {parked.candidate ? (
        <blockquote className="my-3 rounded-inset bg-paper-raised px-5 py-3 font-serif text-[1.2rem] italic leading-snug text-ink" data-testid="ruling-candidate">
          <span aria-hidden className="mr-1 text-ink-faint">&ldquo;</span>
          {parked.candidate}
          <span aria-hidden className="ml-1 text-ink-faint">&rdquo;</span>
        </blockquote>
      ) : null}

      {parked.bodyBlocks.length ? (
        <div className="mb-3 max-w-[34rem] text-[0.9375rem]">
          <Reading blocks={parked.bodyBlocks} />
        </div>
      ) : null}

      {parked.receipts.length ? (
        <div className="mb-3">
          <ReceiptLinks receipts={parked.receipts} slug={slug} onFocus={onFocusReceipt} />
        </div>
      ) : null}

      {interactive ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["accept", "reshape", "reject"] as const).map((d) => (
              <button
                key={d}
                type="button"
                data-testid={`ruling-${d}`}
                aria-pressed={active?.disposition === d}
                onClick={() => {
                  setConfirming(false);
                  onPick(d);
                }}
                className="rounded-pill border px-3 py-1 text-[0.8125rem] font-semibold capitalize transition-colors"
                style={
                  active?.disposition === d
                    ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
                    : { background: "transparent", color: "var(--ink-muted)", borderColor: "var(--rule-strong)" }
                }
              >
                {d}
              </button>
            ))}
          </div>

          {active ? (
            <div>
              <textarea
                value={words}
                onChange={(e) => {
                  setConfirming(false);
                  onWords(e.target.value);
                }}
                rows={3}
                placeholder="In your own words, the ruling, so research records your reasoning, not ours…"
                data-testid="ruling-words"
                className="w-full resize-y rounded-inset border border-rule bg-paper px-3 py-2 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors focus-visible:border-accent"
              />

              {active.confirmed ? (
                <p className="mt-2 text-[0.8125rem] text-ink-muted" data-testid="ruling-recorded">
                  Ruling ready. Record the review below to send it.
                </p>
              ) : confirming ? (
                <div className="mt-3">
                  <p className="mb-2 text-[0.8125rem] text-ink">
                    {`Recording ${parked.supersedes ? `supersedes decision ${parked.supersedes} and ` : ""}re-scopes Build now against your ruling.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onConfirm();
                      setConfirming(false);
                    }}
                    data-testid="ruling-confirm"
                    className="rounded-inset border px-3 py-1 text-[0.8125rem] font-semibold transition-colors"
                    style={{ borderColor: "var(--accent)", background: "var(--accent-wash)", color: "var(--accent)" }}
                  >
                    Confirm ruling
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="ml-3 text-[0.8125rem] text-ink-muted underline underline-offset-2 hover:text-ink"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!canRecord}
                  data-testid="ruling-record"
                  className="mt-3 rounded-inset border px-3 py-1 text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  Record ruling
                </button>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

// ── A proposed entry: verdict buttons (triage) or read-only ───────────────────

function ProposedEntry({
  entry,
  slug,
  triage,
  state,
  onFocusReceipt,
  onVerdict,
  onPatch,
}: {
  entry: WwbEntry;
  slug: string;
  triage: boolean;
  state?: VerdictState;
  onFocusReceipt?: (docKey: string) => void;
  onVerdict: (v: WwbDisposition | null) => void;
  onPatch: (patch: Partial<VerdictState>) => void;
}) {
  const pending = !!state;
  return (
    <li
      data-testid="wwb-entry"
      data-entry={entry.id}
      className="rounded-inset border bg-paper px-4 py-3"
      style={{
        borderColor: "var(--rule)",
        borderLeft: pending ? "2px solid var(--accent)" : undefined,
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h4 className="font-sans text-[1rem] font-semibold text-ink">{entry.title}</h4>
        {pending ? (
          <span
            className="shrink-0 rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
            style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
            data-testid="in-this-review"
          >
            In this review
          </span>
        ) : null}
      </div>
      <Reasons entry={entry} slug={slug} onFocusReceipt={onFocusReceipt} />

      {triage ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Verdict for ${entry.title}`}>
            <VerdictButton label="Build now" verdict="build-now" testid="verdict-build-now" state={state} onVerdict={onVerdict} />
            <VerdictButton label="Backlog" verdict="backlog" testid="verdict-backlog" state={state} onVerdict={onVerdict} />
            <VerdictButton label="Don't build" verdict="dont-build" testid="verdict-dont-build" state={state} onVerdict={onVerdict} />
          </div>
          {state ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={state.note}
                onChange={(e) => onPatch({ note: e.target.value })}
                rows={2}
                placeholder="In your own words (optional)…"
                data-testid="verdict-note"
                className="w-full resize-y rounded-inset border border-rule bg-paper px-3 py-2 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors focus-visible:border-accent"
              />
              {state.verdict === "backlog" ? (
                <input
                  type="text"
                  value={state.unblocks}
                  onChange={(e) => onPatch({ unblocks: e.target.value })}
                  placeholder="What unblocks it? (optional)"
                  data-testid="verdict-unblocks"
                  className="w-full rounded-inset border border-rule bg-paper px-3 py-2 text-[0.9375rem] text-ink outline-none transition-colors focus-visible:border-accent"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function VerdictButton({
  label,
  verdict,
  testid,
  state,
  onVerdict,
}: {
  label: string;
  verdict: WwbDisposition;
  testid: string;
  state?: VerdictState;
  onVerdict: (v: WwbDisposition | null) => void;
}) {
  const active = state?.verdict === verdict;
  return (
    <button
      type="button"
      data-testid={testid}
      aria-pressed={active}
      onClick={() => onVerdict(active ? null : verdict)}
      className="rounded-pill border px-3 py-1 text-[0.8125rem] font-semibold transition-colors"
      style={
        active
          ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
          : { background: "transparent", color: "var(--ink-muted)", borderColor: "var(--rule-strong)" }
      }
    >
      {label}
    </button>
  );
}

function QuestionRow({
  question,
  slug,
  interactive,
  value,
  onFocusReceipt,
  onChange,
}: {
  question: WwbQuestion;
  slug: string;
  interactive: boolean;
  value: string;
  onFocusReceipt?: (docKey: string) => void;
  onChange: (text: string) => void;
}) {
  return (
    <li id={`wwb-q-${question.id}`} data-question={question.id} className="rounded-inset border border-rule bg-paper px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="font-mono text-[0.75rem] text-ink-faint">{question.id}</span>
        <p className="text-[0.9375rem] font-medium leading-snug text-ink" data-testid="wwb-ask">
          {question.ask}
        </p>
      </div>
      {question.blocks.length ? (
        <div className="mt-1.5 text-[0.9375rem]">
          <Reading blocks={question.blocks} />
        </div>
      ) : null}
      {question.receipts.length ? (
        <div className="mt-2">
          <ReceiptLinks receipts={question.receipts} slug={slug} onFocus={onFocusReceipt} />
        </div>
      ) : null}
      {interactive ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="Your answer…"
          data-testid={`answer-${question.id}`}
          className="mt-3 w-full resize-y rounded-inset border border-rule bg-paper px-3 py-2 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors focus-visible:border-accent"
        />
      ) : null}
    </li>
  );
}

// ── Standing tiers (after-states) ─────────────────────────────────────────────

function BuildNow({
  entries,
  slug,
  onFocusReceipt,
}: {
  entries: WwbEntry[];
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8" data-testid="wwb-build-now">
      <h3 className="mb-3 font-serif text-[1.25rem] font-semibold text-ink">Build now</h3>
      <ul className="space-y-5">
        {entries.map((e) => (
          <li key={e.id} data-testid="wwb-entry" data-entry={e.id} className="rounded-inset border border-rule px-4 py-3">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-sans text-[1rem] font-semibold text-ink">{e.title}</h4>
              <span className="flex flex-wrap items-center gap-2">
                {e.evidenceMoved ? <EvidenceMovedChip /> : null}
                <DecidedPill />
              </span>
            </div>
            {e.inTheirWords ? <WordsQuote words={e.inTheirWords} /> : null}
            {e.ruledBy ? <p className="mb-2 text-[0.75rem] text-ink-faint">Ruled by {e.ruledBy}</p> : null}
            <Reasons entry={e} slug={slug} onFocusReceipt={onFocusReceipt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Backlog({
  entries,
  slug,
  onFocusReceipt,
}: {
  entries: WwbEntry[];
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8" data-testid="wwb-backlog">
      <h3 className="mb-3 font-serif text-[1.25rem] font-semibold text-ink">Backlog</h3>
      <ul className="space-y-4">
        {entries.map((e) => (
          <li
            key={e.id}
            data-testid="wwb-entry"
            data-entry={e.id}
            className="rounded-inset border border-rule px-4 py-3"
            style={{ background: "var(--paper-raised)", opacity: 0.9 }}
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-sans text-[1rem] font-semibold text-ink-muted">{e.title}</h4>
              <span className="flex flex-wrap items-center gap-2">
                {e.evidenceMoved ? <EvidenceMovedChip /> : null}
                <OutlinePill label="Backlog" testid="wwb-backlog-pill" />
              </span>
            </div>
            {e.unblocks ? (
              <p className="mb-2 text-[0.8125rem] text-ink-muted">
                <span className="text-ink-faint">Unblocks: </span>
                {e.unblocks}
              </p>
            ) : null}
            <Reasons entry={e} slug={slug} onFocusReceipt={onFocusReceipt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DontBuild({
  entries,
  slug,
  onFocusReceipt,
}: {
  entries: WwbEntry[];
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8" data-testid="wwb-dont-build">
      <h3 className="mb-3 font-serif text-[1.25rem] font-semibold text-ink">Don&rsquo;t build</h3>
      <ul className="space-y-5">
        {entries.map((e) => (
          <li key={e.id} data-testid="wwb-entry" data-entry={e.id} className="rounded-inset border border-rule px-4 py-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h4 className="font-sans text-[1rem] font-semibold text-ink">{e.title}</h4>
              <OutlinePill label="Won't build" testid="wwb-wont-build" />
            </div>
            <Reasons entry={e} slug={slug} onFocusReceipt={onFocusReceipt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Research's dont-build-lean proposals: evidence-backed cuts the human has NOT
 * ruled. They ride the Ideas-to-sort tab as a receded, uncounted group (no
 * action needed; kept visible so any of them can be resurrected by a ruling).
 */
function RecommendedCuts({
  entries,
  slug,
  onFocusReceipt,
}: {
  entries: WwbEntry[];
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mt-8 opacity-85" data-testid="wwb-recommended-cuts">
      <h3 className="mb-1 font-serif text-[1.25rem] font-semibold text-ink">
        Research recommends not building these
      </h3>
      <p className="mb-3 text-[0.8125rem] text-ink-faint">
        Cut on evidence, not by you. No action needed; a review can bring any of them back.
      </p>
      <ul className="space-y-5">
        {entries.map((e) => (
          <li
            key={e.id}
            data-testid="wwb-entry"
            data-entry={e.id}
            className="rounded-inset border border-rule bg-paper-raised px-4 py-3"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h4 className="font-sans text-[1rem] font-semibold text-ink">{e.title}</h4>
              <OutlinePill label="Recommended cut" testid="wwb-proposed-mark" />
            </div>
            <Reasons entry={e} slug={slug} onFocusReceipt={onFocusReceipt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Unruled({
  entries,
  slug,
  onFocusReceipt,
}: {
  entries: WwbEntry[];
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8" data-testid="wwb-unruled">
      <h3 className="mb-1 font-serif text-[1.25rem] font-semibold text-ink">Part of the full picture, not decided yet</h3>
      <p className="mb-3 text-[0.8125rem] text-ink-faint">
        Things this problem clearly implies that nobody has said yes or no to yet. Listed so the full size of the problem stays visible.
      </p>
      <ul className="space-y-5">
        {entries.map((e) => (
          <li key={e.id} data-testid="wwb-entry" data-entry={e.id} className="rounded-inset border border-rule px-4 py-3">
            <h4 className="mb-2 font-sans text-[1rem] font-semibold text-ink">{e.title}</h4>
            <Reasons entry={e} slug={slug} onFocusReceipt={onFocusReceipt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function Reasons({
  entry,
  slug,
  onFocusReceipt,
}: {
  entry: WwbEntry;
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  if (entry.reasons.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {entry.reasons.map((r, j) => (
        <li key={j} className="reading text-[0.9375rem] leading-relaxed" data-testid="wwb-reason">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {r.assumption ? <AssumptionChip /> : null}
            <span className="text-ink">{r.text}</span>
          </span>
          {r.receipts.length ? (
            <span className="mt-1.5 flex">
              <ReceiptLinks receipts={r.receipts} slug={slug} onFocus={onFocusReceipt} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The human's verbatim words, in the pull-quote idiom. */
function WordsQuote({ words }: { words: string }) {
  return (
    <blockquote
      data-testid="wwb-words"
      className="my-2 rounded-inset bg-paper-raised px-5 py-3 font-serif text-[1.2rem] italic leading-snug text-ink"
    >
      <span aria-hidden className="mr-1 text-ink-faint">&ldquo;</span>
      {words}
      <span aria-hidden className="ml-1 text-ink-faint">&rdquo;</span>
      <footer className="mt-1.5 text-[0.6875rem] font-semibold uppercase not-italic tracking-[0.1em] text-ink-faint">
        In their words
      </footer>
    </blockquote>
  );
}

/** Decided (solid ink): a human-confirmed Build-now verdict. */
function DecidedPill() {
  return (
    <span
      className="shrink-0 rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-paper"
      style={{ background: "var(--ink)" }}
      data-testid="wwb-decided"
    >
      Decided
    </span>
  );
}

/** An outline pill carrying a word (Backlog / Won't build / Proposed). */
function OutlinePill({ label, testid }: { label: string; testid: string }) {
  return (
    <span
      className="shrink-0 rounded-pill border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      style={{ borderColor: "var(--rule-strong)" }}
      data-testid={testid}
    >
      {label}
    </span>
  );
}

/** The mechanical ASSUMPTION mark, in the unverified idiom. */
function AssumptionChip() {
  return (
    <span
      className="shrink-0 rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
      style={{ border: "1px solid var(--unverified)", color: "var(--unverified)" }}
      data-testid="wwb-assumption"
    >
      Assumption
    </span>
  );
}

/** A cited L-id retired or dropped a grade: this confirmed entry wants re-ruling. */
function EvidenceMovedChip() {
  return (
    <span
      className="shrink-0 rounded-pill border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
      style={{ borderColor: "var(--unverified)", color: "var(--unverified)" }}
      data-testid="wwb-evidence-moved"
    >
      Evidence moved: re-rule
    </span>
  );
}
