// Wait-timing seams for the spawn-only live harness drivers.
//
// The drivers themselves (tests/harness/kiro-ide-driver.ts and friends) run as
// spawned CLIs, so importing them in-process only to reach a pure helper would
// load every driver line into the LCOV universe at zero hits. The seams live
// here instead, in a module the measured suites already import directly.

import { scaleTestTime } from "./test-time-factor.ts";

export type WaitTiming = { timeoutMs: number; pollMs: number };

/** Scale a driver's wait budget and polling interval by the same factor. */
export function resolveKiroWaitTiming(timeoutBaseMs: number, pollBaseMs: number): WaitTiming {
  return {
    timeoutMs: scaleTestTime(timeoutBaseMs),
    pollMs: scaleTestTime(pollBaseMs),
  };
}

/** Scale only the polling interval: the caller already holds a final wall-clock budget. */
export function resolveKiroFinalWaitTiming(timeoutMs: number, pollBaseMs: number): WaitTiming {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`timeoutMs must be a positive safe integer (got: ${timeoutMs})`);
  }
  return {
    timeoutMs,
    pollMs: scaleTestTime(pollBaseMs),
  };
}
