import { watch, type FSWatcher } from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { projectDir } from "@/lib/vault";

export const dynamic = "force-dynamic";

/** Collect a directory tree (the dir itself + every subdir) for per-dir watching. */
async function collectDirs(root: string): Promise<{ abs: string; rel: string }[]> {
  const out: { abs: string; rel: string }[] = [{ abs: root, rel: "" }];
  const walk = async (abs: string, rel: string) => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fsp.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".")) {
        const childRel = rel ? `${rel}/${e.name}` : e.name;
        out.push({ abs: path.join(abs, e.name), rel: childRel });
        await walk(path.join(abs, e.name), childRel);
      }
    }
  };
  await walk(root, "");
  return out;
}

/**
 * The live board (§0 ground rule): watch a project's folder and push changes to
 * the client over SSE. When a skill writes a new decision or artifact mid-session,
 * the affected card refetches and updates in place within a few seconds — no
 * full-page reload. Read-only: this only observes the vault, never writes it.
 */
export async function GET(req: Request): Promise<Response> {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return new Response("slug required", { status: 400 });

  const dir = await projectDir(slug);
  const encoder = new TextEncoder();
  const watchers: FSWatcher[] = [];
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* stream closed */
        }
      };
      send("ready", { slug });

      // Coalesce bursts (editors write in several syscalls) into one event.
      const pending = new Map<string, ReturnType<typeof setTimeout>>();
      const emit = (file: string) => {
        const norm = file.split("\\").join("/");
        const prior = pending.get(norm);
        if (prior) clearTimeout(prior);
        pending.set(
          norm,
          setTimeout(() => {
            pending.delete(norm);
            send("change", { file: norm });
          }, 120),
        );
      };

      // Watch each directory explicitly (portable — recursive fs.watch is
      // unreliable on Linux). Filenames from a per-dir watcher are relative to
      // that dir, so we re-prefix with the dir's project-relative path.
      try {
        const dirs = await collectDirs(dir);
        for (const d of dirs) {
          const w = watch(d.abs, (_type, filename) => {
            if (!filename) return;
            const name = filename.toString();
            emit(d.rel ? `${d.rel}/${name}` : name);
          });
          watchers.push(w);
        }
      } catch {
        send("error", { message: "watch unavailable" });
      }

      // Keep the connection alive through proxies.
      heartbeat = setInterval(() => send("ping", { t: Date.now() }), 15000);

      const close = () => {
        if (heartbeat) clearInterval(heartbeat);
        for (const w of watchers) w.close();
        for (const t of pending.values()) clearTimeout(t);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      for (const w of watchers) w.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
