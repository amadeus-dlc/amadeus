import { describe, expect, test } from "bun:test";
import {
  hasConsistentTimeoutBudget,
  parseLifecycleEvents,
  verifierWorkspace,
} from "../helpers/book-pack-verify-fixture.ts";

describe("book-pack verifier fixture contracts", () => {
  test.each([
    [180_000, 30_000, 120_000, false],
    [180_000, 30_000, 209_999, false],
    [180_000, 30_000, 210_000, true],
    [180_000, 30_000, 210_001, true],
  ] as const)(
    "budget %i + %i within %i is %s",
    (verifierMs, cleanupMs, outerMs, expected) => {
      expect(hasConsistentTimeoutBudget(verifierMs, cleanupMs, outerMs)).toBe(expected);
    },
  );

  test("lifecycle parser preserves ordered events on one elapsed clock", () => {
    const events = parseLifecycleEvents(
      [
        '{"event":"child-start","elapsedMs":0}',
        '{"event":"child-complete","elapsedMs":20}',
        '{"event":"cleanup-start","elapsedMs":21}',
        '{"event":"cleanup-complete","elapsedMs":30}',
      ].join("\n"),
    );

    expect(events.map((event) => event.event)).toEqual([
      "child-start",
      "child-complete",
      "cleanup-start",
      "cleanup-complete",
    ]);
    expect(events.map((event) => event.elapsedMs)).toEqual([0, 20, 21, 30]);
  });

  test("workspace parser returns the owned path and rejects unrelated output", () => {
    expect(verifierWorkspace("dummy workspace: /tmp/book-pack-dummy.abc123\nOK\n")).toBe(
      "/tmp/book-pack-dummy.abc123",
    );
    expect(verifierWorkspace("ALL CHECKS PASSED\n")).toBeNull();
  });
});
