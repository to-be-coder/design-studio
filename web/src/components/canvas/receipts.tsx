"use client";

import type { Receipt } from "@/lib/types";
import { obsidianHref } from "./util";

/**
 * Receipts as link chips. When a receipt resolves to a doc the canvas surfaces
 * (receipt.docKey), the chip focuses it in place; otherwise it falls back to the
 * read-only obsidian:// deep link. The accent is the one live-navigation use.
 */
export function ReceiptLinks({
  receipts,
  slug,
  onFocus,
}: {
  receipts: Receipt[];
  slug: string;
  onFocus?: (docKey: string) => void;
}) {
  if (!receipts.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" data-testid="receipts">
      {receipts.map((r, i) => (
        <ReceiptChip key={`${r.target}-${i}`} receipt={r} slug={slug} onFocus={onFocus} />
      ))}
    </span>
  );
}

const chipClass =
  "inline-flex max-w-[16rem] items-center gap-1 truncate rounded-pill border border-rule px-2 py-0.5 text-[0.75rem] text-accent transition-colors hover:bg-paper-raised";

function ReceiptChip({
  receipt,
  slug,
  onFocus,
}: {
  receipt: Receipt;
  slug: string;
  onFocus?: (docKey: string) => void;
}) {
  const label = (
    <>
      <LinkGlyph />
      <span className="truncate">{receipt.label}</span>
    </>
  );

  if (receipt.docKey && onFocus) {
    return (
      <button
        type="button"
        data-testid="receipt-link"
        data-receipt-kind={receipt.kind}
        onClick={() => onFocus(receipt.docKey!)}
        className={chipClass}
      >
        {label}
      </button>
    );
  }

  const href = obsidianHref(slug, receipt.target);
  return (
    <a
      href={href ?? "#"}
      data-testid="receipt-link"
      data-receipt-kind={receipt.kind}
      className={chipClass}
    >
      {label}
    </a>
  );
}

function LinkGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
