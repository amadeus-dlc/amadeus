import { afterEach, describe, expect, test } from "bun:test";
import { resolveKiroWaitTiming } from "../harness/kiro-ide-driver.ts";
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
    expect(resolveKiroWaitTiming(60_000, 400)).toEqual({
      timeoutMs: expectedTimeoutMs,
      pollMs: 800,
    });
  });
});
