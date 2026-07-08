// covers: cli:amadeus-setup(build+bin-wiring)
//
// FR-002 smoke test: the published bin (packages/setup/dist/cli.js) must run
// under both npx (Node) and bunx (bun) with zero runtime dependencies. This is
// the only place in the U1 suite that touches the built artifact — the lazy
// build helper (tests/lib/setup-lazy-build.ts) builds it on first use so no
// separate CI build step is needed (cicd-pipeline.md). Placed under tests/smoke
// (not tests/e2e) so it runs as part of the --ci profile that gates PRs.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";

describe("setup CLI smoke (FR-002: bunx/npx dual runtime)", () => {
  test("dist/cli.js is built with a Node shebang", async () => {
    const cliPath = await ensureSetupCliBuilt();
    const firstLine = readFileSync(cliPath, "utf8").split("\n")[0];
    expect(firstLine).toBe("#!/usr/bin/env node");
  });

  test("runs under node: exit 0, prints usage, no stderr", async () => {
    const cliPath = await ensureSetupCliBuilt();
    const result = spawnSync("node", [cliPath], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("amadeus-setup");
    expect(result.stdout).toContain("Usage: amadeus-setup");
    expect(result.stderr).toBe("");
  });

  test("runs under bun: exit 0, prints usage, no stderr", async () => {
    const cliPath = await ensureSetupCliBuilt();
    // process.execPath is the bun binary itself (tests always run under bun).
    const result = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("amadeus-setup");
    expect(result.stderr).toBe("");
  });

  test("edge case: node and bun runs produce identical stdout", async () => {
    const cliPath = await ensureSetupCliBuilt();
    const nodeResult = spawnSync("node", [cliPath], { encoding: "utf8" });
    const bunResult = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
    expect(nodeResult.stdout).toBe(bunResult.stdout);
  });

  test("edge case: has no runtime dependencies declared (NFR-005)", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../packages/setup/package.json", import.meta.url), "utf8"));
    expect(pkg.dependencies ?? {}).toEqual({});
  });
});
