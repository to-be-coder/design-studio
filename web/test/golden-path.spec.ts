import { test, expect, type Page } from "@playwright/test";

/**
 * The golden path (Acceptance section of the spec), automated against the
 * hermetic fixture vault as ONE test: open the canvas → read the whole flow
 * (framing → research → register → scope → directions → decision stream with a
 * supersede chain) using the keyboard sidebar index ALONE, focus visibly moving
 * → expand the design-system board → annotate a prototype element at component
 * scope with a token tweak → copy the export → assert it names the component,
 * the instance count, the scope, and the routing protocol.
 *
 * This is the reviewer's real walkthrough, keyboard-first for the reading half
 * (§14 a11y: every card reachable without a drag), pointer for the markup half.
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("golden path (/canvas/fixture-project)", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  test("read the flow by keyboard, expand the DS board, annotate + export", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors = trackConsoleErrors(page);
    await page.goto("/canvas/fixture-project");

    await expect(
      page.getByRole("heading", { level: 1, name: "Fixture Project", exact: true }),
    ).toBeVisible();

    // ── Reading half: keyboard sidebar index only (arrows + Enter to fly) ─────
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    const options = sidebar.getByRole("option");
    // Order (schema): Debrief, Research, Verify, Reframe, Scope, Directions,
    // Converge, Decision stream, Design system, Build, Validate, Spec.
    await options.first().focus();
    await expect(options.nth(0)).toBeFocused();

    // 0 · Debrief → the framing pane: brief beside restated problem.
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("framing-transform")).toBeVisible();
    const original = page.getByTestId("facet-original");
    const restated = page.getByTestId("facet-restated");
    await expect(original).toBeVisible();
    await expect(restated).toBeVisible();
    const ob = await original.boundingBox();
    const rb = await restated.boundingBox();
    expect(ob && rb && rb.x > ob.x + ob.width / 2).toBeTruthy(); // genuinely side by side

    // 1 · Research → the synthesis reads as a page.
    await page.keyboard.press("ArrowDown");
    await expect(options.nth(1)).toBeFocused(); // focus visibly moved
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("the artifact and the decision that shaped it live", { exact: false }),
    ).toBeVisible();

    // 2 · Verify → the assumption register.
    await page.keyboard.press("ArrowDown");
    await expect(options.nth(2)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#assumption-A1")).toBeVisible();

    // 4 · Scope → the cut list called out.
    await page.keyboard.press("ArrowDown"); // Reframe
    await page.keyboard.press("ArrowDown"); // Scope
    await expect(options.nth(4)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Cross-project knowledge graph/i)).toBeVisible();

    // 5 · Directions.
    await page.keyboard.press("ArrowDown");
    await expect(options.nth(5)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/the spatial canvas/i).first()).toBeVisible();

    // 7 · Decision stream → the supersede chain is drawn, not just linked.
    await page.keyboard.press("ArrowDown"); // Converge
    await page.keyboard.press("ArrowDown"); // Decision stream
    await expect(options.nth(7)).toBeFocused();
    await page.keyboard.press("Enter");
    const superseded = page.locator("#d-0008");
    await expect(superseded).toBeVisible();
    await expect(superseded).toHaveAttribute("data-superseded", "true");
    await expect(page.locator('[data-edge="d-0008->d-0009"]')).toBeVisible();

    // 8 · Design system → expand its living-specimen board.
    await page.keyboard.press("ArrowDown"); // Design system
    await expect(options.nth(8)).toBeFocused();
    await page.keyboard.press("Enter");
    const dsBoard = page.getByTestId("design-system-board");
    await expect(dsBoard).toBeVisible();
    await expect(dsBoard.locator('[data-component-base="button"]')).toBeVisible();
    await expect(page.getByTestId("contrast-ratio").first()).toBeVisible();

    // ── Markup half: annotate a real component at component scope, then export ─
    await page.getByRole("option", { name: "Build", exact: true }).click();
    const desktop = page.frameLocator('[data-frame-device="desktop"]');
    await expect(desktop.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.getByRole("button", { name: "Zoom to fit" }).click();
    await page.waitForTimeout(500);

    await page.getByTestId("mode-comment").click();
    await desktop.getByTestId("cta-primary").click();

    const draft = page.getByTestId("comment-draft");
    await expect(draft).toBeVisible();
    // A matched component defaults to component scope, with a live instance count.
    await expect(draft.getByTestId("scope-component")).toBeChecked();
    await expect(draft.getByTestId("scope-instance-count")).toContainText(/instance/i);

    await draft.getByTestId("comment-note").fill("Primary action wants a calmer color");
    await draft.getByTestId("tweak-color").selectOption({ index: 1 });
    await expect(draft.getByTestId("tweak-specs")).toBeVisible();

    await draft.getByTestId("comment-save").click();
    await expect(page.getByTestId("comment-draft")).toHaveCount(0);
    await expect(desktop.locator('[data-testid="pin"]').first()).toBeVisible();

    await page.getByTestId("export-feedback").click();
    await expect(page.getByTestId("export-status")).toContainText("Copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());

    // The export names the component, the instance count, the scope, and the
    // routing protocol — the four things the acceptance test demands.
    expect(clip).toContain("button"); // the component
    expect(clip).toMatch(/\d+ instances? across \d+ routes?/i); // the instance count
    expect(clip).toMatch(/Scope:/); // the scope
    expect(clip).toContain("Routing protocol"); // the routing protocol
    expect(clip).toMatch(/smallest unit that is reusable/i);
    expect(clip).toContain("design-studio-validate");

    expect(errors, `console/page errors on golden path:\n${errors.join("\n")}`).toEqual([]);
  });
});
