/**
 * The studio's own dogfooding projects — the meta-project and the Canvas
 * dashboard it was built through. Hidden from the web UI: dropped from the
 * projects index and their canvas routes 404. The vault reader
 * (`listProjects`) stays faithful and still lists them; this is purely a
 * presentation decision, kept in one place so the index and the route agree.
 */
export const HIDDEN_SLUGS = new Set(["design-studio", "design-studio-web"]);
