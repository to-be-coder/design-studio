/**
 * Next.js server-boot hook (stable since 15, no config flag needed). The one
 * job here is the loop janitor: pick up the unfinished loop work a dead server
 * left behind (decision 0038). Node runtime only, dynamically imported so the
 * edge/browser compilations never see fs or child_process; the sweep runs
 * detached so boot never waits on a resumed loop.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootJanitor } = await import("./lib/loop-janitor");
  void bootJanitor().catch((err: unknown) => {
    console.warn(`[loop janitor] boot scan failed: ${err instanceof Error ? err.message : String(err)}`);
  });
}
