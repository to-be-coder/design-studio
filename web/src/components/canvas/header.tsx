"use client";

import type { BoardHeader } from "@/lib/types";

/**
 * The board header now carries only the Override receipts, when present —
 * skipped-gate receipts are part of the honest flow, not dirty laundry to hide.
 * Stage identity lives in the sidebar; the board itself stays chrome-free.
 */
export function ProjectHeader({ header }: { header: BoardHeader }) {
  if (!header.overrides.length) return null;
  return (
    <header className="mb-2 w-[52rem] max-w-[92vw]">
      <div className="rounded-inset border border-rule bg-paper-raised px-4 py-3" data-testid="overrides">
        <p className="eyebrow mb-1.5">Override receipts</p>
        <ul className="space-y-1 text-[0.8125rem] text-ink-muted">
          {header.overrides.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>
    </header>
  );
}
