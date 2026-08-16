// covers: contract:pi-self-install-delivery
// size: medium
//
// t2363 — the .pi dogfood self-install face (Issue #2363).
//
// Pi was packaged into dist/pi/ but never promoted into the repository root,
// so this repository's own Pi sessions found no Amadeus surface. The
// user-visible loss is the §12a reviewer's read-only tool allowlist: Pi grants
// a delegated agent every tool unless its frontmatter narrows the set, so the
// pi manifest injects `tools: read, grep, find, ls` as a frontmatterAddition —
// a line that exists only on the projected face, never in the authored charter.
//
// The predicates run against the DELIVERY TREES (the packaged dist/pi/.pi and
// the promoted .pi/), never against the manifest, and compare file SETS rather
// than counts so adding or retiring a charter does not drift the test. Both
// trees come from `bun run build`, which CI runs before test:ci — the ordering
// t-ci-build-before-test.integration.test.ts pins.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const REVIEWER_CHARTER = "amadeus-architecture-reviewer-agent.md";

const packagedPi = (...segments: string[]): string =>
  join(REPO_ROOT, "dist", "pi", ".pi", ...segments);
const promotedPi = (...segments: string[]): string => join(REPO_ROOT, ".pi", ...segments);

function fileNames(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

describe("t2363 pi self-install delivery", () => {
  test("the promoted agents set equals the packaged agents set", () => {
    const packaged = fileNames(packagedPi("agents"));
    // Guards the equality below from passing on two empty directories.
    expect(packaged.length).toBeGreaterThan(0);
    expect(fileNames(promotedPi("agents"))).toEqual(packaged);
  });

  test("the promoted reviewer charter carries Pi's read-only tool allowlist", () => {
    const promoted = readFileSync(promotedPi("agents", REVIEWER_CHARTER), "utf-8");
    expect(promoted).toContain("\ntools: read, grep, find, ls\n");
    expect(promoted).toBe(readFileSync(packagedPi("agents", REVIEWER_CHARTER), "utf-8"));
  });

  test("the promoted face carries Pi's vendored OpenTelemetry runtime", () => {
    const packaged = fileNames(packagedPi("vendor", "opentelemetry"));
    expect(packaged.length).toBeGreaterThan(0);
    expect(fileNames(promotedPi("vendor", "opentelemetry"))).toEqual(packaged);
  });
});
