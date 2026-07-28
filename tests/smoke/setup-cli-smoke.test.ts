// covers: cli:amadeus-setup(build+bin-wiring)
//
// FR-002 smoke test: the published bin (packages/setup/dist/cli.js) must run
// under bunx (Bun) with zero runtime dependencies. This is
// the only place in the U1 suite that touches the built artifact — the lazy
// build helper (tests/lib/setup-lazy-build.ts) builds it on first use so no
// separate CI build step is needed (cicd-pipeline.md). Placed under tests/smoke
// (not tests/e2e) so it runs as part of the --ci profile that gates PRs.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";

describe("setup CLI smoke (FR-002: Bun runtime)", () => {
  test("dist/cli.js is built with a Bun shebang", async () => {
    const cliPath = await ensureSetupCliBuilt();
    const firstLine = readFileSync(cliPath, "utf8").split("\n")[0];
    expect(firstLine).toBe("#!/usr/bin/env bun");
  });

  test("runs under Bun: exit 0, prints usage, no stderr", async () => {
    const cliPath = await ensureSetupCliBuilt();
    const result = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("amadeus-setup");
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("amadeus-setup install");
    expect(result.stderr).toBe("");
  });

  test("edge case: has no runtime dependencies declared (NFR-005)", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../packages/setup/package.json", import.meta.url), "utf8"));
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  test("package contract requires Bun 1.3.13 and builds for Bun", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../packages/setup/package.json", import.meta.url), "utf8"));
    expect(pkg.engines).toEqual({ bun: ">=1.3.13" });
    expect(pkg.scripts.build).toContain("--target=bun");
  });
});
