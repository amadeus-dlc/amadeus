// size: small
//
// t449 — C12 `--autonomy` parser (#2253, Unit launch-autonomy-flag).
//
// FR-CLI-1: `--autonomy` takes one of the three AutonomyMode values and MUST
// consume its value, so the mode name never leaks into the freeform intent text
// (an unrecognized valued flag would read as intent words — the same reason
// `--report` consumes its value). FR-CLI-2(3): a value-less `--autonomy` is
// LOUD, so the parser flags it rather than dropping it silently.
//
// Driven in-process off the canonical source (seam-export-handler-amend): the
// parser is pure string work with zero filesystem I/O (NFR-3), so this file
// stays a small test.

import { describe, expect, test } from "bun:test";
import { parseNextFlags } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";

const MODES = ["none", "semi", "full"] as const;

describe("t449 --autonomy parser", () => {
  // P1-P3 (FR-CLI-1): each of the three modes is carried on flags.autonomy and
  // is absent from the freeform intent text.
  for (const mode of MODES) {
    test(`consumes the value for --autonomy ${mode}`, () => {
      const flags = parseNextFlags(["--autonomy", mode, "build", "the", "auth", "service"]);
      expect(flags.autonomy).toBe(mode);
      expect(flags.intent).toBe("build the auth service");
      expect(flags.intent ?? "").not.toContain(mode);
      expect(flags.autonomyMissingValue).toBeUndefined();
    });
  }

  test("carries the value even when it is not a valid mode (range check belongs to C13)", () => {
    const flags = parseNextFlags(["--autonomy", "bogus", "ship", "it"]);
    expect(flags.autonomy).toBe("bogus");
    expect(flags.intent).toBe("ship it");
  });

  // P4 (FR-CLI-2(3)): a trailing `--autonomy` has no value to consume; the
  // parser must MARK it so C13 can fail loudly instead of dropping it.
  test("flags a value-less --autonomy at the end of argv", () => {
    const flags = parseNextFlags(["--autonomy"]);
    expect(flags.autonomyMissingValue).toBe(true);
    expect(flags.autonomy).toBeUndefined();
    expect(flags.intent).toBeUndefined();
  });

  // A following token is consumed as the value even when it looks like a flag —
  // identical to --report. The range check (C13 judgment 2) then fails loudly on
  // it, so nothing is dropped silently.
  test("consumes a following flag-shaped token as the value", () => {
    const flags = parseNextFlags(["--autonomy", "--resume"]);
    expect(flags.autonomy).toBe("--resume");
    expect(flags.autonomyMissingValue).toBeUndefined();
  });

  test("absent --autonomy leaves both fields unset", () => {
    const flags = parseNextFlags(["--scope", "fix", "repair", "the", "latch"]);
    expect(flags.autonomy).toBeUndefined();
    expect(flags.autonomyMissingValue).toBeUndefined();
    expect(flags.intent).toBe("repair the latch");
  });
});
