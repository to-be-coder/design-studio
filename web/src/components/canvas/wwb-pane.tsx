"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AssumptionNode,
  WwbDisposition,
  WwbEntry,
  WwbModel,
  WwbOption,
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
 * candidates (the triage entries with Build this / Save for later / Leave it out), and
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
      <p className="panel-label mb-1">What&rsquo;s Worth Building</p>
      {wwb.updated ? (
        <p className="mb-6 text-panel-body text-ink-faint">Updated {wwb.updated}.</p>
      ) : null}

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
  disposition: "accept" | "reject" | "reshape" | "pick";
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
  const [rulingDone, setRulingDone] = useState<Record<string, "accept" | "reject" | "reshape" | "pick">>({});
  // A pick can need more than one click (a container AND an arrival form), so
  // picks accumulate here instead of locking the card after the first.
  const [picksDone, setPicksDone] = useState<Record<string, string[]>>({});
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
  const pendingCuts = recommendedCuts.filter((e) => !verdictsDone[e.id] && !e.recordedVerdict);
  const recordedCuts = recommendedCuts.filter((e) => verdictsDone[e.id] || e.recordedVerdict);

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
  const pendingProposed = wwb.proposed.filter((e) => !verdictsDone[e.id] && !e.recordedVerdict);
  const recordedThisSession = wwb.proposed.filter((e) => verdictsDone[e.id] || e.recordedVerdict);

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
  const recordAnswer = async (q: WwbQuestion, directAnswer?: string) => {
    const text = (directAnswer ?? answers[q.id] ?? "").trim();
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
  const recordRuling = async (
    p: WwbParked,
    disposition: "accept" | "reject" | "reshape" | "pick",
    words = "",
  ) => {
    if (rulingBusy) return;
    setRuling({ id: p.id, disposition });
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
            disposition,
            words: disposition === "reshape" || disposition === "pick" ? words : "",
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
      if (disposition === "pick") {
        setPicksDone((prev) => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), words] }));
      } else {
        setRulingDone((prev) => ({ ...prev, [p.id]: disposition }));
      }
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
  const recordVerdict = async (e: WwbEntry, direct?: WwbDisposition) => {
    // Accept and Don't build auto-submit on click (no note). Backlog goes
    // through the selected state so its optional note and unblocks ride along.
    const v = direct ? { verdict: direct, note: "", unblocks: "" } : verdicts[e.id];
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
            {parkedNeeds.length > 0 ? (
              <section aria-labelledby="needs-decisions-heading">
                <ReviewSectionHeader
                  id="needs-decisions-heading"
                  title="Decisions to make"
                  count={parkedNeeds.length}
                />
                {parkedNeeds.map((p) => (
                  <RulingCard
                    key={p.id}
                    parked={p}
                    slug={slug}
                    interactive={runsEnabled}
                    picked={ruling?.id === p.id ? ruling.disposition : null}
                    busy={rulingBusy === p.id}
                    recorded={rulingDone[p.id] ?? p.recorded ?? null}
                    recordedPicks={picksDone[p.id] ?? []}
                    error={rulingError?.id === p.id ? rulingError.message : null}
                    onFocusReceipt={onFocusReceipt}
                    onPick={(disposition, words) => recordRuling(p, disposition, words)}
                  />
                ))}
              </section>
            ) : null}
            {questionsNeeds.length > 0 ? (
              <section
                aria-labelledby="needs-questions-heading"
                className={parkedNeeds.length > 0 ? "mt-8 border-t border-rule pt-6" : undefined}
              >
                <ReviewSectionHeader
                  id="needs-questions-heading"
                  title="Questions to answer"
                  count={questionsNeeds.length}
                  description="Answer a clear call, or clarify a question that research cut off."
                />
                <ul className="space-y-4" data-testid="wwb-questions">
                  {questionsNeeds.map((q, index) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      position={index + 1}
                      total={questionsNeeds.length}
                      slug={slug}
                      interactive={runsEnabled}
                      value={answers[q.id] ?? ""}
                      answered={answersDone[q.id] ?? q.answered ?? null}
                      busy={answerBusy === q.id}
                      error={answerError?.id === q.id ? answerError.message : null}
                      onFocusReceipt={onFocusReceipt}
                      onChange={(text) => setAnswers((prev) => ({ ...prev, [q.id]: text }))}
                      onRecord={(answer) => recordAnswer(q, answer)}
                    />
                  ))}
                </ul>
              </section>
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
            <ul className="space-y-4" data-testid="wwb-proposed">
              {[...pendingProposed, ...pendingCuts].map((e) => (
                <ProposedEntry
                  key={e.id}
                  entry={e}
                  slug={slug}
                  onFocusReceipt={onFocusReceipt}
                  triage={runsEnabled}
                  state={verdicts[e.id]}
                  busy={verdictBusy === e.id}
                  recorded={null}
                  error={verdictError?.id === e.id ? verdictError.message : null}
                  onVerdict={(v) => {
                    if (v === "backlog" || v == null) setVerdict(e.id, v);
                    else recordVerdict(e, v);
                  }}
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
        <p className="mb-6 text-panel-body text-ink-faint">
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
                <p className="panel-label mb-1">Checked at the door</p>
                <p className="mb-3 text-panel-body text-ink-faint">
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
                <p className="panel-label mb-1">Held back</p>
                <p className="mb-4 text-panel-body text-ink-faint">
                  Ruled, but not going into this build.
                </p>
                <Backlog entries={wwb.backlog} slug={slug} onFocusReceipt={onFocusReceipt} />
                <DontBuild entries={ruledOut} slug={slug} onFocusReceipt={onFocusReceipt} />
              </div>
            ) : null}

            {/* 5. Still open: context that has not been ruled. */}
            {wwb.unruled.length > 0 || wwb.blocking.length > 0 ? (
              <div className="mb-8 border-t border-rule pt-6">
                <p className="panel-label mb-4">Still open</p>
                <Unruled entries={wwb.unruled} slug={slug} onFocusReceipt={onFocusReceipt} />
                {wwb.blocking.length ? (
                  <section
                    className="mt-8 rounded-inset border border-b-0 px-5 py-5"
                    data-testid="wwb-blocking"
                    style={{ borderColor: "var(--accent-edge)", background: "var(--accent-wash)" }}
                  >
                    <p className="panel-label mb-1" style={{ color: "var(--accent)" }}>
                      Still being researched
                    </p>
                    <p className="mb-2 text-panel-body text-ink-muted">
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
                    <p className="panel-label mb-3">Rulings recorded</p>
                    {parkedFiled.map((p) => (
                      <RulingCard
                        key={p.id}
                        parked={p}
                        slug={slug}
                        recordedPicks={picksDone[p.id] ?? []}
                        interactive={false}
                        picked={null}
                        busy={false}
                        recorded={p.recorded}
                        error={null}
                        onFocusReceipt={onFocusReceipt}
                        onPick={() => {}}
                      />
                    ))}
                  </section>
                ) : null}
                {questionsFiled.length > 0 ? (
                  <section className="mb-8" data-testid="wwb-filed-answers">
                    <p className="panel-label mb-3">Answers recorded</p>
                    <ul className="space-y-4">
                      {questionsFiled.map((q, index) => (
                        <QuestionRow
                          key={q.id}
                          question={q}
                          position={index + 1}
                          total={questionsFiled.length}
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
        <p className="mt-6 text-panel-body text-ink-muted" data-testid="review-readonly">
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
      <p className="panel-label mb-3">Also read by build</p>
      <ul className="space-y-2">
        <BoardRow
          label="Structure"
          blurb="The skeleton app build fills in."
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
      <span className="text-panel-label font-semibold uppercase tracking-[0.08em] text-ink-faint">
        Build also reads
      </span>
      <span className="font-sans text-[1.125rem] font-semibold leading-snug text-ink">{label}</span>
      <span className="text-panel-body leading-relaxed text-ink-muted">{blurb}</span>
    </>
  );
  if (!onFocusReceipt) {
    return (
      <li
        data-testid="wwb-build-read"
        className="flex flex-col gap-1 rounded-inset border border-b-0 border-rule-strong bg-paper px-5 py-5"
      >
        {body}
      </li>
    );
  }
  return (
    <li data-testid="wwb-build-read">
      <button
        type="button"
        onClick={() => onFocusReceipt(docKey)}
        className="flex w-full flex-col gap-1 rounded-inset border border-b-0 border-rule-strong bg-paper px-5 py-5 text-left transition-colors hover:border-accent"
      >
        {body}
      </button>
    </li>
  );
}

/** The accessible tab strip: roving tabindex + arrow keys, accent on the active baseline. */
function TabBar({
  counts,
  active,
  onSelect,
}: {
  counts: Record<TabKey, number>;
  active: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const list = tabListRef.current;
    const selectedIndex = TABS.findIndex((tab) => tab.key === active);
    const selected = btnRefs.current[selectedIndex];
    if (!list || !selected) return;

    const updateIndicator = () => {
      setIndicator({
        left: selected.offsetLeft,
        width: selected.offsetWidth,
        ready: true,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(list);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [active]);

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
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="What's Worth Building sections"
      className="relative mb-6 flex items-end gap-1 overflow-x-auto border-b border-rule"
    >
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
            className="relative z-10 shrink-0 px-4 py-2.5 text-panel-body font-semibold transition-colors hover:bg-paper-raised hover:text-ink"
            style={{
              background: "transparent",
              color: isActive ? "var(--accent)" : "var(--ink-muted)",
              transitionDuration: "var(--motion-duration-fast)",
              transitionTimingFunction: "var(--motion-easing-standard)",
            }}
          >
            {t.label}
            {t.showCount ? <span className="ml-1.5 font-normal tabular-nums">({counts[t.key]})</span> : null}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        data-testid="wwb-tab-indicator"
        className="pointer-events-none absolute bottom-0 h-0.5 bg-accent"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.ready ? 1 : 0,
          transitionProperty: "left, width, opacity",
          transitionDuration: "var(--motion-duration-tab-glide)",
          transitionTimingFunction: "var(--motion-easing-tab-glide)",
        }}
      />
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
    <p className="text-panel-body italic text-ink-faint" data-testid="wwb-empty">
      {children}
    </p>
  );
}

/** A plain-language introduction that gives each review list a reading order. */
function ReviewSectionHeader({
  id,
  title,
  count,
  description,
}: {
  id: string;
  title: string;
  count: number;
  description?: string;
}) {
  return (
    <header className="mb-4 max-w-[34rem]" data-testid={id}>
      <div className="mb-1 flex items-baseline gap-2">
        <h3 id={id} className="font-sans text-[1.125rem] font-semibold leading-snug text-ink">
          {title}
        </h3>
        <span className="text-panel-body tabular-nums text-ink-faint">{count}</span>
      </div>
      {description ? (
        <p className="text-panel-body leading-relaxed text-ink-muted">{description}</p>
      ) : null}
    </header>
  );
}

type JudgmentRow = {
  label: string;
  text: string;
  detail?: string | null;
  detailLabel?: string;
  testId?: string;
};

/**
 * The minimum context for a judgment: the call, why it needs the human, and
 * the smallest set of consequences and evidence needed to choose responsibly.
 */
function JudgmentBrief({
  callLabel,
  call,
  rows,
  callTestId,
  testId,
}: {
  callLabel: string;
  call: string;
  rows: JudgmentRow[];
  callTestId?: string;
  testId?: string;
}) {
  return (
    <div className="mb-4 max-w-[34rem]" data-testid={testId ?? "judgment-brief"}>
      <div className={`${rows.length ? "rounded-t-inset" : "rounded-inset"} bg-paper-raised px-4 py-3`}>
        <p className="panel-label mb-1">{callLabel}</p>
        <p className="text-[1.125rem] font-semibold leading-snug text-ink" data-testid={callTestId}>
          {call}
        </p>
      </div>
      {rows.length ? (
        <div className="divide-y divide-rule rounded-b-inset border border-t-0 border-rule bg-paper px-4 text-panel-body text-ink">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="grid grid-cols-[8.5rem_1fr] gap-3 py-3" data-testid={row.testId}>
              <span className="panel-label">{row.label}</span>
              <div>
                <p className="leading-relaxed">{row.text}</p>
                {row.detail ? (
                  <p className="mt-2 leading-relaxed text-ink-muted">
                    <span className="panel-label mr-2">{row.detailLabel ?? "Consequence"}</span>
                    {row.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function JudgmentClarification({ draft }: { draft?: string | null }) {
  return (
    <div
      className="mb-4 max-w-[34rem] rounded-inset border px-4 py-3"
      style={{ borderColor: "var(--unverified)" }}
      data-testid="judgment-clarification"
    >
      <p className="panel-label mb-1" style={{ color: "var(--unverified)" }}>
        Research needs clarification
      </p>
      <p className="text-panel-body leading-relaxed text-ink">
        The question was cut off, so there is not enough here to make the intended decision.
      </p>
      {draft ? (
        <div className="mt-3 rounded-inset bg-paper-raised px-3 py-2">
          <p className="panel-label mb-1">What research captured</p>
          <p className="text-panel-body leading-relaxed text-ink-muted">{readableReferenceText(draft)}</p>
        </div>
      ) : null}
      <div className="mt-3 text-panel-body leading-relaxed text-ink">
        <p className="panel-label mb-1">What you can do</p>
        <p>Finish or correct the thought in your own words. If you cannot tell what was meant, skip this card.</p>
      </div>
    </div>
  );
}

function questionContextMissing(item: {
  ask: string | null;
  why: string | null;
  changes: string | null;
  evidenceSummary: string | null;
}): string[] {
  const missing: string[] = [];
  if (!hasCompleteQuestion(item.ask)) missing.push("a complete question");
  if (!item.why?.trim()) missing.push("why this needs you");
  if (!item.changes?.trim()) missing.push("what your answer changes");
  if (!item.evidenceSummary?.trim()) missing.push("the strongest evidence signal");
  return missing;
}

function hasCompleteQuestion(ask: string | null): boolean {
  if (!ask) return false;
  const text = ask.replace(/\s+/g, " ").trim();
  if (!text.includes("?")) return false;
  // A question can be followed by a short consequence sentence. It is still a
  // complete ask. Fragments ending in a connector are treated as cut off.
  return !/\b(?:and|or|so|to|the|a|an|that|which|who|with|without|than)\s*[,:;]?$/i.test(text);
}

function readableReferenceText(text: string): string {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, label) => label ?? target);
}

function decisionQuestions(text: string | null): string[] {
  if (!text) return [];
  const normalized = readableReferenceText(text).replace(/\s+/g, " ").trim();
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (!".!?".includes(character)) continue;
    const next = normalized[index + 1];
    if (next && !/\s/.test(next)) continue;
    const sentence = normalized.slice(start, index + 1).trim();
    if (character === "?" && sentence) sentences.push(sentence);
    start = index + 1;
  }
  return sentences;
}

function tidyChoiceText(text: string): string {
  let choice = text
    .replace(/^.*\b(?:did|do|does|are|is|should|would|could|can|will)\s+(?:you|it|this|that|they|we)(?:,\s*[^,]+,)?\s+(?:specifically\s+)?(?:mean\s+)?/i, "")
    .replace(/^you\s+(?:wanted|want)\s+to\s+/i, "")
    .replace(/^that\s+/i, "")
    .replace(/[?.]+$/g, "")
    .trim();
  if (!choice) return text.trim();
  choice = choice[0].toUpperCase() + choice.slice(1);
  return choice;
}

function questionChoiceOptions(question: WwbQuestion): WwbOption[] {
  if (question.options.length >= 2) return question.options;
  const ask = readableReferenceText(question.ask).replace(/\s+/g, " ").trim();
  if ((ask.match(/\?/g) ?? []).length !== 1) return [];
  const questionText = ask.slice(0, ask.indexOf("?") + 1).trim();

  const orMarker = questionText.toLowerCase().lastIndexOf(", or ");
  if (orMarker > 0) {
    const left = tidyChoiceText(questionText.slice(0, orMarker));
    const right = tidyChoiceText(questionText.slice(orMarker + 5));
    if (left && right && left.length <= 180 && right.length <= 180) {
      return [
        { label: "A", text: left },
        { label: "B", text: right },
      ];
    }
  }

  const finalQuestion = questionText.match(/(?:^|[.!]\s+)([^.!?]+\?)$/)?.[1]?.trim() ?? questionText;
  if (/^(?:do|does|did|is|are|can|could|should|would|will|has|have)\b/i.test(finalQuestion)) {
    return [
      { label: "Yes", text: "Yes" },
      { label: "No", text: "No" },
    ];
  }
  return [];
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
  recordedPicks,
  error,
  onFocusReceipt,
  onPick,
}: {
  parked: WwbParked;
  slug: string;
  interactive: boolean;
  picked: "accept" | "reject" | "reshape" | "pick" | null;
  busy: boolean;
  recorded: "accept" | "reject" | "reshape" | "pick" | null;
  recordedPicks: string[];
  error: string | null;
  onFocusReceipt?: (docKey: string) => void;
  onPick: (d: "accept" | "reject" | "reshape" | "pick", words?: string) => void;
}) {
  // The card leads with the ask and the buttons; the full case (the proposal's
  // own words, both sides, receipts) stays folded until asked for.
  const [caseOpen, setCaseOpen] = useState(false);
  const hasCase = !!parked.candidate || parked.bodyBlocks.length > 0 || parked.receipts.length > 0;
  // A directions pick has no single proposal to accept (the recorder refuses a
  // bare accept on one). Options on the entry mean it IS a pick, whatever the
  // kind line says (a render that forgot its kind must not regrow a dead
  // accept button).
  const isPick = parked.kind === "directions-pick" || parked.options.length > 0;
  const callReady = hasCompleteQuestion(parked.ask);
  const callPrompts = decisionQuestions(parked.ask);
  const conciseCall = callPrompts[0] ?? null;
  const hasInlineComparison = !!(
    conciseCall && parked.currentFraming?.trim() && parked.proposedFraming?.trim()
  );
  const contextRows: JudgmentRow[] = [];
  callPrompts.slice(1).forEach((prompt, index) => {
    contextRows.push({ label: `Decision ${index + 2}`, text: prompt });
  });
  if (parked.why) contextRows.push({ label: "Why you", text: parked.why, testId: "ruling-why" });
  if (parked.changes)
    contextRows.push({ label: "What changes", text: parked.changes, testId: "ruling-changes" });
  if (parked.evidenceSummary)
    contextRows.push({ label: "What we know", text: parked.evidenceSummary, testId: "ruling-evidence-summary" });
  // The supersedes value may carry a trailing note ("(the loop's own earlier
  // proposal)"); the stakes line wants just the decision id.
  const supersededId = parked.supersedes?.match(/\b\d{3,4}\b/)?.[0] ?? null;
  return (
    <article
      data-testid="wwb-ruling"
      data-parked={parked.id}
      className="mb-5 rounded-inset border border-b-0 border-rule-strong bg-paper px-5 py-5"
    >
      <p className="panel-label mb-1">{parked.kind.replace(/-/g, " ")}</p>
      <h4 className="mb-4 font-sans text-[1.125rem] font-semibold leading-snug text-ink">{parked.title}</h4>

      {hasInlineComparison ? (
        <JudgmentBrief
          callLabel="Decision needed"
          call={conciseCall!}
          callTestId="ruling-ask"
          rows={[
            {
              label: "Keep current",
              text: parked.currentFraming!,
              detail: parked.rejectCost,
              testId: "ruling-current-framing",
            },
            {
              label: "Take proposal",
              text: parked.proposedFraming!,
              detail: parked.acceptCost,
              testId: "ruling-proposed-framing",
            },
          ]}
        />
      ) : callReady ? (
        <JudgmentBrief
          callLabel={callPrompts.length > 1 ? "Decision 1" : "Decision needed"}
          call={conciseCall ?? readableReferenceText(parked.ask!)}
          callTestId="ruling-ask"
          rows={contextRows}
        />
      ) : (
        <JudgmentBrief
          callLabel="Decision needed"
          call={readableReferenceText(parked.ask ?? parked.title)}
          rows={[]}
        />
      )}

      {supersededId || (parked.blocks && !hasInlineComparison) ? (
        <div className="mb-4 border-l-2 border-rule-strong pl-3 text-panel-body text-ink-muted" data-testid="ruling-stakes">
          {supersededId ? <p>Taking this replaces decision {supersededId}.</p> : null}
          {parked.blocks && !hasInlineComparison ? <p>Waiting on this: {parked.blocks}</p> : null}
        </div>
      ) : null}

      {hasCase ? (
        <div className="mb-3">
          <button
            type="button"
            data-testid="ruling-case-toggle"
            aria-expanded={caseOpen}
            onClick={() => setCaseOpen((v) => !v)}
            className="rounded-pill border border-rule px-3 py-1 text-panel-body font-medium text-ink-muted transition-colors"
          >
            {caseOpen ? "Hide the full case" : "Show the full case"}
          </button>
          {caseOpen ? (
            <div className="mt-3">
              {parked.candidate ? (
                <blockquote className="my-3 rounded-inset bg-paper-raised px-5 py-3 font-serif text-[1.2rem] italic leading-snug text-ink" data-testid="ruling-candidate">
                  <span aria-hidden className="mr-1 text-ink-faint">&ldquo;</span>
                  {parked.candidate}
                  <span aria-hidden className="ml-1 text-ink-faint">&rdquo;</span>
                </blockquote>
              ) : null}
              {parked.bodyBlocks.length ? (
                <div className="mb-3 max-w-[34rem] text-panel-body">
                  <Reading blocks={parked.bodyBlocks} />
                </div>
              ) : null}
              {parked.receipts.length ? (
                <div className="mb-3">
                  <ReceiptLinks receipts={parked.receipts} slug={slug} onFocus={onFocusReceipt} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 border-t border-rule pt-4">
        <p className="panel-label mb-2">{recorded ? "Status" : "Your decision"}</p>
        {recorded && !(isPick && recorded === "pick") ? (
        // Read from the ledger's Review log, so it survives a page refresh:
        // the card stays visible as a recorded ruling until research
        // re-scopes What's Worth Building, then clears with the next round.
        <p className="mt-2 text-panel-body font-semibold" style={{ color: "var(--accent)" }} data-testid="ruling-recorded">
          Ruling recorded: {recorded === "reshape" || recorded === "pick" ? "your pick" : recorded}.
          Research re-scopes around it, then this card clears.
        </p>
      ) : interactive ? (
        isPick ? (
          <>
            <p className="mb-2 text-panel-body text-ink-muted">
              {parked.options.length
                ? "Click the option you pick; that click is the ruling. None of these sends the set back."
                : "The drafted options live in the full case; they turn into one-click choices after the next research pass. None of these sends the set back."}
            </p>
            {parked.options.length ? (
              <div className="mb-2 space-y-2">
                {parked.options.map((o) => {
                  const words = `${o.label}: ${o.text}`;
                  const done = recordedPicks.includes(words);
                  return (
                    <button
                      key={o.label}
                      type="button"
                      data-testid={`ruling-pick-${o.label}`}
                      disabled={busy || done}
                      onClick={() => onPick("pick", words)}
                      className="w-full rounded-inset border px-3 py-2 text-left text-panel-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      style={
                        done
                          ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
                          : { background: "transparent", color: "var(--ink)", borderColor: "var(--rule-strong)" }
                      }
                    >
                      <span className="mr-2" style={{ color: "var(--accent)" }}>{o.label}</span>
                      {done ? `${o.text} (recorded)` : busy && picked === "pick" ? "Recording…" : o.text}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {recordedPicks.length || recorded === "pick" ? (
              <p className="mb-2 text-panel-body font-semibold" style={{ color: "var(--accent)" }} data-testid="pick-recorded">
                Recorded: {recordedPicks.map((w) => w.split(":")[0]).join(", ") || "your pick"}. A call
                with two halves takes two clicks; research folds them in together.
              </p>
            ) : null}
            <button
              type="button"
              data-testid="ruling-reject"
              aria-pressed={picked === "reject"}
              disabled={busy}
              onClick={() => onPick("reject")}
              className="mb-1 w-full rounded-inset border px-3 py-2 text-panel-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={
                picked === "reject"
                  ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
                  : { background: "transparent", color: "var(--ink)", borderColor: "var(--rule-strong)" }
              }
            >
              {busy && picked === "reject" ? "Recording…" : "None of these, send it back"}
            </button>
            {error ? <p className="mt-1 text-panel-body text-unverified">{error}</p> : null}
          </>
        ) : (
          <>
            {/* One click IS the ruling: it posts the moment you choose. */}
            <p className="mb-2 text-panel-body text-ink-muted">
              One click records the path named on the button.
            </p>
            <div className="mb-1 grid grid-cols-2 gap-2">
              {([
                { disposition: "reject" as const, label: "Keep current" },
                { disposition: "accept" as const, label: "Take proposal" },
              ]).map(({ disposition, label }) => (
                <button
                  key={disposition}
                  type="button"
                  data-testid={`ruling-${disposition}`}
                  aria-pressed={picked === disposition}
                  disabled={busy}
                  onClick={() => onPick(disposition)}
                  className="w-full rounded-inset border px-3 py-2 text-panel-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={
                    picked === disposition
                      ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
                      : { background: "transparent", color: "var(--ink)", borderColor: "var(--rule-strong)" }
                  }
                >
                  {busy && picked === disposition ? "Recording…" : label}
                </button>
              ))}
            </div>
            {error ? <p className="mt-1 text-panel-body text-unverified">{error}</p> : null}
          </>
        )
        ) : null}
      </div>
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
  const missing = [
    !entry.what?.trim() ? "the exact idea" : null,
    !entry.forLine?.trim() ? "the strongest case for it" : null,
    !entry.againstLine?.trim() ? "the strongest case against it" : null,
  ].filter((value): value is string => value != null);
  const judgmentReady = missing.length === 0;
  const hasSummary = !!(entry.what || entry.forLine || entry.againstLine);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  return (
    <li
      data-testid="wwb-entry"
      data-entry={entry.id}
      className="rounded-inset border border-b-0 bg-paper px-5 py-5"
      style={{
        borderColor: "var(--rule-strong)",
        borderLeft: pending ? "2px solid var(--accent)" : undefined,
      }}
    >
      <p
        className="mb-1 text-panel-label font-semibold uppercase tracking-[0.08em]"
        style={{ color: cutLean ? "var(--unverified)" : "var(--verified)" }}
        data-testid="wwb-research-lean"
        data-lean={cutLean ? "dont-build" : "build"}
      >
        {cutLean ? <>Research recommends: don&rsquo;t build</> : <>Research recommends: build</>}
      </p>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h4 className="font-sans text-[1.125rem] font-semibold leading-snug text-ink">{entry.title}</h4>
        {recorded ? (
          <span
            className="shrink-0 rounded-pill border border-rule-strong px-2 py-0.5 text-panel-label font-semibold uppercase tracking-[0.08em] text-ink-muted"
            data-testid="verdict-recorded-pill"
          >
            Recorded
          </span>
        ) : pending ? (
          <span
            className="shrink-0 rounded-pill px-2 py-0.5 text-panel-label font-semibold uppercase tracking-[0.08em]"
            style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
            data-testid="in-this-review"
          >
            In this review
          </span>
        ) : null}
      </div>
      {judgmentReady ? (
        <>
          <JudgmentBrief
            callLabel="Decision needed"
            call="Should this idea be built now, saved for later, or left out?"
            testId="candidate-summary"
            rows={[
              { label: "The idea", text: entry.what!, testId: "entry-what" },
              {
                label: "Why you",
                text: cutLean
                  ? "Research recommends leaving this out, but only you decide what enters scope."
                  : "Research recommends building this, but only you decide what enters scope.",
                testId: "entry-why",
              },
              { label: "For", text: entry.forLine!, testId: "entry-for" },
              { label: "Against", text: entry.againstLine!, testId: "entry-against" },
            ]}
          />
          <button
            type="button"
            data-testid="entry-evidence-toggle"
            aria-expanded={evidenceOpen}
            onClick={() => setEvidenceOpen((v) => !v)}
            className="mb-1 rounded-pill border border-rule px-3 py-1 text-panel-body font-medium text-ink-muted transition-colors"
          >
            {evidenceOpen ? "Hide the evidence" : "Show the evidence"}
          </button>
          {evidenceOpen ? (
            <div className="mt-2">
              <Reasons entry={entry} slug={slug} onFocusReceipt={onFocusReceipt} />
            </div>
          ) : null}
        </>
      ) : (
        <>
          {triage ? (
            <JudgmentBrief
              callLabel="Decision needed"
              call="Should this idea be built now, saved for later, or left out?"
              rows={entry.what ? [{ label: "The idea", text: entry.what, testId: "entry-what" }] : []}
            />
          ) : null}
          {hasSummary || entry.reasons.length ? (
            <details className="mb-1">
              <summary className="text-panel-body font-medium text-ink-muted">Review the available evidence</summary>
              <div className="mt-2">
                <Reasons entry={entry} slug={slug} onFocusReceipt={onFocusReceipt} />
              </div>
            </details>
          ) : null}
        </>
      )}

      {recorded ? (
        <p className="mt-3 text-panel-body text-ink-muted" data-testid="verdict-recorded">
          {recorded === "build-now"
            ? "Accepted, moved to Will be built. Research folds it in on the next pass."
            : `Recorded as ${VERDICT_WORDS[recorded]}. Research folds it in on the next pass.`}
        </p>
      ) : triage ? (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="panel-label mb-1">Your decision</p>
          <p className="mb-3 text-panel-body leading-relaxed text-ink-muted">
            Choose what should happen to this idea. The button records that exact outcome.
          </p>
          {/* Build this and Leave it out record on the click. Save for later opens its
              optional note first, then records with its own button. */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Verdict for ${entry.title}`}>
            <VerdictButton label={busy ? "Recording…" : "Build this"} verdict="build-now" testid="verdict-build-now" state={state} disabled={busy} onVerdict={onVerdict} />
            <VerdictButton label="Save for later" verdict="backlog" testid="verdict-backlog" state={state} disabled={busy} onVerdict={onVerdict} />
            <VerdictButton label={busy ? "Recording…" : "Leave it out"} verdict="dont-build" testid="verdict-dont-build" state={state} disabled={busy} onVerdict={onVerdict} />
          </div>
          {!state && error ? <p className="mt-2 text-panel-body text-unverified">{error}</p> : null}
          {state?.verdict === "backlog" ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={state.note}
                onChange={(e) => onPatch({ note: e.target.value })}
                rows={2}
                placeholder="In your own words (optional)…"
                data-testid="verdict-note"
                className="w-full resize-y rounded-inset border border-rule bg-paper px-3 py-2 text-panel-body leading-relaxed text-ink outline-none transition-colors focus-visible:border-accent"
              />
              <input
                type="text"
                value={state.unblocks}
                onChange={(e) => onPatch({ unblocks: e.target.value })}
                placeholder="What unblocks it? (optional)"
                data-testid="verdict-unblocks"
                className="w-full rounded-inset border border-rule bg-paper px-3 py-2 text-panel-body text-ink outline-none transition-colors focus-visible:border-accent"
              />
              {error ? <p className="text-panel-body text-unverified">{error}</p> : null}
              <button
                type="button"
                onClick={onRecord}
                disabled={busy}
                data-testid="verdict-record"
                className="rounded-inset border px-3.5 py-1.5 text-panel-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: "var(--accent)", background: "var(--accent-wash)", color: "var(--accent)" }}
              >
                {busy ? "Recording…" : "Save for later"}
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
  disabled,
  onVerdict,
}: {
  label: string;
  verdict: WwbDisposition;
  testid: string;
  state?: VerdictState;
  disabled?: boolean;
  onVerdict: (v: WwbDisposition | null) => void;
}) {
  const active = state?.verdict === verdict;
  return (
    <button
      type="button"
      disabled={disabled}
      data-testid={testid}
      aria-pressed={active}
      onClick={() => onVerdict(active ? null : verdict)}
      className="w-full rounded-inset border px-3 py-2 text-panel-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={
        active
          ? { background: "var(--accent-wash)", color: "var(--accent)", borderColor: "var(--accent-edge)" }
          : { background: "transparent", color: "var(--ink)", borderColor: "var(--rule-strong)" }
      }
    >
      {label}
    </button>
  );
}

function QuestionRow({
  question,
  position,
  total,
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
  position: number;
  total: number;
  slug: string;
  interactive: boolean;
  value: string;
  /** The recorded answer (from this session or the ledger's Review log), or null. */
  answered: string | null;
  busy: boolean;
  error: string | null;
  onFocusReceipt?: (docKey: string) => void;
  onChange: (text: string) => void;
  onRecord: (answer?: string) => void;
}) {
  const missing = questionContextMissing(question);
  const needsClarification = missing.includes("a complete question");
  const callReady = !needsClarification;
  const prompts = decisionQuestions(question.ask);
  const contextRows: JudgmentRow[] = [];
  prompts.slice(1).forEach((prompt, index) => {
    contextRows.push({ label: `Decision ${index + 2}`, text: prompt });
  });
  if (question.why) contextRows.push({ label: "Why you", text: question.why, testId: "question-why" });
  if (question.changes)
    contextRows.push({ label: "What changes", text: question.changes, testId: "question-changes" });
  if (question.evidenceSummary)
    contextRows.push({ label: "What we know", text: question.evidenceSummary, testId: "question-evidence-summary" });
  const choiceOptions = callReady ? questionChoiceOptions(question) : [];
  return (
    <li
      id={`wwb-q-${question.id}`}
      data-question={question.id}
      className="rounded-inset border border-b-0 border-l-2 border-rule-strong border-l-accent bg-paper px-4 py-4"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-panel-body font-semibold text-ink" data-testid="question-heading">
          Question {position} of {total}
        </p>
        <span className="font-mono text-panel-label text-ink-faint" aria-label={`Reference ${question.id}`}>
          {question.id}
        </span>
      </div>

      {callReady ? (
        <JudgmentBrief
          callLabel={prompts.length > 1 ? "Decision 1" : "Decision needed"}
          call={prompts[0] ?? question.ask}
          callTestId="wwb-ask"
          rows={contextRows}
        />
      ) : (
        <JudgmentClarification draft={question.ask} />
      )}

      {answered ? (
        // Read from the ledger's Review log, so it survives a page refresh:
        // the question reads as answered until research folds it in.
        <div className="mt-4 border-t border-rule pt-4" data-testid={`answer-recorded-${question.id}`}>
          <p className="panel-label mb-2">Your answer</p>
          <p className="rounded-inset bg-paper-raised px-4 py-3 text-panel-body leading-relaxed text-ink">{answered}</p>
          <p className="mt-1 text-panel-body font-semibold" style={{ color: "var(--accent)" }}>
            Answer recorded. Research picks it up, then this clears.
          </p>
        </div>
      ) : interactive ? (
        <div className="mt-3 border-t border-rule pt-3">
          {choiceOptions.length >= 2 ? (
            <>
              <p className="mb-2 text-panel-body text-ink-muted">Choose the answer that matches your decision.</p>
              <div
                className={choiceOptions.length === 2 ? "grid grid-cols-2 gap-2" : "space-y-2"}
                role="group"
                aria-label={`Options for question ${position}`}
              >
                {choiceOptions.map((option) => {
                  const answer = option.label === option.text ? option.text : `${option.label}: ${option.text}`;
                  return (
                    <button
                      key={`${option.label}-${option.text}`}
                      type="button"
                      onClick={() => onRecord(answer)}
                      disabled={busy}
                      data-testid={`answer-option-${question.id}-${option.label}`}
                      className="w-full rounded-inset border border-rule-strong px-3 py-2 text-left text-panel-body font-semibold text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? (
                        "Recording…"
                      ) : option.label === option.text ? (
                        option.text
                      ) : (
                        <><span className="mr-2 text-accent">{option.label}</span>{option.text}</>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <label htmlFor={`answer-${question.id}`} className="sr-only">
                {needsClarification ? `Clarification for question ${position}` : `Decision for question ${position}`}
              </label>
              <textarea
                id={`answer-${question.id}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={2}
                placeholder={needsClarification ? "What I meant was…" : "I would… because…"}
                data-testid={`answer-${question.id}`}
                className="w-full resize-y rounded-inset border border-rule bg-paper px-3 py-2 text-panel-body leading-relaxed text-ink outline-none transition-colors focus-visible:border-accent"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-panel-body text-ink-muted">
                  {needsClarification ? "Skip this card if you are not sure." : "One sentence is enough."}
                </p>
                <button
                  type="button"
                  onClick={() => onRecord()}
                  disabled={!value.trim() || busy}
                  data-testid={`answer-record-${question.id}`}
                  className="rounded-inset border px-3 py-1 text-panel-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  {busy ? "Recording…" : needsClarification ? "Send clarification" : "Record my decision"}
                </button>
              </div>
            </>
          )}
          {error ? <p className="mt-2 text-panel-body text-unverified">{error}</p> : null}
        </div>
      ) : null}

      <details className="mt-2 border-t border-rule" data-testid="question-context">
        <summary className="py-2.5 text-panel-body font-medium text-ink-muted">
          Review context and evidence{question.receipts.length ? ` (${question.receipts.length})` : ""}
        </summary>
        <div className="pb-2">
          {question.blocks.length ? (
            <div className="text-panel-body leading-relaxed text-ink-muted">
              <Reading blocks={question.blocks} />
            </div>
          ) : (
            <p className="text-panel-body leading-relaxed text-ink-muted">
              No additional research notes were included.
            </p>
          )}
          {question.receipts.length ? (
            <div className="mt-3">
              <p className="panel-label mb-2">Evidence</p>
              <ReceiptLinks receipts={question.receipts} slug={slug} onFocus={onFocusReceipt} />
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

// ── Standing tiers (after-states) ─────────────────────────────────────────────

/**
 * One read-only shell for every entry Build input receives. It matches the
 * review cards' spacing, title hierarchy, and folded evidence without adding
 * decision controls to an after-state.
 */
function StandingEntryCard({
  entry,
  slug,
  eyebrow,
  status,
  children,
  onFocusReceipt,
}: {
  entry: WwbEntry;
  slug: string;
  eyebrow: string;
  status?: React.ReactNode;
  children?: React.ReactNode;
  onFocusReceipt?: (docKey: string) => void;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  return (
    <li
      data-testid="wwb-entry"
      data-entry={entry.id}
      className="rounded-inset border border-b-0 border-rule-strong bg-paper px-5 py-5"
    >
      <p className="mb-1 text-panel-label font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {eyebrow}
      </p>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h4 className="font-sans text-[1.125rem] font-semibold leading-snug text-ink">{entry.title}</h4>
        {status ? <span className="flex flex-wrap items-center gap-2">{status}</span> : null}
      </div>
      {children}
      {entry.reasons.length ? (
        <>
          <button
            type="button"
            data-testid="standing-evidence-toggle"
            aria-expanded={evidenceOpen}
            onClick={() => setEvidenceOpen((value) => !value)}
            className="mt-2 rounded-pill border border-rule px-3 py-1 text-panel-body font-medium text-ink-muted transition-colors"
          >
            {evidenceOpen ? "Hide the evidence" : `Show the evidence (${entry.reasons.length})`}
          </button>
          {evidenceOpen ? (
            <div className="mt-3" data-testid="standing-evidence">
              <Reasons entry={entry} slug={slug} onFocusReceipt={onFocusReceipt} />
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

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
          <StandingEntryCard
            key={e.id}
            entry={e}
            slug={slug}
            eyebrow="Accepted for build"
            onFocusReceipt={onFocusReceipt}
            status={
              <>
                {e.evidenceMoved ? <EvidenceMovedChip /> : null}
                <DecidedPill />
              </>
            }
          >
            {e.inTheirWords ? <WordsQuote words={e.inTheirWords} /> : null}
            {e.ruledBy ? <p className="text-panel-body leading-relaxed text-ink-muted">Ruled by {e.ruledBy}</p> : null}
          </StandingEntryCard>
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
          <StandingEntryCard
            key={e.id}
            entry={e}
            slug={slug}
            eyebrow="Saved for later"
            onFocusReceipt={onFocusReceipt}
            status={
              <>
                {e.evidenceMoved ? <EvidenceMovedChip /> : null}
                <OutlinePill label="Backlog" testid="wwb-backlog-pill" />
              </>
            }
          >
            {e.unblocks ? (
              <p className="text-panel-body leading-relaxed text-ink-muted">
                <span className="text-ink-faint">Unblocks: </span>
                {e.unblocks}
              </p>
            ) : null}
          </StandingEntryCard>
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
          <StandingEntryCard
            key={e.id}
            entry={e}
            slug={slug}
            eyebrow="Left out"
            onFocusReceipt={onFocusReceipt}
            status={<OutlinePill label="Won't build" testid="wwb-wont-build" />}
          />
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
      <p className="panel-label mb-3">Recorded just now</p>
      <ul className="space-y-3">
        {entries.map((e) => {
          // A verdict clicked this session, or one queued in the Review log
          // from before the refresh: either way the click is safe.
          const d = done[e.id] ?? { verdict: e.recordedVerdict as WwbDisposition, queued: true };
          return (
            <li
              key={e.id}
              data-testid="verdict-recorded"
              className="rounded-inset border border-b-0 border-rule-strong bg-paper px-5 py-5"
            >
              <p className="mb-1 text-panel-label font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Recorded just now
              </p>
              <div className="flex items-start justify-between gap-3">
                <span className="font-sans text-[1.125rem] font-semibold leading-snug text-ink">{e.title}</span>
                <OutlinePill label={VERDICT_WORDS[d.verdict]} testid="verdict-recorded-pill" />
              </div>
              <p className="mt-3 text-panel-body leading-relaxed text-ink-muted">
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
      <p className="mb-3 text-panel-body text-ink-faint">
        Things this problem clearly implies that nobody has said yes or no to yet. Listed so the full size of the problem stays visible.
      </p>
      <ul className="space-y-5">
        {entries.map((e) => (
          <StandingEntryCard
            key={e.id}
            entry={e}
            slug={slug}
            eyebrow="Not decided"
            onFocusReceipt={onFocusReceipt}
          />
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
        <li key={j} className="reading text-panel-body leading-relaxed" data-testid="wwb-reason">
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
      <footer className="mt-1.5 text-panel-label font-semibold uppercase not-italic tracking-[0.1em] text-ink-faint">
        In their words
      </footer>
    </blockquote>
  );
}

/** Decided (solid ink): a human-confirmed Build-now verdict. */
function DecidedPill() {
  return (
    <span
      className="shrink-0 rounded-pill px-2 py-0.5 text-panel-label font-semibold uppercase tracking-[0.08em] text-paper"
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
      className="shrink-0 rounded-pill border px-2 py-0.5 text-panel-label font-semibold uppercase tracking-[0.08em] text-ink-muted"
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
      className="shrink-0 rounded-pill px-2 py-0.5 text-panel-label font-semibold uppercase tracking-[0.08em]"
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
      className="shrink-0 rounded-pill border px-2 py-0.5 text-panel-label font-semibold uppercase tracking-[0.08em]"
      style={{ borderColor: "var(--unverified)", color: "var(--unverified)" }}
      data-testid="wwb-evidence-moved"
    >
      Evidence moved: re-rule
    </span>
  );
}
