"use client";

/**
 * The floating zoom HUD (§8): −, a click-to-reset percentage, +, and
 * zoom-to-fit. Chrome that recedes — quiet until reached for.
 */
export function ZoomHud({
  pct,
  onZoomOut,
  onZoomIn,
  onReset,
  onFit,
}: {
  pct: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  return (
    <div
      className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-pill border border-rule bg-paper/90 px-1.5 py-1 backdrop-blur"
      data-testid="zoom-hud"
    >
      <HudButton label="Zoom out" onClick={onZoomOut}>
        −
      </HudButton>
      <button
        type="button"
        onClick={onReset}
        className="min-w-[3.5rem] rounded-pill px-2 py-1 text-center text-[0.8125rem] tabular-nums text-ink transition-colors hover:bg-paper-raised"
        aria-label="Reset zoom to 100%"
        data-testid="zoom-pct"
      >
        {Math.round(pct)}%
      </button>
      <HudButton label="Zoom in" onClick={onZoomIn}>
        +
      </HudButton>
      <span className="mx-0.5 h-4 w-px bg-rule" aria-hidden />
      <button
        type="button"
        onClick={onFit}
        className="rounded-pill px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:bg-paper-raised hover:text-ink"
        aria-label="Zoom to fit"
      >
        Fit
      </button>
    </div>
  );
}

function HudButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-pill text-[1rem] text-ink transition-colors hover:bg-paper-raised"
    >
      {children}
    </button>
  );
}
