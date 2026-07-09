/**
 * Fixed decorative background. Monotone-blue, futuristic, subtle: a faint blue
 * glow drifting from the top and a hairline grid that fades out. No animation.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* Faint grid, fading toward the bottom */}
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(120% 90% at 50% -10%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% -10%, black 30%, transparent 75%)",
        }}
      />

      {/* The single blue glow */}
      <div
        className="absolute -top-56 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)" }}
      />
    </div>
  );
}
