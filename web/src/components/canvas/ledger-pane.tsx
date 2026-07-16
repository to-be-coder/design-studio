"use client";

import type { LedgerEntry, LedgerModel } from "@/lib/types";
import { Reading } from "./markdown";
import { LedgerChip } from "./marks";
import { ReceiptLinks } from "./receipts";

/**
 * The knowns/unknowns ledger, rendered as a read-only reading pane (Questions
 * for you → Open → Retired). Answering happens in the WWB review surface now;
 * this stays a click-through receipt. Rows reuse the register/marks chip idioms;
 * retired entries recede (paper-raised + muted), never hidden.
 */
export function LedgerPane({
  ledger,
  slug,
  onFocusReceipt,
}: {
  ledger: LedgerModel;
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
}) {
  return (
    <div data-testid="ledger-pane">
      <p className="eyebrow mb-1">Knowns &amp; unknowns</p>
      <p className="mb-6 text-[0.8125rem] text-ink-faint">
        Every known and unknown in one id space: its state, the attempts against it, and the receipts that answered it.
      </p>

      <Group
        id="escalated"
        title="Questions for you"
        subtitle="Research exhausted; these need you. Answer them in What's Worth Building."
        entries={ledger.escalated}
        slug={slug}
        onFocusReceipt={onFocusReceipt}
        escalated
      />
      <Group id="open" title="Open" entries={ledger.open} slug={slug} onFocusReceipt={onFocusReceipt} />
      <Group id="retired" title="Retired" entries={ledger.retired} slug={slug} onFocusReceipt={onFocusReceipt} retired />
    </div>
  );
}

function Group({
  id,
  title,
  subtitle,
  entries,
  slug,
  onFocusReceipt,
  escalated,
  retired,
}: {
  id: string;
  title: string;
  subtitle?: string;
  entries: LedgerEntry[];
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
  escalated?: boolean;
  retired?: boolean;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8" data-testid={`ledger-group-${id}`}>
      <div className="mb-3 flex items-baseline gap-2">
        <h4 className="font-sans text-[0.9375rem] font-semibold text-ink">{title}</h4>
        <span className="font-mono text-[0.75rem] text-ink-faint">{entries.length}</span>
      </div>
      {subtitle ? <p className="mb-3 text-[0.8125rem] text-ink-faint">{subtitle}</p> : null}
      <ul className="space-y-4">
        {entries.map((e) => (
          <Row
            key={e.id}
            entry={e}
            slug={slug}
            onFocusReceipt={onFocusReceipt}
            escalated={escalated}
            retired={retired}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  entry,
  slug,
  onFocusReceipt,
  escalated,
  retired,
}: {
  entry: LedgerEntry;
  slug: string;
  onFocusReceipt?: (docKey: string) => void;
  escalated?: boolean;
  retired?: boolean;
}) {
  return (
    <li
      id={`ledger-${entry.id}`}
      data-ledger={entry.id}
      data-state={entry.state}
      className="rounded-inset border px-4 py-3"
      style={{
        borderColor: "var(--rule)",
        background: retired ? "var(--paper-raised)" : "transparent",
        opacity: retired ? 0.85 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="font-mono text-[0.75rem] text-ink-faint">{entry.id}</span>{" "}
          <span
            className={
              "font-sans text-[0.9375rem] font-semibold " +
              (retired ? "text-ink-muted line-through decoration-ink-faint/60" : "text-ink")
            }
          >
            {entry.title}
          </span>
        </span>
        <LedgerChip state={entry.state} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {entry.assumption ? (
          <span
            className="rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
            style={{ border: "1px solid var(--unverified)", color: "var(--unverified)" }}
          >
            Assumption
          </span>
        ) : null}
        {entry.loadBearing ? (
          <span className="text-[0.75rem] text-ink-faint">load-bearing</span>
        ) : null}
        {entry.attempts > 0 ? (
          <span className="font-mono text-[0.75rem] text-ink-faint">
            {entry.attempts} attempt{entry.attempts > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {escalated && entry.ask ? (
        <p className="mt-2 text-[0.9375rem] font-medium leading-snug text-ink" data-testid="ledger-ask">
          {entry.ask}
        </p>
      ) : null}

      {entry.blocks.length ? (
        <div className="mt-2 text-[0.9375rem]">
          <Reading blocks={entry.blocks} />
        </div>
      ) : null}

      {entry.lineage ? (
        <p className="mt-2 text-[0.75rem] text-ink-faint">{entry.lineage}</p>
      ) : null}

      {entry.receipts.length ? (
        <div className="mt-2">
          <ReceiptLinks receipts={entry.receipts} slug={slug} onFocus={onFocusReceipt} />
        </div>
      ) : null}
    </li>
  );
}
