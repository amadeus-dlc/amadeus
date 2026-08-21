// covers: function:requireOnboardingDoc
// size: small
//
// #3388/#3389 review follow-up: requireOnboardingDoc is the fail-fast guard
// that keeps a missing distributable from silently producing fixtures without
// the onboarding doc (the #3386 failure mode dressed up as a passing run).
// Both arms are pinned here — the CI tree always has dist/ built, so the
// throwing arm would otherwise never execute under coverage. Kept fs-free:
// the existing-path arm probes this very test file, the missing-path arm a
// name nothing creates.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireOnboardingDoc } from "../harness/fixtures.ts";

const THIS_FILE = fileURLToPath(import.meta.url);

describe("requireOnboardingDoc — distributable presence guard", () => {
  test("returns the path when the onboarding doc exists", () => {
    expect(requireOnboardingDoc(THIS_FILE)).toBe(THIS_FILE);
  });

  test("throws with the rebuild instruction when the doc is missing", () => {
    const missing = join(THIS_FILE, "..", "no-such-onboarding-doc", "CLAUDE.md");
    expect(() => requireOnboardingDoc(missing)).toThrow(/run `bun run dist` before this suite/);
    expect(() => requireOnboardingDoc(missing)).toThrow("no-such-onboarding-doc");
  });
});
