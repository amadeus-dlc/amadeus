// covers: workflow:setup-bin-shim
//
// FR-002 regression guard for the bunx delivery path. The 0.1.0 release
// shipped a CLI that silently did nothing through a package bin shim:
// the entrypoint guard compared `resolve(process.argv[1])` (which does NOT
// follow symlinks) against the module's real path, and npm/bunx invoke the
// CLI through a node_modules/.bin symlink shim — so main() never ran and the
// process exited 0 with no output. Every existing test spawned dist/cli.js
// directly and missed it. This suite exercises the real installed-package
// shape: `bun pm pack` the package, `bun add` the tarball into a scratch
// prefix, and run the resulting .bin shim.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const PKG_DIR = join(REPO_ROOT, "packages", "setup");

let scratch: string;
let shim: string;

beforeAll(async () => {
  await ensureSetupCliBuilt();
  scratch = mkdtempSync(join(tmpdir(), "amadeus-setup-bin-shim-"));

  // Real bun pm pack -> real bun add of the local tarball. The package has
  // zero runtime dependencies, so this needs no registry access.
  const pack = spawnSync(process.execPath, ["pm", "pack", "--destination", scratch, "--quiet"], {
    cwd: PKG_DIR,
    encoding: "utf8",
  });
  if (pack.status !== 0) throw new Error(`bun pm pack failed: ${pack.stderr}`);
  const tarball = pack.stdout.trim().split("\n").pop() as string;

  const install = spawnSync(
    process.execPath,
    ["add", tarball, "--cwd", scratch, "--ignore-scripts"],
    { cwd: scratch, encoding: "utf8" },
  );
  if (install.status !== 0) throw new Error(`bun add failed: ${install.stderr}`);

  shim = join(scratch, "node_modules", ".bin", "amadeus-setup");
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("amadeus-setup via the Bun .bin shim (bunx delivery path)", () => {
  test("bun add creates the bin shim", () => {
    expect(existsSync(shim)).toBe(true);
  });

  test("bare shim invocation prints help and exits 0 (would have caught 0.1.0)", () => {
    const res = spawnSync(shim, [], { encoding: "utf8", cwd: scratch });
    expect(res.status).toBe(0);
    // The 0.1.0 defect produced exit 0 WITH EMPTY OUTPUT — asserting on the
    // help text is the part that actually detects the silent no-op.
    expect(res.stdout).toContain("amadeus-setup");
    expect(res.stdout).toContain("install");
    expect(res.stdout).toContain("upgrade");
  });

  test("shim `install --yes` without required options fails with a usage error (exit 2)", () => {
    const res = spawnSync(shim, ["install", "--yes"], { encoding: "utf8", cwd: scratch });
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("harness");
  });
});
