// covers: test-infra:setup-lazy-build
//
// Unit tests for the lazy build helper itself (tests/lib/setup-lazy-build.ts).
// This helper is a first-class deliverable of U1 (cicd-pipeline.md — U4's pack
// contract tests reuse it), so its own build/idempotency contract is pinned
// here rather than only exercised incidentally by the smoke test.

import { describe, expect, test } from "bun:test";
import { existsSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const CLI_OUTPUT = join(REPO_ROOT, "packages", "setup", "dist", "cli.js");

describe("ensureSetupCliBuilt", () => {
  test("builds dist/cli.js when it does not exist yet", async () => {
    rmSync(CLI_OUTPUT, { force: true });
    expect(existsSync(CLI_OUTPUT)).toBe(false);

    const path = await ensureSetupCliBuilt();

    expect(path).toBe(CLI_OUTPUT);
    expect(existsSync(CLI_OUTPUT)).toBe(true);
  });

  test("is idempotent: a second call does not rebuild an existing artifact", async () => {
    await ensureSetupCliBuilt();
    const mtimeBefore = statSync(CLI_OUTPUT).mtimeMs;

    const path = await ensureSetupCliBuilt();

    expect(path).toBe(CLI_OUTPUT);
    expect(statSync(CLI_OUTPUT).mtimeMs).toBe(mtimeBefore);
  });

  test("edge case: returns an absolute path", async () => {
    const path = await ensureSetupCliBuilt();
    expect(path.startsWith("/")).toBe(true);
  });
});
