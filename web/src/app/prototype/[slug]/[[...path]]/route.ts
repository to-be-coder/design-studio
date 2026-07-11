import { promises as fs } from "node:fs";
import path from "node:path";
import { getProject } from "@/lib/vault";
import { resolvePrototypeConfig } from "@/lib/prototype-config";

export const dynamic = "force-dynamic";

/**
 * The same-origin proxy (§9). Everything the app does to a prototype — height
 * measurement, instance scanning, hover overlays, click capture, wheel
 * forwarding, live token overrides — requires the frame be same-origin, so we
 * serve it under THIS app's origin at /prototype/<slug>/*.
 *
 * Two shapes, resolved from the never-in-vault prototype config:
 *   - a running dev server (url) → reverse-proxy the request to it;
 *   - a static checkout (repo with an index.html) → serve files from disk (the
 *     hermetic fixture case).
 * Neither → 404, and the frame strip degrades honestly.
 *
 * SPEC-CALL: a reverse-proxied dev server whose HTML references ROOT-absolute
 * assets (/foo.js) won't resolve under the /prototype/<slug>/ base; such assets
 * aren't rewritten. Prototypes with relative assets (or a matching basePath)
 * proxy cleanly; others degrade per §9. Static repos (all-relative) always work.
 */

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function notFound(reason: string): Response {
  return new Response(reason, { status: 404, headers: { "content-type": "text/plain" } });
}

/**
 * Inject a <base> so the frame's relative URLs (styles.css, page2.html, assets)
 * always resolve under /prototype/<slug>/ regardless of the document URL — the
 * one reliable fix for serving under a path prefix (a trailing-slash redirect
 * would otherwise reparent relative links). Idempotent: skips if a base exists.
 */
function injectBase(html: string, base: string): string {
  if (/<base\s/i.test(html)) return html;
  const tag = `<base href="${base}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + tag);
  return tag + html;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
): Promise<Response> {
  const { slug, path: parts } = await params;
  const rel = (parts ?? []).join("/");
  const base = `/prototype/${slug}/`;

  const project = await getProject(slug);
  if (!project) return notFound(`No project "${slug}".`);
  const cfg = await resolvePrototypeConfig(slug, project.project.prototypeRepo);

  // Prefer a running dev server.
  if (cfg.url) {
    const search = new URL(req.url).search;
    const target = `${cfg.url.replace(/\/$/, "")}/${rel}${search}`;
    try {
      const upstream = await fetch(target, { headers: { accept: req.headers.get("accept") ?? "*/*" } });
      const ct = upstream.headers.get("content-type");
      const headers = new Headers();
      if (ct) headers.set("content-type", ct);
      headers.set("cache-control", "no-store");
      if (ct && /text\/html/i.test(ct)) {
        const html = injectBase(await upstream.text(), base);
        return new Response(html, { status: upstream.status, headers });
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch {
      return notFound(`Prototype dev server unreachable at ${cfg.url}.`);
    }
  }

  // Otherwise serve a static checkout from disk.
  if (cfg.staticRepo && cfg.repo) {
    const root = path.resolve(cfg.repo);
    const requested = path.resolve(root, rel || "index.html");
    // Path-traversal guard.
    if (requested !== root && !requested.startsWith(root + path.sep)) {
      return notFound("Out of bounds.");
    }
    let abs = requested;
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) abs = path.join(abs, "index.html");
    } catch {
      return notFound(`Not found: ${rel}`);
    }
    try {
      const ext = path.extname(abs).toLowerCase();
      const ct = MIME[ext] ?? "application/octet-stream";
      if (/text\/html/i.test(ct)) {
        const html = injectBase(await fs.readFile(abs, "utf8"), base);
        return new Response(html, {
          status: 200,
          headers: { "content-type": ct, "cache-control": "no-store" },
        });
      }
      const buf = await fs.readFile(abs);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: { "content-type": ct, "cache-control": "no-store" },
      });
    } catch {
      return notFound(`Not found: ${rel}`);
    }
  }

  return notFound(`No embeddable prototype configured for "${slug}".`);
}
