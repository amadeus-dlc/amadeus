// covers: file:lib/run-tests-args.ts
// size: small
//
// The `perf` tier contract (#1830 FR-1). The real-time benchmarks are excluded
// from the CI profile, so the ONE thing that must never silently drift is which
// tiers each profile flag selects. tests/run-tests.ts is an executable script
// (importing it runs a whole session), so the decode lives in
// tests/lib/run-tests-args.ts and is driven here in-process — the same seam
// shape tests/unit/t220-run-tests-totals.test.ts uses for the totals block.
//
// The injected io stands in for the runner's process-terminating half: every
// call throws a tagged error so the exit paths are observable from a test
// instead of killing the runner process.
import { describe, expect, test } from "bun:test";
import { type ParseArgsIo, parseArgs } from "../lib/run-tests-args.ts";

class IoExit extends Error {
  constructor(readonly kind: string, readonly detail: string, readonly code: number) {
    super(`${kind}:${code}:${detail}`);
  }
}

const io: ParseArgsIo = {
  defaultParallel: 4,
  failUsage(message) {
    throw new IoExit("failUsage", message, 1);
  },
  fail(message, code) {
    throw new IoExit("fail", message, code);
  },
  help() {
    throw new IoExit("help", "", 0);
  },
};

/** The selected tier set, as a sorted list — the assertion surface of a profile. */
function tiers(argv: string[]): string[] {
  const parsed = parseArgs(argv, io);
  return [
    parsed.runSmoke ? "smoke" : "",
    parsed.runUnit ? "unit" : "",
    parsed.runIntegration ? "integration" : "",
    parsed.runE2e ? "e2e" : "",
    parsed.runPerf ? "perf" : "",
  ].filter(Boolean);
}

describe("perf tier selection", () => {
  test("--perf selects only the perf tier", () => {
    expect(tiers(["--perf"])).toEqual(["perf"]);
  });

  test("--ci does not select perf", () => {
    expect(tiers(["--ci"])).toEqual(["smoke", "unit", "integration"]);
  });

  test("the default profile does not select perf", () => {
    expect(tiers([])).toEqual(["smoke", "unit", "integration"]);
  });

  test("--all includes perf", () => {
    expect(tiers(["--all"])).toEqual(["smoke", "unit", "integration", "e2e", "perf"]);
  });

  test("--release includes perf", () => {
    expect(tiers(["--release"])).toEqual(["smoke", "unit", "integration", "e2e", "perf"]);
  });

  test("--perf composes with other level flags", () => {
    expect(tiers(["--unit", "--perf"])).toEqual(["unit", "perf"]);
  });
});

describe("unchanged argv decode", () => {
  test("each single level flag selects exactly itself", () => {
    expect(tiers(["--smoke"])).toEqual(["smoke"]);
    expect(tiers(["--unit"])).toEqual(["unit"]);
    expect(tiers(["--integration"])).toEqual(["integration"]);
    expect(tiers(["--e2e"])).toEqual(["e2e"]);
  });

  test("output modifiers do not select a level", () => {
    const parsed = parseArgs(["--coverage", "--coverage-dir", "cov", "--debug", "--filter", "t2"], io);
    expect(tiers(["--coverage"])).toEqual(["smoke", "unit", "integration"]);
    expect(parsed.coverage).toBe(true);
    expect(parsed.coverageDir).toBe("cov");
    expect(parsed.debug).toBe(true);
    expect(parsed.verbose).toBe(true);
    expect(parsed.filter).toBe("t2");
    expect(parsed.fullProfile).toBe(false);
  });

  test("--verbose stays independent of --debug", () => {
    const parsed = parseArgs(["--verbose"], io);
    expect(parsed.verbose).toBe(true);
    expect(parsed.debug).toBe(false);
  });

  test("--parallel and -P accept a positive integer, defaulting otherwise", () => {
    expect(parseArgs(["--parallel", "8"], io).parallel).toBe(8);
    expect(parseArgs(["-P", "2"], io).parallel).toBe(2);
    expect(parseArgs([], io).parallel).toBe(4);
  });

  test("--parallel rejects a non-positive-integer value with exit 2", () => {
    expect(() => parseArgs(["--parallel", "0"], io)).toThrow(
      "fail:2:ERROR: --parallel requires a positive integer (got: '0')",
    );
    expect(() => parseArgs(["--parallel"], io)).toThrow(
      "fail:2:ERROR: --parallel requires a positive integer (got: '<missing>')",
    );
  });

  test("--coverage-dir without a value fails usage", () => {
    expect(() => parseArgs(["--coverage-dir"], io)).toThrow(
      "failUsage:1:--coverage-dir requires a directory",
    );
  });

  test("an unknown flag fails usage", () => {
    expect(() => parseArgs(["--nope"], io)).toThrow("failUsage:1:Unknown flag: --nope");
  });

  test("--help and -h take the help exit", () => {
    expect(() => parseArgs(["--help"], io)).toThrow("help:0:");
    expect(() => parseArgs(["-h"], io)).toThrow("help:0:");
  });
});
