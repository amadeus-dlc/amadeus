import { afterEach, describe, expect, test } from "bun:test";
import { createClaudeSdkJourney } from "../harness/live-e2e/journey.ts";
import {
  resolveKiroFinalWaitTiming,
  resolveKiroWaitTiming,
} from "../lib/harness-wait-timing.ts";
import { resolveTuiWaitTiming } from "../harness/tui-drive.ts";

const originalFactor = process.env.TEST_TIME_FACTOR;

afterEach(() => {
  if (originalFactor === undefined) delete process.env.TEST_TIME_FACTOR;
  else process.env.TEST_TIME_FACTOR = originalFactor;
});

describe("load-sensitive harness timing", () => {
  test("TUI timeout, polling, and settle baselines scale together", () => {
    process.env.TEST_TIME_FACTOR = "2";
    const expectedTimeoutMs = 60_000;
    expect(resolveTuiWaitTiming(30_000, 150, 600)).toEqual({
      timeoutMs: expectedTimeoutMs,
      pollMs: 300,
      stableMs: 1_200,
    });
    expect(resolveTuiWaitTiming(30_000, 150, 0).stableMs).toBe(0);
  });

  test("Kiro IDE timeout and polling baselines scale together", () => {
    process.env.TEST_TIME_FACTOR = "2";
    const expectedTimeoutMs = 120_000;
    const expectedFinalTimeoutMs = 60_000;
    expect(resolveKiroWaitTiming(60_000, 400)).toEqual({
      timeoutMs: expectedTimeoutMs,
      pollMs: 800,
    });
    expect(resolveKiroFinalWaitTiming(60_000, 400)).toEqual({
      timeoutMs: expectedFinalTimeoutMs,
      pollMs: 800,
    });
  });

  test("a final Kiro budget that is not a positive safe integer is refused", () => {
    for (const timeoutMs of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => resolveKiroFinalWaitTiming(timeoutMs, 400)).toThrow("timeoutMs");
    }
  });

  test("Claude SDK explicit and default journey timeout baselines scale once", () => {
    process.env.TEST_TIME_FACTOR = "2";
    expect(createClaudeSdkJourney().timeoutMs).toBe(180_000);
    expect(createClaudeSdkJourney(10_000).timeoutMs).toBe(20_000);
  });
});
