import { spawn, type ChildProcess } from "node:child_process";
import type { PrototypeRunConfig } from "./prototype-config";

/**
 * The dev-server process manager behind the canvas Render control (§9). This is
 * the whole security surface, so read the guarantees before touching it:
 *
 *   - The command is NEVER supplied by the browser. Callers pass a
 *     PrototypeRunConfig that resolvePrototypeConfig read from the LOCAL config
 *     file, keyed by slug. A slug with no `run` block never reaches startPrototype.
 *   - Commands run via an ARGV ARRAY with `shell: false` — no shell string is
 *     ever constructed, so there is no shell-injection surface even if a config
 *     value were hostile.
 *   - ONE running process per slug. A second start while starting/ready is a
 *     no-op that returns the current status.
 *   - The registry lives on globalThis so the single map is shared across every
 *     route-module instance within the one `next start` process — that persistence
 *     across requests is the entire point (the process must outlive the request
 *     that started it).
 *
 * Route-level guards (dev-only unless DESIGN_STUDIO_ALLOW_RUN=1) live in the
 * route handler; this module assumes it's only ever called when allowed.
 */

export type RunState = "stopped" | "starting" | "ready" | "error";

export interface RunStatus {
  slug: string;
  state: RunState;
  pid?: number;
  /** Tail of the child's combined stdout/stderr, for honest UI. */
  lastLines?: string[];
  readyUrl?: string;
  error?: string;
}

interface Entry {
  child: ChildProcess | null;
  state: RunState;
  /** Ring buffer (~200 lines) of the child's output. */
  log: string[];
  readyUrl: string;
  error?: string;
  /** True while an intentional stop is in flight, so exit reads as "stopped". */
  stopping: boolean;
}

const RING = 200;
const TAIL = 40;

// Shared registry — one Map for the whole server process (see header).
const g = globalThis as unknown as { __designStudioProtoRun?: Map<string, Entry> };
const registry: Map<string, Entry> = g.__designStudioProtoRun ?? (g.__designStudioProtoRun = new Map());

function push(entry: Entry, chunk: string): void {
  for (const line of chunk.split(/\r?\n/)) {
    if (line.length) entry.log.push(line);
  }
  if (entry.log.length > RING) entry.log.splice(0, entry.log.length - RING);
}

export function getStatus(slug: string): RunStatus {
  const e = registry.get(slug);
  if (!e) return { slug, state: "stopped" };
  return {
    slug,
    state: e.state,
    pid: e.child?.pid,
    lastLines: e.log.slice(-TAIL),
    readyUrl: e.readyUrl,
    error: e.error,
  };
}

/** Poll readyUrl until it answers 2xx/3xx, the child dies, or we time out. */
async function pollReady(
  url: string,
  timeoutMs: number,
  aborted: () => boolean,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (aborted()) return false;
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(3000) });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {
      /* not up yet — keep polling */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function startPrototype(slug: string, run: PrototypeRunConfig): Promise<RunStatus> {
  const existing = registry.get(slug);
  // One process per slug: a second Start while it's coming up or up is a no-op.
  if (existing && (existing.state === "starting" || existing.state === "ready") && existing.child) {
    return getStatus(slug);
  }

  // Adopt an already-running dev server (e.g. the user started it in a terminal
  // outside the canvas) instead of spawning a colliding second process that would
  // just hit EADDRINUSE. We hold no child handle for an adopted server, so Stop
  // can only detach our tracking — it can't kill a process the canvas didn't start.
  try {
    const probe = await fetch(run.readyUrl, { method: "GET", signal: AbortSignal.timeout(2000) });
    if (probe.status >= 200 && probe.status < 400) {
      registry.set(slug, {
        child: null,
        state: "ready",
        log: [`[adopted] dev server already answering at ${run.readyUrl}`],
        readyUrl: run.readyUrl,
        stopping: false,
      });
      return getStatus(slug);
    }
  } catch {
    /* nothing answering yet — spawn it below */
  }

  const [command, ...args] = run.cmd;
  const child = spawn(command, args, {
    cwd: run.cwd,
    // Argv array + shell:false → the command is executed directly, never parsed
    // by a shell. detached:false → the child stays in this server's process group
    // (so it can never outlive/detach from us); stop() kills the child directly
    // rather than the negative group, which would take down this Next server too.
    shell: false,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const entry: Entry = {
    child,
    state: "starting",
    log: [],
    readyUrl: run.readyUrl,
    stopping: false,
  };
  registry.set(slug, entry);

  child.stdout?.on("data", (b: Buffer) => push(entry, b.toString()));
  child.stderr?.on("data", (b: Buffer) => push(entry, b.toString()));
  child.on("error", (err: Error) => {
    entry.state = "error";
    entry.error = err.message;
    push(entry, `[spawn error] ${err.message}`);
  });
  child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
    entry.child = null;
    push(entry, `[exited] code=${code ?? "null"} signal=${signal ?? "null"}`);
    if (entry.stopping) {
      entry.state = "stopped";
      return;
    }
    // An unexpected exit before/after ready — surface it honestly.
    if (entry.state === "ready") {
      entry.state = "stopped";
    } else {
      entry.state = "error";
      entry.error = `process exited (code ${code ?? "null"}, signal ${signal ?? "null"}) before ready`;
    }
  });

  const ready = await pollReady(
    run.readyUrl,
    run.readyTimeoutMs,
    () => entry.child == null || entry.state === "error",
  );

  if (entry.state === "error") return getStatus(slug);
  if (ready) {
    entry.state = "ready";
  } else {
    entry.state = "error";
    entry.error = `readyUrl ${run.readyUrl} not ready within ${run.readyTimeoutMs}ms`;
  }
  return getStatus(slug);
}

export function stopPrototype(slug: string): RunStatus {
  const e = registry.get(slug);
  if (!e || !e.child) {
    if (e) e.state = "stopped";
    return { slug, state: "stopped", lastLines: e?.log.slice(-TAIL), readyUrl: e?.readyUrl };
  }
  e.stopping = true;
  const pid = e.child.pid;
  try {
    e.child.kill("SIGTERM");
    // SIGKILL fallback if it ignores SIGTERM. Target the exact pid (never the
    // negative process group — that's this server's group with detached:false).
    if (pid) {
      setTimeout(() => {
        try {
          process.kill(pid, 0); // still alive?
          process.kill(pid, "SIGKILL");
        } catch {
          /* already gone */
        }
      }, 2000);
    }
  } catch {
    /* already gone */
  }
  e.state = "stopped";
  return getStatus(slug);
}
