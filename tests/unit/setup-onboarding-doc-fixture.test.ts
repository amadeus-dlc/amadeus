// covers: function:requireOnboardingDoc
// size: small
//
// #3388/#3389 review follow-up: requireOnboardingDoc is the fail-fast guard
// that keeps a missing distributable from silently producing fixtures without
// the onboarding doc (the #3386 failure mode dressed up as a passing run).
// Both arms are pinned here — the CI tree always has dist/ built, so the
// throwing arm would otherwise never execute under coverage.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireOnboardingDoc } from "../harness/fixtures.ts";

describe("requireOnboardingDoc — distributable presence guard", () => {
  test("returns the path when the onboarding doc exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-onboarding-doc-"));
    try {
      const doc = join(dir, "CLAUDE.md");
      writeFileSync(doc, "@.claude/rules/amadeus.md\n");
      expect(requireOnboardingDoc(doc)).toBe(doc);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws with the rebuild instruction when the doc is missing", () => {
    const missing = join(tmpdir(), "amadeus-onboarding-doc-missing", "CLAUDE.md");
    expect(() => requireOnboardingDoc(missing)).toThrow(/run `bun run dist` before this suite/);
    expect(() => requireOnboardingDoc(missing)).toThrow(missing);
  });
});
