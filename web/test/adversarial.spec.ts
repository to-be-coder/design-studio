import { test, expect, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Adversarial QA (mandate 3): hunt the seams. Interaction collisions (hotkeys
 * while typing, mode switches with a draft open, pan/zoom under an open pin),
 * localStorage resilience (corrupt / previous-schema records), token overrides
 * (persist, reset-all, malformed guard), SSE thrash, and vault edge data. Every
 * page asserts zero console / page errors.
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

// ── Interaction collisions ────────────────────────────────────────────────────

test.describe("interaction collisions", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  async function openDraftOnCta(page: Page) {
    await page.goto("/canvas/fixture-project");
    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await page.waitForTimeout(500);
    await page.getByTestId("mode-comment").click();
    await desktop.getByTestId("cta-primary").click();
    await expect(page.getByTestId("comment-draft")).toBeVisible();
    return desktop;
  }

  test("hotkey C while typing in the draft (textarea AND a focused <select>) does NOT switch modes", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openDraftOnCta(page);

    // Typing 'c' in the note textarea must not toggle comment mode off.
    const note = page.getByTestId("comment-note");
    await note.click();
    await note.type("calm color");
    await expect(page.getByTestId("comment-draft")).toBeVisible();
    await expect(page.getByTestId("mode-comment")).toHaveAttribute("aria-pressed", "true");

    // A focused <select> uses 'c' for typeahead — the global hotkey must yield.
    const select = page.getByTestId("tweak-color");
    await select.focus();
    await select.press("c");
    await expect(page.getByTestId("comment-draft")).toBeVisible();
    await expect(page.getByTestId("mode-comment")).toHaveAttribute("aria-pressed", "true");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("switching modes with a draft open cancels deliberately and reverts the live preview", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const desktop = await openDraftOnCta(page);

    const btn = desktop.locator('[data-component="button"]').first();
    // Park the pointer away from the frame before every computed-style read:
    // the fixture button restyles on :hover, so a baseline captured while
    // hovered compares a different state than the post-revert rest state.
    await page.mouse.move(5, 5);
    const before = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Add a color tweak — previewed live on the frame (component scope default).
    await page.getByTestId("tweak-color").selectOption({ index: 1 });
    await expect(page.getByTestId("tweak-specs")).toBeVisible();
    await expect
      .poll(() => btn.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(before);

    // Switch to tokens mode → the draft is cancelled and its preview reverted
    // (deliberate, not a silent loss with lingering styles).
    await page.getByTestId("mode-tokens").click();
    await expect(page.getByTestId("comment-draft")).toHaveCount(0);
    await page.mouse.move(5, 5);
    await expect
      .poll(() => btn.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(before);
    // The revert must be total: no lingering inline override on the element.
    await expect.poll(() => btn.evaluate((el) => el.getAttribute("style") || "")).toBe("");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a saved pin stays anchored to its element through zoom, and the draft survives a sidebar toggle", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const desktop = await openDraftOnCta(page);

    // Toggling the sidebar with a draft open must not drop the draft. Hide via
    // the in-sidebar collapse icon, show via the chrome reopen icon.
    await page.getByRole("button", { name: /hide index/i }).click();
    await expect(page.getByTestId("comment-draft")).toBeVisible();
    await page.getByRole("button", { name: /show index/i }).click();

    // Save → a pin is injected into the frame document itself.
    await page.getByTestId("comment-save").click();
    const pin = desktop.locator('[data-testid="pin"]').first();
    await expect(pin).toBeVisible();
    const box0 = await pin.boundingBox();

    // Zoom the canvas — the pin lives in frame space, so it tracks its element
    // (its on-screen size changes with zoom, but it stays attached, not orphaned).
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(300);
    await expect(pin).toBeVisible();
    const box1 = await pin.boundingBox();
    expect(box0 && box1 && (box0.x !== box1.x || box0.y !== box1.y)).toBeTruthy();

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Token overrides: persistence, reset-all, malformed guard (§13) ────────────

test.describe("token overrides", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  async function toBuildFrame(page: Page) {
    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"][data-route=""]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    return desktop;
  }

  test("an override persists across reload and reset-all reverts every frame", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    let desktop = await toBuildFrame(page);
    const btn = () => desktop.locator('[data-component="button"]').first();

    await page.getByTestId("mode-tokens").click();
    await page
      .getByTestId("tokens-panel")
      .locator('[data-token="colors.primary"] [data-testid="token-input"]')
      .fill("#00ff00");
    await expect(btn()).toHaveCSS("background-color", "rgb(0, 255, 0)");
    await page.waitForTimeout(200); // let the localStorage write flush

    // Reload → the override is reloaded from localStorage and re-applied to the
    // freshly-mounted frame (unlike annotations, which are session-only).
    await page.reload();
    desktop = await toBuildFrame(page);
    await expect(btn()).toHaveCSS("background-color", "rgb(0, 255, 0)");

    // Reset all → every loaded frame reverts to its own stylesheet default.
    await page.getByTestId("mode-tokens").click();
    await page.getByTestId("tokens-reset-all").click();
    await expect(btn()).not.toHaveCSS("background-color", "rgb(0, 255, 0)");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a malformed hand-typed value is guarded — the frame keeps its default, not broken CSS", async ({
    page,
  }) => {
    // Lift the test ceiling above the two 45s frame-CSS timeouts below so they can spend their budget under parallel-load CPU spikes.
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    const desktop = await toBuildFrame(page);
    const btn = desktop.locator('[data-component="button"]').first();
    // Under parallel load the fixture stylesheet applies --color-primary a beat after the Overview heading paints; wait off the UA-default gray so `original` snapshots the true default, not a transient the revert can never match.
    await expect(btn).not.toHaveCSS("background-color", "rgb(239, 239, 239)", { timeout: 45000 });
    const original = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.getByTestId("mode-tokens").click();
    const input = page
      .getByTestId("tokens-panel")
      .locator('[data-token="colors.primary"] [data-testid="token-input"]');

    // First a valid override, then garbage typed over it. Overrides now fan out
    // to EVERY route column (each a live frame), and under full-suite parallel
    // load a CPU spike can 3x the whole suite — poll to 45s so the genuinely-async
    // re-style lands without masking a real failure; solo it settles <8s.
    await input.fill("#00ff00");
    await expect(btn).toHaveCSS("background-color", "rgb(0, 255, 0)", { timeout: 45000 });
    await input.fill("not-a-color;; }");

    // The garbage is flagged in the UI and NOT injected: the button falls back to
    // the prototype's own default primary — never a blanked/broken background.
    await expect(input).toHaveAttribute("data-invalid", "true");
    await expect(btn).toHaveCSS("background-color", original, { timeout: 45000 });
    expect(original).not.toBe("rgba(0, 0, 0, 0)"); // sanity: default is a real color

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── localStorage resilience: corrupt / previous-schema records (§14) ──────────

test.describe("localStorage resilience", () => {
  test("corrupt JSON view state → no white-screen, falls back to 100%", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.addInitScript(() => {
      localStorage.setItem("canvas-view:fixture-project", "{{{ not json");
      localStorage.setItem("canvas-overrides:fixture-project", "also not json");
    });
    await page.goto("/canvas/fixture-project");
    await expect(page.getByRole("heading", { level: 1, name: "Fixture Project" })).toBeVisible();
    await expect(page.getByTestId("canvas-world")).toBeVisible();
    await expect(page.getByTestId("zoom-pct")).toHaveText("100%");
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("previous-schema (wrong-shape) view state → ignored, no NaN transform", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.addInitScript(() => {
      // A record from an older schema: scale is a string, x is missing.
      localStorage.setItem(
        "canvas-view:fixture-project",
        JSON.stringify({ view: { y: 10, scale: "2" }, zoom: 3 }),
      );
      localStorage.setItem("canvas-overrides:fixture-project", JSON.stringify(["array", "not", "object"]));
    });
    await page.goto("/canvas/fixture-project");
    await expect(page.getByTestId("zoom-pct")).toHaveText("100%");
    const style = (await page.getByTestId("canvas-world").getAttribute("style")) ?? "";
    expect(style).not.toContain("undefined");
    expect(style).not.toContain("NaN");
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── SSE thrash: rapid successive writes settle to the final state ─────────────

test.describe("live board — SSE under rapid writes", () => {
  const SCOPE = path.resolve(
    __dirname,
    "fixtures/vault/Design Studio/fixture-project/03 Scope.md",
  );

  test("five writes in ~1.5s: no thrash, the final marker wins", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const original = await fs.readFile(SCOPE, "utf8");
    let last = "";
    try {
      await page.goto("/canvas/fixture-project");
      const card = page.locator("#card-scope-0");
      await expect(card).toBeVisible();
      await page.waitForTimeout(600); // let the EventSource connect

      for (let i = 0; i < 5; i++) {
        last = `SSE-THRASH-${i}-${Date.now()}`;
        const changed = original.replace(/# Scope & sequence/, `# Scope & sequence\n\n${last}`);
        await fs.writeFile(SCOPE, changed, "utf8");
        await page.waitForTimeout(250);
      }

      // The card converges on the final write's content — earlier markers gone.
      await expect(card).toHaveAttribute("data-live-updated", "true", { timeout: 8000 });
      await expect(card.getByText(last)).toBeVisible();
      await expect(card.getByText("SSE-THRASH-0-", { exact: false })).toHaveCount(0);
    } finally {
      await fs.writeFile(SCOPE, original, "utf8");
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Vault edge data: the renderer must not crash, must render honestly ────────

test.describe("vault edge data (fixture-project)", () => {
  test("a decision with dangling supersedes / rests_on renders without a crash or a dangling edge", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    // The dangling decision is rendered honestly, in place.
    const dangling = page.locator("#d-0012");
    await expect(dangling).toBeVisible();

    // Its supersede target does not exist → the connector is skipped, never
    // half-drawn against a missing anchor.
    await expect(page.locator('[data-edge^="d-0012->"]')).toHaveCount(0);

    // The known-good chain still draws, proving the skip was surgical.
    await expect(page.locator('[data-edge="d-0008->d-0009"]')).toBeVisible();

    expect(errors, `console/page errors on dangling refs:\n${errors.join("\n")}`).toEqual([]);
  });

  test("an artifact file with only frontmatter and no body renders without crashing", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    // The research region still renders its real artifacts; the empty stub did
    // not take the board (or its region) down.
    await expect(page.locator("#region-research")).toBeVisible();
    await expect(
      page.getByText("the artifact and the decision that shaped it live", { exact: false }),
    ).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

// ── Keyboard-only reading path: focus visibly moves ───────────────────────────

test.describe("keyboard-only reading path", () => {
  test("arrowing the sidebar index moves a visible focus ring", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");
    const options = page.getByTestId("sidebar").getByRole("option");
    await options.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(options.nth(1)).toBeFocused();

    // The focused option carries a real, visible focus outline (the accent ring),
    // so a keyboard reviewer can see where they are.
    const outlineW = await options.nth(1).evaluate((el) => {
      const cs = getComputedStyle(el);
      return parseFloat(cs.outlineWidth) || 0;
    });
    expect(outlineW).toBeGreaterThan(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
