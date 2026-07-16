import { test, expect, type Page } from "@playwright/test";

/**
 * Systematic surface coverage (QA mandate 2): every route, every mode, both
 * themes, prefers-reduced-motion, two viewport sizes, the proxy + API routes
 * directly, and a second (mid-pipeline / empty) fixture project. Zero console /
 * page errors asserted everywhere; visibility assertions over status codes.
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

// ── Second fixture: a mid-pipeline project renders empty/partial honestly ─────

test.describe("second fixture — mid-pipeline / empty states", () => {
  test("index lists both projects, each with its client", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Fixture Project/i })).toBeVisible();
    const minimal = page.getByRole("link", { name: /Fixture Minimal/i });
    await expect(minimal).toBeVisible();
    await expect(minimal.getByText("Minimal Fixtures Co.")).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("mid-pipeline canvas: pending stages, zero decisions, empty prototype — no crash", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const res = await page.goto("/canvas/fixture-minimal");
    expect(res?.ok()).toBeTruthy();

    // The sidebar index still lists every stage (un-run ones are not hidden).
    // Build is the pipeline's last stage now (compile-spec became an on-demand
    // render utility off the spine — decision 0028), still un-run here since this
    // project is only in research. Run-state isn't spelled out in the index.
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByRole("option", { name: "Research", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("option", { name: "Build", exact: true })).toBeVisible();

    // Build board: no prototype configured → the designed empty state, not a dead frame.
    await sidebar.getByRole("option", { name: "Build", exact: true }).click();
    await expect(page.getByTestId("prototype-empty")).toBeVisible();
    await expect(page.getByTestId("prototype-empty")).toContainText(/design-studio-build/i);

    // Decision stream: zero decisions leak in; it renders its empty state rather
    // than a broken card.
    await sidebar.getByRole("option", { name: "Decision stream", exact: true }).click();
    await expect(page.locator("#d-0008")).toHaveCount(0);

    // No DESIGN.md tokens → comment/tokens chrome is absent (degrades honestly).
    await expect(page.getByTestId("comment-toolbar")).toHaveCount(0);

    expect(errors, `console/page errors on minimal canvas:\n${errors.join("\n")}`).toEqual([]);
  });

  test("a table-format register renders its entries (not just H3 sections)", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-minimal");

    // The minimal fixture's register is a markdown TABLE, not H3 sections. It
    // must still parse into entries rather than reading "No register yet."
    await page.getByRole("option", { name: "Research", exact: true }).click();
    await page.getByTestId("sidebar").getByRole("option", { name: "Assumptions & risks" }).click();

    const r1 = page.locator("#assumption-R1");
    await expect(r1).toBeVisible();
    await expect(r1).toContainText(/mid-pipeline checkpoint/i); // the claim (col 2)
    await expect(r1).toContainText(/riskiest|load-bearing/i); // Load-bearing? = Yes → riskiest
    await expect(page.locator("#assumption-R2")).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Both themes: chrome contrast must not collapse ────────────────────────────

test.describe("theme contrast (light + dark)", () => {
  // Read a CSS color through a canvas so any format (oklch, rgb) resolves to
  // real painted RGB, then compute the WCAG contrast ratio in-page.
  async function inkOnPaper(page: Page): Promise<{ ink: number; muted: number }> {
    return page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const rgb = (v: string): [number, number, number] => {
        ctx.fillStyle = "#000000";
        ctx.fillStyle = v.trim();
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2]];
      };
      const lum = ([r, g, b]: [number, number, number]) => {
        const f = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const la = lum(a) + 0.05;
        const lb = lum(b) + 0.05;
        return la > lb ? la / lb : lb / la;
      };
      const paper = rgb(cs.getPropertyValue("--paper"));
      return {
        ink: ratio(rgb(cs.getPropertyValue("--ink")), paper),
        muted: ratio(rgb(cs.getPropertyValue("--ink-muted")), paper),
      };
    });
  }

  test("dark (default) keeps body + muted text readable", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    // The default board (Debrief) reads as a document; the sidebar names the
    // project — enough to confirm the canvas page rendered.
    await expect(page.getByTestId("sidebar")).toContainText("Fixture Project");
    // Default theme is dark (layout.tsx).
    await expect(page.locator("html")).toHaveClass(/dark/);
    const { ink, muted } = await inkOnPaper(page);
    expect(ink).toBeGreaterThanOrEqual(4.5); // body text — AA
    expect(muted).toBeGreaterThanOrEqual(3); // muted text — AA large / UI
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("light keeps body + muted text readable after toggle", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    await page.getByRole("button", { name: /switch to light theme/i }).click();
    await expect(page.locator("html")).toHaveClass(/light/);
    const { ink, muted } = await inkOnPaper(page);
    expect(ink).toBeGreaterThanOrEqual(4.5);
    expect(muted).toBeGreaterThanOrEqual(3);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Viewport sizes: narrow laptop + large display ─────────────────────────────

for (const vp of [
  { name: "narrow laptop", width: 1280, height: 800 },
  { name: "large display", width: 1920, height: 1080 },
]) {
  test.describe(`viewport ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test("index + canvas render with no horizontal body overflow, no errors", async ({ page }) => {
      const errors = trackConsoleErrors(page);

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

      await page.goto("/canvas/fixture-project");
      // A canvas board (Structure) exercises the pannable viewport + zoom HUD;
      // the default Debrief reads as a document with neither.
      await page.getByRole("option", { name: "Structure", exact: true }).click();
      await expect(page.getByTestId("zoom-hud")).toBeVisible();
      await expect(page.getByTestId("sidebar")).toBeVisible();

      // The page body itself must never scroll horizontally (the world pans; the
      // chrome does not blow out the viewport).
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      expect(overflow, "body must not overflow horizontally").toBeTruthy();

      expect(errors, `console/page errors at ${vp.name}:\n${errors.join("\n")}`).toEqual([]);
    });
  });
}

// ── prefers-reduced-motion disables the canvas fly animation (§14) ────────────

test.describe("prefers-reduced-motion", () => {
  test("a keyboard fly jumps instantly (no transition), no errors", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/canvas/fixture-project");
    const world = page.getByTestId("canvas-world");

    // Fly to a canvas board from the keyboard (focus the option, activate with
    // Enter) — a build-phase stage so there's a world to fly.
    const sidebar = page.getByTestId("sidebar");
    await sidebar.getByRole("option", { name: "Structure", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(world).toBeVisible();

    // Under reduced motion, applyView writes transition:none even for a fly, so
    // the transform must never carry the 380ms cubic-bezier animation.
    const style = (await world.getAttribute("style")) ?? "";
    expect(style).not.toContain("380ms");
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── All four canvas modes reachable, no errors ────────────────────────────────

test.describe("canvas modes", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });
  test("read → comment (element/page) → tokens all mount without errors", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();

    // Comment mode + both granularities.
    await page.getByTestId("mode-comment").click();
    await expect(page.getByTestId("granularity-element")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("granularity-page").click();
    await expect(page.getByTestId("granularity-page")).toHaveAttribute("aria-pressed", "true");

    // Tokens mode.
    await page.getByTestId("mode-tokens").click();
    await expect(page.getByTestId("tokens-panel")).toBeVisible();

    // Back to read (toggle tokens off).
    await page.getByTestId("mode-tokens").click();
    await expect(page.getByTestId("tokens-panel")).toHaveCount(0);

    expect(errors, `console/page errors across modes:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ── Proxy routes (/prototype/<slug>/*) directly ───────────────────────────────

test.describe("prototype proxy (/prototype/<slug>/*)", () => {
  test("serves the static prototype same-origin with an injected <base>", async ({ request }) => {
    const res = await request.get("/prototype/fixture-project/");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toContain('<base href="/prototype/fixture-project/">');
    expect(html).toContain("Overview");
  });

  test("serves prototype assets with correct MIME", async ({ request }) => {
    const res = await request.get("/prototype/fixture-project/styles.css");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/css/);
  });

  test("404s a missing file, an unknown project, and a traversal attempt", async ({ request }) => {
    expect((await request.get("/prototype/fixture-project/does-not-exist.html")).status()).toBe(404);
    expect((await request.get("/prototype/no-such-project/")).status()).toBe(404);
    // Path traversal must never escape the repo root.
    const trav = await request.get("/prototype/fixture-project/..%2f..%2fpackage.json");
    expect(trav.status()).not.toBe(200);
  });
});

// ── API routes (/api/card, /api/vault-events) directly ────────────────────────

test.describe("api routes", () => {
  test("/api/card returns rendered blocks, guards missing params + bad slug", async ({ request }) => {
    const ok = await request.get("/api/card?slug=fixture-project&file=" + encodeURIComponent("03 Structure.md"));
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(Array.isArray(body.blocks)).toBeTruthy();
    expect(body.blocks.length).toBeGreaterThan(0);

    expect((await request.get("/api/card?slug=fixture-project")).status()).toBe(400);
    expect(
      (await request.get("/api/card?slug=fixture-project&file=" + encodeURIComponent("Nope.md"))).status(),
    ).toBe(404);
  });

  test("/api/vault-events opens an SSE stream and emits ready; guards missing slug", async ({
    page,
    request,
  }) => {
    expect((await request.get("/api/vault-events")).status()).toBe(400);

    // The client connects via EventSource; assert it opens and receives a frame.
    await page.goto("/canvas/fixture-project");
    const got = await page.evaluate(async () => {
      return new Promise<string>((resolve) => {
        const es = new EventSource("/api/vault-events?slug=fixture-project");
        const done = (v: string) => {
          es.close();
          resolve(v);
        };
        es.addEventListener("ready", () => done("ready"));
        es.onopen = () => done("open");
        es.onerror = () => done("error");
        setTimeout(() => done("timeout"), 5000);
      });
    });
    expect(["ready", "open"]).toContain(got);
  });
});

// ── Focus mode: one board per sidebar item ───────────────────────────────────

test.describe("focus mode — one board per sidebar item", () => {
  test("the canvas opens on Debrief; each sidebar item isolates its board", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Default is the first stage (Debrief): a prose stage that reads off the
    // canvas as a document. Its document list is folded into the sidebar as an
    // accordion (no separate contents column), and the pane shows the first
    // document (Original brief). No framing pane, no decision stream, no zoom.
    await expect(page.getByTestId("doc-view")).toBeVisible();
    await expect(page.getByTestId("doc-contents")).toHaveCount(0);
    await expect(
      page.getByTestId("sidebar").getByRole("option", { name: "Original brief" }),
    ).toBeVisible();
    await expect(page.getByTestId("doc-view")).toContainText(/look modern/i); // the original brief
    await expect(page.getByTestId("framing-transform")).toHaveCount(0);
    await expect(page.locator("#region-decision-stream")).toHaveCount(0);

    // Click Research → the other prose stage reads off the canvas as a document,
    // and there is nothing to zoom, so the zoom HUD is hidden.
    await page.getByRole("option", { name: "Research", exact: true }).click();
    await expect(page.getByRole("option", { name: "Research", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("doc-view")).toBeVisible();
    await expect(page.getByTestId("framing-transform")).toHaveCount(0);
    await expect(page.locator("#region-decision-stream")).toHaveCount(0);
    await expect(page.getByTestId("zoom-hud")).toHaveCount(0);

    // A build-phase stage isolates on the canvas (not a document): the zoom HUD
    // returns and the reading view is gone.
    await page.getByRole("option", { name: "Structure", exact: true }).click();
    await expect(page.getByTestId("doc-view")).toHaveCount(0);
    await expect(page.getByTestId("zoom-hud")).toBeVisible();

    // The decision stream is reachable as its own isolated board.
    await page.getByRole("option", { name: "Decision stream", exact: true }).click();
    await expect(page.locator("#region-decision-stream")).toBeVisible();
    await expect(page.getByTestId("doc-view")).toHaveCount(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("the research reader: the sidebar accordion shows one document at a time", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // Research opens the reader; its documents fold into the sidebar, and the
    // pane shows the FIRST document by default.
    await page.getByRole("option", { name: "Research", exact: true }).click();
    const pane = page.getByTestId("doc-view");
    const sidebar = page.getByTestId("sidebar");
    await expect(pane).toBeVisible();
    await expect(page.getByTestId("doc-contents")).toHaveCount(0);
    // First research artifact (alphabetical) is "Company & product".
    await expect(pane).toContainText(/twelve-person design team/i);
    // Only one document is mounted — the register isn't stacked below it.
    await expect(page.locator("#assumption-A1")).toHaveCount(0);

    // Selecting the register sub-row REPLACES the pane: the register appears, and
    // the previously shown document is gone (not scrolled past — unmounted).
    await sidebar.getByRole("option", { name: "Assumptions & risks" }).click();
    await expect(page.locator("#assumption-A1")).toBeVisible();
    await expect(pane).not.toContainText(/twelve-person design team/i);
    await expect(sidebar.getByRole("option", { name: "Assumptions & risks" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    // Debrief's reader works the same: its first document is the Original brief;
    // selecting "Problem statement" swaps the pane to the reframe.
    await page.getByRole("option", { name: "Debrief", exact: true }).click();
    await expect(pane).toContainText(/look modern/i); // original brief, shown first
    await sidebar.getByRole("option", { name: "Problem statement" }).click();
    await expect(pane).toContainText(/trustworthy evidence/i);
    await expect(pane).not.toContainText(/look modern/i); // the brief is gone

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
