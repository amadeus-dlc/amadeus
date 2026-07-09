// covers: subcommand:release-version-sync:atomic-write
//
// FR-702-2 (all-or-nothing) CLI failure-path guard for
// scripts/release-version-sync.ts. Spawns the REAL script as a subprocess over
// a throwaway git-repo fixture and asserts the PROCESS boundary: a pattern miss
// exits 1 AND leaves EVERY target file byte-identical (no half-applied state).
//
// Fixture construction (the load-bearing detail):
//   - amadeus-version.ts carries a VALID `AMADEUS_VERSION = "..."` (matches).
//   - README.md carries a badge the acceptance regex CANNOT match (corrupt —
//     no X.Y.Z), so validation MUST fail on the README surface.
// This is the ONE shape that isolates the atomicity bug:
//   * version.ts matches -> the UNFIXED script writes it FIRST (its patchFile
//     order), THEN fails on the README -> exit 1 with version.ts ALREADY
//     rewritten (partial write). => the "no file changed" assertion is RED.
//   * the FIXED script validates BOTH surfaces before any write -> the README
//     miss aborts the plan -> exit 1 with NOTHING written. => GREEN.
// A prerelease (rather than corrupt) badge would NOT work here: the fixed,
// symmetrised regex matches a prerelease badge, so the run would SUCCEED, not
// fail — the wrong control for an all-or-nothing FAILURE test. Prerelease
// TRANSITION success is proven by the in-process seam suite (t-release-sync-plan).

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUN = process.execPath; // the bun running this test
const REPO_ROOT = join(import.meta.dir, "..", "..");
const SCRIPT = join(REPO_ROOT, "scripts", "release-version-sync.ts");

const VERSION_REL = "packages/framework/core/tools/amadeus-version.ts";
const README_REL = "README.md";

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

/**
 * A throwaway git repo with the two version surfaces. `badge` is written
 * verbatim into the README shields.io URL so callers control whether it is a
 * valid / prerelease / corrupt token.
 */
function makeFixture(opts: { versionTs: string; badge: string }): string {
  const dir = realpathSync(mkdtempSync(join(process.env.TMPDIR || tmpdir(), "relsync-")));
  tempDirs.push(dir);
  const git = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf-8" });
    if (r.status !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${r.stderr?.trim() || r.stdout?.trim()}`);
    }
  };
  git(["init", "-q"]);
  git(["symbolic-ref", "HEAD", "refs/heads/main"]);

  mkdirSync(join(dir, "packages", "framework", "core", "tools"), { recursive: true });
  writeFileSync(join(dir, VERSION_REL), opts.versionTs);
  writeFileSync(
    join(dir, README_REL),
    `# Fixture\n\n![version](https://img.shields.io/badge/version-${opts.badge}-blue)\n`,
  );
  return dir;
}

function runScript(cwd: string, version: string): { status: number; out: string } {
  const r = spawnSync(BUN, [SCRIPT, version], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env },
  });
  return { status: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

describe("release-version-sync FR-702-2 — validate before writing (all-or-nothing)", () => {
  test("a README pattern miss exits 1 and leaves EVERY target byte-identical", () => {
    // version.ts is valid (matches) so the unfixed script would write it first;
    // the README badge is corrupt (no X.Y.Z) so validation must fail on it.
    const dir = makeFixture({
      versionTs: 'export const AMADEUS_VERSION = "0.0.0";\n',
      badge: "CORRUPT",
    });
    const versionPath = join(dir, VERSION_REL);
    const readmePath = join(dir, README_REL);
    const versionBefore = readFileSync(versionPath);
    const readmeBefore = readFileSync(readmePath);

    const res = runScript(dir, "0.2.0-beta.1");

    // FR-702-2: fails loud...
    expect(res.status).toBe(1);
    // ...and NOTHING was written (byte-for-byte). The UNFIXED script rewrites
    // version.ts before failing on the README — that partial write is the bug.
    expect(readFileSync(versionPath).equals(versionBefore)).toBe(true);
    expect(readFileSync(readmePath).equals(readmeBefore)).toBe(true);
  }, 30000);
});
