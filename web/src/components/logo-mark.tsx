import { cn } from "@/lib/utils";

/** A small futuristic monotone mark: a rounded node lattice with one lit node. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
      <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M7 7v10M12 7v10M17 7v10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="7" cy="12" r="1.6" fill="currentColor" fillOpacity="0.4" />
      <circle cx="17" cy="9" r="1.6" fill="currentColor" fillOpacity="0.4" />
      <circle cx="12" cy="15" r="2" fill="var(--accent-solid)" />
    </svg>
  );
}
