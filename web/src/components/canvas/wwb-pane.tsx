"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AssumptionNode,
  WwbDisposition,
  WwbEntry,
  WwbModel,
  WwbParked,
  WwbQuestion,
} from "@/lib/types";
import { Reading } from "./markdown";
import { ReceiptLinks } from "./receipts";
import { RegisterCard } from "./register";

/**
 * What's Worth Building v2, the single human review surface, organised as an
 * accessible tab bar rather than one long scroll. Three tabs: Needs you
 * (parked ruling cards + open questions, everything awaiting the human), Build
 * candidates (the triage entries with Accept / Backlog / Don't build), and
 * Build input (one organized doc of everything the build stage reads: the
 * Will-be-built pile, the risk register checked at build's door, links to the
 * Structure and Design system boards, then the held-back piles, the still-open
 * background, and freshly recorded rulings and answers; the decision stream
 * stays its own board). Every record button posts immediately by itself; draft
 * state lives on the tab controller so it survives tab switches. A parked call
 * lands the reader on Needs you (ruling-first). Every visual value reuses the
 * existing accent / state idioms; verdict identity is carried by the word,
 * never a semantic colour.
 */
export function WwbPane({
  wwb,
  assumptions,
  slug,
  runsEnabled,
  onFocusReceipt,
  onRunStarted,
}: {
  wwb: WwbModel;
  /** The Assumptions & Risks register, shown on Build input (checked at build's door). */
  assumptions?: AssumptionNode[];
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
        assumptions={assumptions ?? []}
        slug={slug}
        runsEnabled={!!runsEnabled}
        onFocusReceipt={onFocusReceipt}
        onRunStarted={onRunStarted}
      />
    </div>
  );
}

/**
 * The three review tabs, in order. The keys are the contract's section names;
 * the labels are plain words that say what the reader does or finds there (the
 * system vocabulary stays in the docs, never in the chrome).
 */
type TabKey = "needs-you" | "proposed" | "build-input";

const TABS: { key: TabKey; label: string; showCount: boolean }[] = [
  // One place for everything awaiting the human: parked rulings AND open
  // questions. Different inputs, same job (your attention), so one tab.
  { key: "needs-you", label: "Needs you", showCount: true },
  { key: "proposed", label: "Build candidates", showCount: true },
  // One organized doc of everything build consumes; review it in one place.
  { key: "build-input", label: "Build input", showCount: false },
];

/** Least-settled first: the order the register reads in at build's door. */
const ASSUMPTION_STATE_RANK: Record<AssumptionNode["state"], number> = {
  unverified: 0,
  partial: 1,
  accepted: 2,
  verified: 3,
};

// ── The tabbed review surface: state that spans the tabs + the sticky bar ──────

interface VerdictState {
  verdict: WwbDisposition;
  note: string;
  unblocks: string;
}
/**
 * A ruling is accept or reject, nothing else: the candidate is either the
 * project's direction or it is not. It records the moment you hit Record
 * ruling (its own immediate post), not as part of the batched review below.
 */
interface RulingState {
  id: string;
  disposition: "accept" | "reject";
}

function WwbTabs({
  wwb,
  assumptions,
  slug,
  runsEnabled,
  onFocusReceipt,
  onRunStarted,
}: {
  wwb: WwbModel;
  assumptions: AssumptionNode[];
  slug: string;
  runsEnabled: boolean;
  onFocusReceipt?: (docKey: string) => void;
  onRunStarted?: () => void;
}) {
  const router = useRouter();
  const [verdicts, setVerdicts] = useState<Record<string, VerdictState>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ruling, setRuling] = useState<RulingState | null>(null);
  const [rulingBusy, setRulingBusy] = useState<string | null>(null);
  const [rulingDone, setRulingDone] = useState<Record<string, "accept" | "reject">>({});
  const [rulingError, setRulingError] = useState<{ id: string; message: string } | null>(null);
  const [answerBusy, setAnswerBusy] = useState<string | null>(null);
  const [answersDone, setAnswersDone] = useState<Record<string, string>>({});
  const [answerError, setAnswerError] = useState<{ id: string; message: string } | null>(null);
  const [verdictBusy, setVerdictBusy] = useState<string | null>(null);
  const [verdictsDone, setVerdictsDone] = useState<Record<string, { verdict: WwbDisposition; queued: boolean }>>({});
  const [verdictError, setVerdictError] = useState<{ id: string; message: string } | null>(null);

  // Ruling-first holds candidate triage only while a parked call still awaits
  // a ruling; the moment every ruling is recorded, triage unlocks.
  const rulingFirst = wwb.parked.some((p) => !p.recorded);

  // Held back holds only what a human ruled out.
  const ruledOut = wwb.dontBuild.filter((e) => e.source !== "proposed");
  // Research's dont-build-lean proposals are still AI recommendations, so they
  // ride Build candidates as first-class reviewable cards (same verdicts,
  // counted as awaiting you) with the lean shown. Only a HUMAN don't-build
  // ruling reaches Build input's Held back pile.
  const recommendedCuts = wwb.dontBuild.filter((e) => e.source === "proposed");
  const pendingCuts = recommendedCuts.filter((e) => !verdictsDone[e.id]);
  const recordedCuts = recommendedCuts.filter((e) => verdictsDone[e.id]);

  // The register, risk-first: riskiest load-bearing entries lead, then the
  // least-settled states. Sorted on a copy; the prop array is never mutated.
  const register = [...assumptions].sort(
    (a, b) =>
      Number(b.riskiest) - Number(a.riskiest) ||
      ASSUMPTION_STATE_RANK[a.state] - ASSUMPTION_STATE_RANK[b.state],
  );

  // Badge + default-tab counts are what still NEEDS you: a recorded ruling or
  // answer stays visible on its tab but no longer counts against you.
  // A verdict recorded THIS session leaves Build candidates immediately (client
  // state) and shows under Build input as recorded-and-folding-in; the vault
  // catches up when its recorder lands and the page refreshes.
  const pendingProposed = wwb.proposed.filter((e) => !verdictsDone[e.id]);
  const recordedThisSession = wwb.proposed.filter((e) => verdictsDone[e.id]);

  const counts: Record<TabKey, number> = {
    "needs-you":
      wwb.parked.filter((p) => !p.recorded).length +
      wwb.questions.filter((q) => !q.answered).length,
    proposed: pendingProposed.length + pendingCuts.length,
    // Uncounted in the chrome (showCount: false); kept for the type + fallback.
    "build-input":
      wwb.buildNow.length +
      wwb.backlog.length +
      ruledOut.length +
      wwb.unruled.length +
      wwb.blocking.length,
  };

  // Default tab: Needs you while anything awaits the human, else Proposed,
  // else Build input. A parked 🔴 still leads inside the tab (ruling-first).
  const defaultTab: TabKey =
    counts["needs-you"] > 0 ? "needs-you" : counts.proposed > 0 ? "proposed" : "build-input";
  const [active, setActive] = useState<TabKey>(defaultTab);

  const setVerdict = (id: string, verdict: WwbDisposition | null) => {
    setVerdictError(null);
    setVerdicts((prev) => {
      const next = { ...prev };
      if (verdict == null || prev[id]?.verdict === verdict) delete next[id];
      else next[id] = { verdict, note: prev[id]?.note ?? "", unblocks: prev[id]?.unblocks ?? "" };
      return next;
    });
  };
  const patchVerdict = (id: string, patch: Partial<VerdictState>) =>
    setVerdicts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));


  // Record answer posts one answer by itself, immediately, same as a ruling:
  // typing an answer and hitting its button should not also require the batch.
  const recordAnswer = async (q: WwbQuestion) => {
    const text = (answers[q.id] ?? "").trim();
    if (!text || answerBusy) return;
    setAnswerBusy(q.id);
    setAnswerError(null);
    try {
      const res = await fetch("/api/projects/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          wwbRound: wwb.round,
          entriesHash: wwb.entriesHash,
          verdicts: [],
          answers: [{ id: q.id, text }],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAnswerError({ id: q.id, message: data.error ?? "Could not record the answer." });
        setAnswerBusy(null);
        return;
      }
      setAnswersDone((prev) => ({ ...prev, [q.id]: text }));
      setAnswerBusy(null);
      onRunStarted?.();
      router.refresh();
    } catch {
      setAnswerError({ id: q.id, message: "Could not reach the server." });
      setAnswerBusy(null);
    }
  };

  // Record ruling posts the ruling by itself, immediately: a framing ruling is
  // the call everything else re-scopes on, so it does not wait in the batch.
  const recordRuling = async (p: WwbParked) => {
    if (!ruling || ruling.id !== p.id || rulingBusy) return;
    setRulingBusy(p.id);
    setRulingError(null);
    try {
      const res = await fetch("/api/projects/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          wwbRound: wwb.round,
          entriesHash: wwb.entriesHash,
          verdicts: [],
          answers: [],
          ruling: {
            id: p.id,
            kind: p.kind,
            disposition: ruling.disposition,
            words: "",
            confirmed: true,
            candidate: p.candidate,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRulingError({ id: p.id, message: data.error ?? "Could not record the ruling." });
        setRulingBusy(null);
        return;
      }
      setRulingDone((prev) => ({ ...prev, [p.id]: ruling.disposition }));
      setRulingBusy(null);
      onRunStarted?.();
      router.refresh();
    } catch {
      setRulingError({ id: p.id, message: "Could not reach the server." });
      setRulingBusy(null);
    }
  };

  // Record verdict posts one candidate's ruling by itself, immediately, the
  // same as Record answer and Record ruling: no batch, no second surface.
  const recordVerdict = async (e: WwbEntry) => {
    const v = verdicts[e.id];
    if (!v || verdictBusy) return;
    setVerdictBusy(e.id);
    setVerdictError(null);
    try {
      const res = await fetch("/api/projects/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          wwbRound: wwb.round,
          entriesHash: wwb.entriesHash,
          verdicts: [
            {
              id: e.id,
              verdict: v.verdict,
              note: v.note.trim() || undefined,
              unblocks: v.verdict === "backlog" && v.unblocks.trim() ? v.unblocks.trim() : undefined,
            },
          ],
          answers: [],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setVerdictError({ id: e.id, message: data.error ?? "Could not record the verdict." });
        setVerdictBusy(null);
        return;
      }
      const okBody = (await res.json().catch(() => ({}))) as { queued?: boolean };
      setVerdictsDone((m) => ({ ...m, [e.id]: { verdict: v.verdict, queued: !!okBody.queued } }));
      setVerdicts((prev) => {
        const next = { ...prev };
        delete next[e.id];
        return next;
      });
      setVerdictBusy(null);
      onRunStarted?.();
      router.refresh();
    } catch {
      setVerdictError({ id: e.id, message: "Could not reach the server." });
      setVerdictBusy(null);
    }
  };

  const isReviewTab = active === "needs-you" || active === "proposed";

  // Needs you carries only what still awaits the human. A ruling or answer
  // already in the ledger's Review log files under Already decided; the one
  // you record THIS session stays in place with its confirmation banner
  // (client state), then files on the next load.
  const parkedNeeds = wwb.parked.filter((p) => !p.recorded);
  const parkedFiled = wwb.parked.filter((p) => p.recorded);
  const questionsNeeds = wwb.questions.filter((q) => !q.answered);
  const questionsFiled = wwb.questions.filter((q) => q.answered);

  // #wwb-review lands here (the tabs), which show the default tab on mount.
  return (
    <div id="wwb-review" data-testid="wwb-review">
      <TabBar counts={counts} active={active} onSelect={setActive} />

      <TabPanel tabKey="needs-you" active={active}>
        {parkedNeeds.length === 0 && questionsNeeds.length === 0 ? (
          <EmptyTab>Nothing needs you right now.</EmptyTab>
        ) : (
          <>
            {/* Ruling-first: the parked 🔴 leads; everything re-scopes on it. */}
            {parkedNeeds.map((p) => (
              <RulingCard
                key={p.id}
                parked={p}
                slug={slug}
                interactive={runsEnabled}
                picked={ruling?.id === p.id ? ruling.disposition : null}
                busy={rulingBusy === p.id}
                recorded={rulingDone[p.id] ?? p.recorded ?? null}
                error={rulingError?.id === p.id ? rulingError.message : null}
                onFocusReceipt={onFocusReceipt}
                onPick={(disposition) =>
                  setRuling((prev) =>
                    prev && prev.id === p.id && prev.disposition === disposition
                      ? null
                      : { id: p.id, disposition },
                  )
                }
                onRecord={() => recordRuling(p)}
              />
            ))}
            {questionsNeeds.length > 0 ? (
              <>
                {parkedNeeds.length > 0 ? (
                  <p className="eyebrow mb-3 mt-6">Questions for you</p>
                ) : null}
                <ul className="space-y-4" data-testid="wwb-questions">
                  {questionsNeeds.map((q) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      slug={slug}
                      interactive={runsEnabled}
                      value={answers[q.id] ?? ""}
                      answered={answersDone[q.id] ?? q.answered ?? null}
                      busy={answerBusy === q.id}
                      error={answerError?.id === q.id ? answerError.message : null}
                      onFocusReceipt={onFocusReceipt}
                      onChange={(text) => setAnswers((prev) => ({ ...prev, [q.id]: text }))}
                      onRecord={() => recordAnswer(q)}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </TabPanel>

      <TabPanel tabKey="proposed" active={active}>
        {counts.proposed === 0 ? (
          <EmptyTab>
            {recordedThisSession.length + recordedCuts.length > 0
              ? "All sorted. Your verdicts are recorded; see Build input."
              : "No ideas to sort right now."}
          </EmptyTab>
        ) : (
          <>
            {rulingFirst && counts.proposed > 0 ? (
              <p className="mb-3 text-[0.8125rem] italic text-ink-muted" data-testid="proposed-rescope-note">
                These re-scope after you rule the framing.
              </p>
            ) : null}
            <ul className="space-y-4" data-testid="wwb-proposed">
              {[...pendingProposed, ...pendingCuts].map((e) => (
                <ProposedEntry
                  key={e.id}
                  entry={e}
                  slug={slug}
                  onFocusReceipt={onFocusReceipt}
                  triage={runsEnabled && !rulingFirst}
                  state={verdicts[e.id]}
                  busy={verdictBusy === e.id}
                  recorded={null}
                  error={verdictError?.id === e.id ? verdictError.message : null}
                  onVerdict={(v) => setVerdict(e.id, v)}
                  onPatch={(patch) => patchVerdict(e.id, patch)}
                  onRecord={() => recordVerdict(e)}
                />
              ))}
            </ul>
          </>
        )}
      </TabPanel>

      <TabPanel tabKey="build-input" active={active}>
        {/* One organized doc of everything the build stage reads, so the
            review happens in one place instead of across documents. */}
        <p className="mb-6 text-[0.8125rem] text-ink-faint">
          Everything the build stage reads before it starts, in one place. The
          decision stream stays on its own board.
        </p>

        {counts["build-input"] === 0 &&
        register.length === 0 &&
        parkedFiled.length === 0 &&
        questionsFiled.length === 0 &&
        recordedThisSession.length + recordedCuts.length === 0 ? (
          <>
            <EmptyTab>
              Nothing for build yet. Rulings, the risk register, and held back
              ideas land here as research runs.
            </EmptyTab>
            <BuildReads onFocusReceipt={onFocusReceipt} />
          </>
        ) : (
          <>
            <RecordedThisSession entries={[...recordedThisSession, ...recordedCuts]} done={verdictsDone} />

            {/* 1. The direct input: the accepted pile. */}
            <BuildNow entries={wwb.buildNow} slug={slug} onFocusReceipt={onFocusReceipt} />

            {/* 2. The risk register build checks at its door. */}
            {register.length > 0 ? (
              <section className="mb-8" data-testid="wwb-register">
                <p className="eyebrow mb-1">Checked at the door</p>
                <p className="mb-3 text-[0.8125rem] text-ink-faint">
                  Build checks this register before starting. An unverified
                  load-bearing assumption goes in as a receipt, not a block.
                </p>
                <RegisterCard assumptions={register} id="wwb-register-list" embedded />
              </section>
            ) : null}

            {/* 3. The other boards build reads: navigation, always present. */}
            <BuildReads onFocusReceipt={onFocusReceipt} />

            {/* 4. Held back: ruled, and explicitly not going into build. */}
            {wwb.backlog.length > 0 || ruledOut.length > 0 ? (
              <div className="mb-8 border-t border-rule pt-6">
                <p className="eyebrow mb-1">Held back</p>
                <p className="mb-4 text-[0.8125rem] text-ink-faint">
                  Ruled, but not going into this build.
                </p>
                <Backlog entries={wwb.backlog} slug={slug} onFocusReceipt={onFocusReceipt} />
                <DontBuild entries={ruledOut} slug={slug} onFocusReceipt={onFocusReceipt} />
              </div>
            ) : null}

            {/* 5. Still open: context that has not been ruled. */}
            {wwb.unruled.length > 0 || wwb.blocking.length > 0 ? (
              <div className="mb-8 border-t border-rule pt-6">
                <p className="eyebrow mb-4">Still open</p>
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
              </div>
            ) : null}

            {/* 6. Freshly recorded rulings and answers, filed here the moment
                they are in the Review log; research folds them in next round. */}
            {parkedFiled.length > 0 || questionsFiled.length > 0 ? (
              <div className="border-t border-rule pt-6">
                {parkedFiled.length > 0 ? (
                  <section className="mb-8" data-testid="wwb-filed-rulings">
                    <p className="eyebrow mb-3">Rulings recorded</p>
                    {parkedFiled.map((p) => (
                      <RulingCard
                        key={p.id}
                        parked={p}
                        slug={slug}
                        interactive={false}
                        picked={null}
                        busy={false}
                        recorded={p.recorded}
                        error={null}
                        onFocusReceipt={onFocusReceipt}
                        onPick={() => {}}
                        onRecord={() => {}}
                      />
                    ))}
                  </section>
                ) : null}
                {questionsFiled.length > 0 ? (
                  <section className="mb-8" data-testid="wwb-filed-answers">
                    <p className="eyebrow mb-3">Answers recorded</p>
                    <ul className="space-y-4">
                      {questionsFiled.map((q) => (
                        <QuestionRow
                          key={q.id}
                          question={q}
                          slug={slug}
                          interactive={false}
                          value=""
                          answered={q.answered}
                          busy={false}
                          error={null}
                          onFocusReceipt={onFocusReceipt}
                          onChange={() => {}}
                          onRecord={() => {}}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </TabPanel>

      {isReviewTab && !runsEnabled ? (
        <p className="mt-6 text-[0.8125rem] text-ink-muted" data-testid="review-readonly">
          Review runs from Claude Code.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The other boards build reads (03 Structure and DESIGN.md live on their own
 * boards): compact rows that focus those boards in place. Navigation, not
 * content, so the section renders even when the piles are empty. No debrief
 * row on purpose: board focus can only land on the first debrief document,
 * not the restated problem, and landing somewhere unpromised is worse than
 * not linking.
 */
function BuildReads({ onFocusReceipt }: { onFocusReceipt?: (docKey: string) => void }) {
  return (
    <section className="mb-8" data-testid="wwb-build-reads">
      <p className="eyebrow mb-3">Also read by build</p>
      <ul className="space-y-2">
        <BoardRow
          label="Structure"
          blurb="The flows and screens build works from."
          docKey="structure"
          onFocusReceipt={onFocusReceipt}
        />
        <BoardRow
          label="Design system"
          blurb="The visual contract every build agent styles against."
          docKey="design-system"
          onFocusReceipt={onFocusReceipt}
        />
      </ul>
    </section>
  );
}

function BoardRow({
  label,
  blurb,
  docKey,
  onFocusReceipt,
}: {
  label: string;
  blurb: string;
  docKey: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  const body = (
    <>
      <span className="font-sans text-[0.9375rem] font-semibold text-ink">{label}</span>
      <span className="text-[0.8125rem] text-ink-muted">{blurb}</span>
    </>
  );
  if (!onFocusReceipt) {
    return (
      <li data-testid="wwb-build-read" className="flex flex-col gap-0.5 rounded-inset border border-rule px-4 py-3">
        {body}
      </li>
    );
  }
  return (
    <li data-testid="wwb-build-read">
      <button
        type="button"
        onClick={() => onFocusReceipt(docKey)}
        className="flex w-full flex-col gap-0.5 rounded-inset border border-rule px-4 py-3 text-left transition-colors hover:border-accent"
      >
        {body}
      </button>
    </li>
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
                    // One resting color for every inactive tab: a faint tab
                    // reads as disabled, and every tab here is clickable (an
                    // empty one explains itself inside its panel).
                    background: "transparent",
                    color: "var(--ink-muted)",
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
// ── The ruling card: a decision only the human can make ───────────────────────

function RulingCard({
  parked,
  slug,
  interactive,
  picked,
  busy,
  recorded,
  error,
  onFocusReceipt,
  onPick,
  onRecord,
}: {
  parked: WwbParked;
  slug: string;
  interactive: boolean;
  picked: "accept" | "reject" | null;
  busy: boolean;
  recorded: "accept" | "reject" | "reshape" | null;
  error: string | null;
  onFocusReceipt?: (docKey: string) => void;
  onPick: (d: "accept" | "reject") => void;
  onRecord: () => void;
}) {
  return (
    <article
      data-testid="wwb-ruling"
      data-parked={parked.id}
      className="mb-5 rounded-inset border border-rule bg-paper px-5 py-4"
    >
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

      {parked.supersedes || parked.blocks ? (
        <div className="mb-3 space-y-1 text-[0.8125rem] text-ink-muted" data-testid="ruling-stakes">
          {parked.supersedes ? <p>Taking this replaces decision {parked.supersedes.replace(/^Decisions\//, "").split(" ")[0]}.</p> : null}
          {parked.blocks ? <p>Waiting on this: {parked.blocks}</p> : null}
        </div>
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

      {recorded ? (
        // Read from the ledger's Review log, so it survives a page refresh:
        // the card stays visible as a recorded ruling until research
        // re-scopes What's Worth Building, then clears with the next round.
        <p className="mt-2 text-[0.8125rem] font-semibold" style={{ color: "var(--accent)" }} data-testid="ruling-recorded">
          Ruling recorded: {recorded}. Research re-scopes around it, then this card clears.
        </p>
      ) : interactive ? (
        <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["accept", "reject"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  data-testid={`ruling-${d}`}
                  aria-pressed={picked === d}
                  onClick={() => onPick(d)}
                  className="w-full rounded-inset border px-3 py-2 text-[0.875rem] font-semibold capitalize transition-colors"
                  style={
                    picked === d
                      ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
                      : { background: "transparent", color: "var(--ink-muted)", borderColor: "var(--rule-strong)" }
                  }
                >
                  {d}
                </button>
              ))}
            </div>

            {error ? <p className="mb-2 text-[0.8125rem] text-unverified">{error}</p> : null}

            {/* One click records it: the ruling posts by itself, right now,
                not as part of the review batch below. */}
            <button
              type="button"
              onClick={onRecord}
              disabled={!picked || busy}
              data-testid="ruling-record"
              className="rounded-inset border px-3 py-1 text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {busy ? "Recording…" : "Record ruling"}
            </button>
          </>
      ) : null}
    </article>
  );
}

// ── A proposed entry: verdict buttons (triage) or read-only ───────────────────

// UI words only: the vault grammar underneath stays `build-now` (the tier the
// build stage consumes), so accepting a card is what moves it to Will be built.
const VERDICT_WORDS: Record<WwbDisposition, string> = {
  "build-now": "accepted",
  backlog: "backlog",
  "dont-build": "don't build",
};

function ProposedEntry({
  entry,
  slug,
  triage,
  state,
  busy,
  recorded,
  error,
  onFocusReceipt,
  onVerdict,
  onPatch,
  onRecord,
}: {
  entry: WwbEntry;
  slug: string;
  triage: boolean;
  state?: VerdictState;
  busy: boolean;
  recorded: WwbDisposition | null;
  error: string | null;
  onFocusReceipt?: (docKey: string) => void;
  onVerdict: (v: WwbDisposition | null) => void;
  onPatch: (patch: Partial<VerdictState>) => void;
  onRecord: () => void;
}) {
  const pending = !!state && !recorded;
  // Every candidate wears its lean, colored so the split is visible at a
  // glance: build in the verified green, don't-build in the unverified red.
  // The words stay beside the color, so the marker still reads in greyscale.
  const cutLean = entry.source === "proposed" && entry.disposition === "dont-build";
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
      <p
        className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: cutLean ? "var(--unverified)" : "var(--verified)" }}
        data-testid="wwb-research-lean"
        data-lean={cutLean ? "dont-build" : "build"}
      >
        {cutLean ? <>Research recommends: don&rsquo;t build</> : <>Research recommends: build</>}
      </p>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h4 className="font-sans text-[1rem] font-semibold text-ink">{entry.title}</h4>
        {recorded ? (
          <span
            className="shrink-0 rounded-pill border border-rule-strong px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            data-testid="verdict-recorded-pill"
          >
            Recorded
          </span>
        ) : pending ? (
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

      {recorded ? (
        <p className="mt-3 text-[0.8125rem] text-ink-muted" data-testid="verdict-recorded">
          {recorded === "build-now"
            ? "Accepted, moved to Will be built. Research folds it in on the next pass."
            : `Recorded as ${VERDICT_WORDS[recorded]}. Research folds it in on the next pass.`}
        </p>
      ) : triage ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Verdict for ${entry.title}`}>
            <VerdictButton label="Accept" verdict="build-now" testid="verdict-build-now" state={state} onVerdict={onVerdict} />
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
              {error ? <p className="text-[0.8125rem] text-unverified">{error}</p> : null}
              <button
                type="button"
                onClick={onRecord}
                disabled={busy}
                data-testid="verdict-record"
                className="rounded-inset border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: "var(--accent)", background: "var(--accent-wash)", color: "var(--accent)" }}
              >
                {busy ? "Recording…" : "Record verdict"}
              </button>
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
  answered,
  busy,
  error,
  onFocusReceipt,
  onChange,
  onRecord,
}: {
  question: WwbQuestion;
  slug: string;
  interactive: boolean;
  value: string;
  /** The recorded answer (from this session or the ledger's Review log), or null. */
  answered: string | null;
  busy: boolean;
  error: string | null;
  onFocusReceipt?: (docKey: string) => void;
  onChange: (text: string) => void;
  onRecord: () => void;
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
      {answered ? (
        // Read from the ledger's Review log, so it survives a page refresh:
        // the question reads as answered until research folds it in.
        <div className="mt-3" data-testid={`answer-recorded-${question.id}`}>
          <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{answered}</p>
          <p className="mt-1 text-[0.8125rem] font-semibold" style={{ color: "var(--accent)" }}>
            Answer recorded. Research picks it up, then this clears.
          </p>
        </div>
      ) : interactive ? (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder="Your answer…"
            data-testid={`answer-${question.id}`}
            className="mt-3 w-full resize-y rounded-inset border border-rule bg-paper px-3 py-2 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors focus-visible:border-accent"
          />
          {error ? <p className="mt-2 text-[0.8125rem] text-unverified">{error}</p> : null}
          <button
            type="button"
            onClick={onRecord}
            disabled={!value.trim() || busy}
            data-testid={`answer-record-${question.id}`}
            className="mt-2 rounded-inset border px-3 py-1 text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {busy ? "Recording…" : "Record answer"}
          </button>
        </>
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
      {/* The pile the build stage takes its input from: the accepted cards.
          (Vault tier name stays `Build now`; this is the reader's word.) */}
      <h3 className="mb-3 font-serif text-[1.25rem] font-semibold text-ink">Will be built</h3>
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
 * Verdicts recorded this session: gone from Build candidates the moment the
 * click lands, shown here until the recorder folds them into the vault and the
 * refreshed page files them for real.
 */
function RecordedThisSession({
  entries,
  done,
}: {
  entries: WwbEntry[];
  done: Record<string, { verdict: WwbDisposition; queued: boolean }>;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8" data-testid="wwb-recorded-session">
      <p className="eyebrow mb-3">Recorded just now</p>
      <ul className="space-y-3">
        {entries.map((e) => {
          const d = done[e.id];
          return (
            <li
              key={e.id}
              data-testid="verdict-recorded"
              className="rounded-inset border border-rule bg-paper-raised px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-sans text-[0.9375rem] font-semibold text-ink">{e.title}</span>
                <OutlinePill label={VERDICT_WORDS[d.verdict]} testid="verdict-recorded-pill" />
              </div>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                {d.queued
                  ? "Recorded and queued behind the current run. Research folds it in when that run ends."
                  : "Recorded. Research is folding it in now; it files here for real when that lands."}
              </p>
            </li>
          );
        })}
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
