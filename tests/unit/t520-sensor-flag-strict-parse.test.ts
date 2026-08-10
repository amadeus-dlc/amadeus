// covers: file:packages/framework/core/tools/amadeus-sensor-flags.ts
// size: small
//
// t520 — #2741: the canonical strict flag-value read shared by the per-sensor
// CLIs. Pins BOTH malformed arms as loud (end-of-arguments, next-token-is-flag)
// and the well-formed arm as a plain pass-through, plus the single-definition
// property the fix rests on (no second copy of the read anywhere in the tree).

import { describe, expect, test } from "bun:test";
import { requireFlagValue } from "../../packages/framework/core/tools/amadeus-sensor-flags.ts";

// A throwing double for the injected `fail`. The real callers exit(1); the
// helper only needs `never`, so a throw lets both arms be asserted in-process.
function failDouble(msg: string): never {
  throw new Error(`FAIL:${msg}`);
}

describe("t520 requireFlagValue rejects both malformed arms", () => {
  test("a flag with no following token is loud (end of arguments)", () => {
    const argv = ["--stage", "requirements-analysis", "--depth"];
    expect(() => requireFlagValue(argv, 3, "--depth", failDouble)).toThrow(
      'FAIL:--depth expects a value, got end of arguments.',
    );
  });

  test("a flag followed by another flag is loud, and quotes the swallowed token", () => {
    const argv = ["--output-path", "--depth", "Minimal"];
    expect(() => requireFlagValue(argv, 1, "--output-path", failDouble)).toThrow(
      'FAIL:--output-path expects a value, got another flag: "--depth".',
    );
  });

  test("a well-formed value passes through unchanged", () => {
    const argv = ["--depth", "Minimal"];
    expect(requireFlagValue(argv, 1, "--depth", failDouble)).toBe("Minimal");
  });

  test("a value that merely CONTAINS dashes is not a flag", () => {
    // Only a leading `--` marks a flag; a hyphenated value (a stage slug, a
    // kebab-case unit kind) must survive. Guards against over-rejection.
    const argv = ["--stage", "requirements-analysis"];
    expect(requireFlagValue(argv, 1, "--stage", failDouble)).toBe("requirements-analysis");
  });

  test("a single-dash token is a value, not a flag", () => {
    const argv = ["--output-path", "-"];
    expect(requireFlagValue(argv, 1, "--output-path", failDouble)).toBe("-");
  });
});
