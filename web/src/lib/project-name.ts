/**
 * The dashboard and canvas show a project by its short name — the part before
 * the " — " subtitle in its dashboard H1. "Thunderbolt — Agent Access &
 * Workspace Rethink" → "Thunderbolt". A name with no subtitle is unchanged.
 * Display-only: the full name stays intact in the vault and in exports.
 */
export function shortProjectName(name: string): string {
  return name.split(" — ")[0].trim();
}
