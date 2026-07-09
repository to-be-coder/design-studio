/** Display-formatting helpers shared across views. */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Accept either YYYY-MM-DD (date only) or full ISO. Parse safely.
  const d = iso.length === 10 ? new Date(iso + "T00:00:00") : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDays(iso: string | null | undefined): string {
  if (!iso) return "";
  const posted = iso.length === 10 ? new Date(iso + "T00:00:00") : new Date(iso);
  if (Number.isNaN(posted.getTime())) return iso;
  const now = new Date();
  const days = Math.floor((now.getTime() - posted.getTime()) / 86_400_000);
  if (days < 0) return iso;
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days <= 30) return `${days}d`;
  if (days <= 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

export function humanizeSlug(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
