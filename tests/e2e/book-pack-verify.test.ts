// size: large

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  runVerifier,
  verifierWorkspace,
} from "../helpers/book-pack-verify-fixture.ts";

const REPO_ROOT = resolve(import.meta.dir, "..", "..");
const VERIFY_SH = join(REPO_ROOT, "book-pack", "scripts", "verify-dummy.sh");

describe("book-pack verifier user journey", () => {
  test("the shipped command verifies the current framework and removes its workspace", () => {
    const result = runVerifier("bash", [VERIFY_SH, REPO_ROOT], 180_000);
    const workspace = verifierWorkspace(result.stdout);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("ALL CHECKS PASSED");
    expect(workspace).not.toBeNull();
    expect(existsSync(workspace ?? "")).toBe(false);
  }, scaleTestTime(210_000));

  test("a real pack failure stays non-zero and is not hidden by cleanup", () => {
    const result = runVerifier("bash", [VERIFY_SH, join(REPO_ROOT, "missing-framework")], 5_000);
    const workspace = verifierWorkspace(result.stdout);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/(cannot stat|No such file|not found)/i);
    expect(workspace).not.toBeNull();
    expect(existsSync(workspace ?? "")).toBe(false);
  });
});
