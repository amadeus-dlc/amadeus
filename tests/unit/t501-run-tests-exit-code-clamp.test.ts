// covers: #2577 -- process.exit(N) truncates to N % 256, so an unclamped
// `failedFiles` wraps to exit code 0 (a false green) whenever the failure
// count lands on an exact multiple of 256. exitCodeFor() is the in-process
// seam that stands in for the runner's `process.exit(rc)` call so the 256+
// boundary can be pinned deterministically, without spawning 256 real
// failing test files.
import { describe, expect, test } from "bun:test";
import { exitCodeFor } from "../lib/run-tests-exit-code.ts";

describe("t501 run-tests.ts exit code clamp (#2577)", () => {
  test("zero failures stays exit 0 (green)", () => {
    expect(exitCodeFor(0)).toBe(0);
  });

  test("small failure counts pass through unchanged", () => {
    expect(exitCodeFor(1)).toBe(1);
    expect(exitCodeFor(3)).toBe(3);
    expect(exitCodeFor(255)).toBe(255);
  });

  // The core regression: unclamped, process.exit(256) wraps to 0 (POSIX
  // 8-bit exit codes: N % 256). 256 failed files must never report success.
  test("256 failures does not wrap to 0", () => {
    expect(exitCodeFor(256)).not.toBe(0);
    expect(exitCodeFor(256)).toBe(255);
  });

  // Same wraparound at the next multiple of 256.
  test("512 failures does not wrap to 0", () => {
    expect(exitCodeFor(512)).not.toBe(0);
    expect(exitCodeFor(512)).toBe(255);
  });

  test("failures beyond 255 clamp into the 1..255 band, never 0", () => {
    for (const n of [256, 257, 300, 512, 513, 1000]) {
      const code = exitCodeFor(n);
      expect(code).toBeGreaterThanOrEqual(1);
      expect(code).toBeLessThanOrEqual(255);
    }
  });
});
