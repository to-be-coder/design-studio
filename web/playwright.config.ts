import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * E2E smoke suite for the design-studio dashboard.
 *
 * Fixture vault: a hermetic, contract-correct vault under test/fixtures/vault
 * (shape mirrors skills/design-studio-shared/CONVENTIONS.md) so these tests
 * never touch a developer's real Obsidian vault. It's wired in via
 * DESIGN_STUDIO_VAULT, which src/lib/vault.ts resolves before falling back to
 * ~/.design-studio-vault.
 *
 * webServer choice: `next build && next start` (production server), not
 * `next dev`. This is the same build web-checks.yml already runs (so a
 * broken build fails there before Playwright even starts), and a built
 * server starts deterministically — no dev-mode HMR/on-demand-compile
 * timing to make the suite flaky in CI. The cost is a slower local loop
 * (a full build per run); that's an acceptable trade for CI reliability.
 *
 * DESIGN_STUDIO_VAULT: honors an already-set env var (same precedence as
 * vault.ts itself) so CI can set it explicitly; otherwise defaults to the
 * fixture vault checked in beside this config.
 */
const FIXTURE_VAULT = path.resolve(__dirname, "test/fixtures/vault");
const VAULT = process.env.DESIGN_STUDIO_VAULT?.trim() || FIXTURE_VAULT;
// Hermetic prototype wiring: maps the fixture project → its static prototype
// dir (relative repo resolved against this config file), so frames, comment,
// tweak, component board, and tokens mode are all E2E-testable without any
// external dev server.
const FIXTURE_PROTOTYPES = path.resolve(__dirname, "test/fixtures/prototypes.json");
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  // The suite drives several live iframes in parallel; a live-DOM assertion
  // (toHaveCSS on a frame element, an accumulating instance scan) can settle a
  // beat past the 5s default under CPU contention. 10s waits for the genuinely
  // async operation without masking a real failure.
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DESIGN_STUDIO_VAULT: VAULT,
      PROTOTYPE_CONFIG: process.env.PROTOTYPE_CONFIG?.trim() || FIXTURE_PROTOTYPES,
      // The prod-mode test server runs the process-spawning Render API, so the
      // dev-only guard needs its explicit opt-in (mirrors a self-hosted box).
      DESIGN_STUDIO_ALLOW_RUN: "1",
      // Never auto-spawn the headless debrief agent during tests, even if the
      // developer has it enabled in their shell — the create test would fire a
      // real Claude run against the fixture vault.
      DESIGN_STUDIO_AUTORUN_DEBRIEF: "",
    },
  },
});
