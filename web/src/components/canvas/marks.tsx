import type { AssumptionState } from "@/lib/types";
import { assumptionColorVar, assumptionFill, assumptionLabel, type Fill } from "./util";

/** A small state swatch — filled / half / outline — carrying a colour var. */
export function Swatch({ fill, color, size = 10 }: { fill: Fill; color: string; size?: number }) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 9999,
    flexShrink: 0,
  };
  if (fill === "solid") return <span style={{ ...base, background: color }} aria-hidden />;
  if (fill === "half")
    return (
      <span
        style={{
          ...base,
          border: `1.5px solid ${color}`,
          background: `linear-gradient(90deg, ${color} 0 50%, transparent 50% 100%)`,
        }}
        aria-hidden
      />
    );
  return <span style={{ ...base, border: `1.5px solid ${color}`, background: "transparent" }} aria-hidden />;
}

/** Assumption state as a designed mark + word (never colour alone). */
export function StateChip({ state }: { state: AssumptionState }) {
  return (
    <span className="inline-flex items-center gap-1.5 eyebrow" style={{ letterSpacing: "0.08em" }}>
      <Swatch fill={assumptionFill(state)} color={assumptionColorVar(state)} />
      <span style={{ color: assumptionColorVar(state) }}>{assumptionLabel(state)}</span>
    </span>
  );
}
