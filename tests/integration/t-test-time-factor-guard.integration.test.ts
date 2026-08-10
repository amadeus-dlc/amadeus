import { expect, test } from "bun:test";
import { join } from "node:path";
import { runTestTimeFactorGuard } from "../test-time-factor-guard.ts";

test("the committed timing sink census and allowlist agree", () => {
  expect(runTestTimeFactorGuard(join(import.meta.dir, "..", ".."))).toBe(0);
});
