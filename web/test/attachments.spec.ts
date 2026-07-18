import { test, expect, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveAttachment, attachmentInboxNote } from "../src/lib/attachments";

/**
 * Attach-a-folder coverage. Three layers, all hermetic:
 *
 *  1. The lib (saveAttachment / attachmentInboxNote) directly, in Node: the copy
 *     logic, path safety, the ignore list, the caps, and the inbox note. This is
 *     exactly what both routes call, so it proves "a folder writes files under
 *     _assets/<name>/ plus an inbox note" and "a folder alone (no text) is valid"
 *     without needing the autorun-gated input route to be live.
 *  2. The /api/projects route with a real multipart body: the create route is not
 *     autorun-gated for the scaffold, so a folder attached to a new project really
 *     lands in the fixture vault. Cleaned up after.
 *  3. The Add-input control in the browser: attaching a folder shows the count and
 *     enables submit with no text typed, and submit switches to multipart.
 */

// The fixture vault the test server writes to (same resolution as the config).
const VAULT = process.env.DESIGN_STUDIO_VAULT?.trim() || path.resolve(__dirname, "fixtures/vault");

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function tmpProjectDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "ds-attach-"));
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ── 1. The lib, in Node ───────────────────────────────────────────────────────

test.describe("saveAttachment (lib)", () => {
  test("copies a folder verbatim under _assets/<name>/, stripping the shared top dir", async () => {
    const dir = await tmpProjectDir();
    try {
      const res = await saveAttachment(
        dir,
        [
          { relPath: "starter-app/index.html", bytes: Buffer.from("<h1>hi</h1>") },
          { relPath: "starter-app/src/app.js", bytes: Buffer.from("console.log(1)") },
        ],
        { label: "unused-fallback" },
      );

      expect(res.assetDir).toBe("_assets/starter-app");
      expect(res.manifest).toEqual(["index.html", "src/app.js"]);
      expect(res.skipped).toEqual([]);
      expect(res.totalBytes).toBe("<h1>hi</h1>".length + "console.log(1)".length);

      expect(await fs.readFile(path.join(dir, "_assets/starter-app/index.html"), "utf8")).toBe(
        "<h1>hi</h1>",
      );
      expect(await fs.readFile(path.join(dir, "_assets/starter-app/src/app.js"), "utf8")).toBe(
        "console.log(1)",
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("falls back to the label when the files share no common top dir", async () => {
    const dir = await tmpProjectDir();
    try {
      const res = await saveAttachment(
        dir,
        [
          { relPath: "a.txt", bytes: Buffer.from("a") },
          { relPath: "b.txt", bytes: Buffer.from("b") },
        ],
        { label: "loose files" },
      );
      // Sanitized, filesystem-safe, no separators.
      expect(res.assetDir).toBe("_assets/loose files");
      expect(res.manifest).toEqual(["a.txt", "b.txt"]);
      expect(await exists(path.join(dir, "_assets/loose files/a.txt"))).toBe(true);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("skips .git, node_modules, and .DS_Store; keeps the rest", async () => {
    const dir = await tmpProjectDir();
    try {
      const res = await saveAttachment(
        dir,
        [
          { relPath: "app/index.html", bytes: Buffer.from("a") },
          { relPath: "app/.git/config", bytes: Buffer.from("b") },
          { relPath: "app/node_modules/x/index.js", bytes: Buffer.from("c") },
          { relPath: "app/.DS_Store", bytes: Buffer.from("d") },
        ],
        {},
      );
      expect(res.manifest).toEqual(["index.html"]);
      expect([...res.skipped].sort()).toEqual([
        "app/.DS_Store",
        "app/.git/config",
        "app/node_modules/x/index.js",
      ]);
      expect(await fs.readdir(path.join(dir, "_assets/app"))).toEqual(["index.html"]);
      expect(await exists(path.join(dir, "_assets/app/.git"))).toBe(false);
      expect(await exists(path.join(dir, "_assets/app/node_modules"))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("refuses '..' traversal, never writing outside the target dir", async () => {
    const dir = await tmpProjectDir();
    try {
      const res = await saveAttachment(
        dir,
        [
          { relPath: "app/ok.txt", bytes: Buffer.from("ok") },
          { relPath: "app/../escape.txt", bytes: Buffer.from("no") },
        ],
        {},
      );
      expect(res.manifest).toEqual(["ok.txt"]);
      expect(res.skipped).toEqual(["app/../escape.txt"]);
      // The escape never materialized anywhere.
      expect(await exists(path.join(dir, "escape.txt"))).toBe(false);
      expect(await exists(path.join(dir, "_assets/escape.txt"))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("refuses absolute paths", async () => {
    const dir = await tmpProjectDir();
    try {
      const res = await saveAttachment(
        dir,
        [
          { relPath: "bundle/ok.txt", bytes: Buffer.from("ok") },
          { relPath: "/etc/evil.txt", bytes: Buffer.from("no") },
        ],
        { label: "bundle" },
      );
      expect(res.skipped).toContain("/etc/evil.txt");
      expect(res.manifest).toContain("bundle/ok.txt");
      expect(await exists(path.join(dir, "_assets/bundle/etc/evil.txt"))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("throws (and writes nothing) when the file count cap is exceeded", async () => {
    const dir = await tmpProjectDir();
    try {
      const many = Array.from({ length: 501 }, (_, i) => ({
        relPath: `app/f${i}.txt`,
        bytes: Buffer.from("x"),
      }));
      await expect(saveAttachment(dir, many, {})).rejects.toThrow(/limit is 500/i);
      // Nothing was written: the cap is checked before any copy.
      expect(await exists(path.join(dir, "_assets"))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("throws when total bytes exceed the cap", async () => {
    const dir = await tmpProjectDir();
    try {
      // Three ~9 MB files = ~27 MB, over the 25 MB total cap but under the
      // per-file cap.
      const nine = Buffer.alloc(9 * 1024 * 1024, 1);
      const files = [0, 1, 2].map((i) => ({ relPath: `app/f${i}.bin`, bytes: nine }));
      await expect(saveAttachment(dir, files, {})).rejects.toThrow(/larger than the 25 MB limit/i);
      expect(await exists(path.join(dir, "_assets"))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

test.describe("attachmentInboxNote (lib)", () => {
  test("renders fed-in frontmatter, the folder wikilink, and a file manifest (no text needed)", () => {
    const note = attachmentInboxNote({
      assetDir: "_assets/starter-app",
      manifest: ["index.html", "src/app.js"],
      skipped: [],
    });
    expect(note).toContain("type: fed-in");
    expect(note).toContain("source: canvas");
    expect(note).toContain("[[_assets/starter-app]]");
    expect(note).toContain("- index.html");
    expect(note).toContain("- src/app.js");
    // A folder alone (no title, no text) is a complete, valid note: no H1 title
    // line (the H2 "## Attached folder" section is still present).
    expect(note).not.toMatch(/^# /m);
    expect(note).toContain("## Attached folder");
  });

  test("keeps the title and text verbatim above the folder section", () => {
    const note = attachmentInboxNote({
      title: "Kickoff notes",
      text: "Starts from this app.",
      assetDir: "_assets/app",
      manifest: ["index.html"],
      skipped: ["app/.DS_Store"],
    });
    expect(note).toContain("# Kickoff notes");
    expect(note).toContain("Starts from this app.");
    expect(note).toContain("## Attached folder");
    expect(note).toMatch(/Skipped 1 item/);
  });

  test("caps the manifest and notes the remainder", () => {
    const manifest = Array.from({ length: 80 }, (_, i) => `f${i}.txt`);
    const note = attachmentInboxNote({ assetDir: "_assets/big", manifest, skipped: [] });
    expect(note).toContain("Files (80):");
    expect(note).toContain("- and 20 more");
  });
});

// ── 2. The /api/projects route with a real multipart body ─────────────────────

test.describe("new project with an attached folder (/api/projects, multipart)", () => {
  const SLUG = "attach-folder-project";
  const DIR = path.join(VAULT, "Design Studio", SLUG);

  test.afterEach(async () => {
    await fs.rm(DIR, { recursive: true, force: true });
  });

  test("copies the folder into the new project and drops an inbox note", async ({ request }) => {
    const form = new FormData();
    form.set("name", "Attach Folder Project");
    form.set("brief", "Start from the attached starter app.");
    form.append(
      "files",
      new File([Buffer.from("<h1>Starter</h1>")], "starter-app/index.html", { type: "text/html" }),
    );
    form.append(
      "files",
      new File([Buffer.from("export const x = 1;")], "starter-app/src/app.js", {
        type: "text/javascript",
      }),
    );

    const res = await request.post("/api/projects", { multipart: form });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { slug?: string; attached?: string };
    expect(body.slug).toBe(SLUG);
    expect(body.attached).toBe("starter-app");

    // The folder is copied verbatim under _assets/starter-app/.
    expect(await fs.readFile(path.join(DIR, "_assets/starter-app/index.html"), "utf8")).toBe(
      "<h1>Starter</h1>",
    );
    expect(await fs.readFile(path.join(DIR, "_assets/starter-app/src/app.js"), "utf8")).toBe(
      "export const x = 1;",
    );

    // An inbox note points research at the folder.
    const inbox = path.join(DIR, "02 Research", "_inbox");
    const notes = await fs.readdir(inbox);
    expect(notes.length).toBe(1);
    const note = await fs.readFile(path.join(inbox, notes[0]), "utf8");
    expect(note).toContain("type: fed-in");
    expect(note).toContain("[[_assets/starter-app]]");
  });
});

// ── 3. The Add-input control in the browser ───────────────────────────────────

test.describe("Add input: attach a folder", () => {
  test("attaching a folder shows the count, enables submit with no text, and posts multipart", async ({
    page,
  }, testInfo) => {
    const errors = trackConsoleErrors(page);

    // A tiny on-disk folder for the directory picker to read.
    const folder = path.join(testInfo.outputDir, "starter-kit");
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, "index.html"), "<h1>hi</h1>");
    await fs.writeFile(path.join(folder, "readme.txt"), "notes");

    // Intercept the route so nothing spawns and the autorun gate is never hit;
    // capture the request's content-type to prove the client switched to multipart.
    let contentType = "";
    await page.route("**/api/projects/input", async (route) => {
      contentType = route.request().headers()["content-type"] ?? "";
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ file: "02 Research/_inbox/x.md", running: true, attached: "starter-kit" }),
      });
    });

    await page.goto("/canvas/fixture-project?runs=1");
    await page.getByTestId("add-input").click();
    await expect(page.getByTestId("add-input-modal")).toBeVisible();

    // Submit is disabled with neither text nor a folder.
    await expect(page.getByTestId("add-input-submit")).toBeDisabled();

    // Attach the folder via the hidden directory input.
    await page.getByTestId("add-input-folder").setInputFiles(folder);

    // The picked summary names a file count, and submit enables with no text.
    await expect(page.getByTestId("add-input-folder-picked")).toContainText(/2 files/);
    await expect(page.getByTestId("add-input-submit")).toBeEnabled();

    await page.getByTestId("add-input-submit").click();
    await expect(page.getByTestId("add-input-done")).toBeVisible();
    expect(contentType).toContain("multipart/form-data");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Clear removes the picked folder and disables submit again", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const folder = path.join(os.tmpdir(), `ds-pick-${Date.now()}`);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, "a.txt"), "a");

    try {
      await page.goto("/canvas/fixture-project?runs=1");
      await page.getByTestId("add-input").click();
      await page.getByTestId("add-input-folder").setInputFiles(folder);
      await expect(page.getByTestId("add-input-folder-picked")).toBeVisible();
      await expect(page.getByTestId("add-input-submit")).toBeEnabled();

      await page.getByTestId("add-input-folder-clear").click();
      await expect(page.getByTestId("add-input-folder-picked")).toHaveCount(0);
      await expect(page.getByTestId("add-input-folder-pick")).toBeVisible();
      await expect(page.getByTestId("add-input-submit")).toBeDisabled();
    } finally {
      await fs.rm(folder, { recursive: true, force: true });
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
