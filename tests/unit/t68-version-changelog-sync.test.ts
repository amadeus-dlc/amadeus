// covers: subcommand:amadeus-utility:version
//
// t68 — framework version sync guards (version.ts ⇄ CLI ⇄ README badge).
//
// HISTORY: this suite originally guarded a hand-maintained repo-root
// CHANGELOG.md as well (heading ⇄ version.ts ⇄ badge three-point sync,
// heading uniqueness, link-ref policy — ported from the .sh TAP plan 6).
// CHANGELOG.md was deleted on 2026-07-09: release notes are now generated
// per release into GitHub Releases by the release workflow (release-it +
// softprops/action-gh-release, unified `vX.Y.Z` tag axis), so there is no
// changelog file to sync. The filename keeps the historical t68 id to avoid
// test-inventory churn.
//
// What remains guarded:
//   - version.ts declares exactly ONE AMADEUS_VERSION assignment (a merge
//     conflict that leaves two assignments must fail)
//   - the wired CLI `version` subcommand prints `amadeus <AMADEUS_VERSION>`
//     (mechanism cli: catches a renamed constant, broken import, switch typo)
//   - the README shields.io version badge matches version.ts (a bump that
//     forgets the badge ships a wrong public number — v0.5.0 missed this)
// (.test.ts has no TAP `plan`, so changing case bodies does not drift t55.)

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC, REPO_ROOT } from "../harness/fixtures.ts";

const BUN = process.execPath; // the bun running this test
const VERSION_TS = join(AMADEUS_SRC, "tools", "amadeus-version.ts");
const UTILITY_TS = join(AMADEUS_SRC, "tools", "amadeus-utility.ts");
const README = join(REPO_ROOT, "README.md");

const SEMVER = /[0-9]+\.[0-9]+\.[0-9]+/;

/** All `AMADEUS_VERSION = "N.N.N"` literals in version.ts (defends against a
 *  merge-conflict marker leaving two assignments — the .sh's `head -1` + count). */
function versionAssignments(): string[] {
  const src = readFileSync(VERSION_TS, "utf-8");
  return [...src.matchAll(/AMADEUS_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"/g)].map(
    (m) => m[1],
  );
}

describe("t68 framework version sync (version.ts / CLI / README badge)", () => {
  test("version.ts declares exactly one AMADEUS_VERSION assignment [.sh test 1]", () => {
    const assigns = versionAssignments();
    expect(assigns.length).toBe(1);
    expect(assigns[0]).toMatch(SEMVER);
    expect(assigns[0].length).toBeGreaterThan(0);
  });

  // CLI wiring — `bun amadeus-utility.ts version` prints `amadeus <version>`.
  // This is the ONE process-boundary (cli) assertion: catches a renamed
  // constant, broken import, switch-case typo, or missing version.ts.
  test("wired CLI `version` subcommand prints 'amadeus <AMADEUS_VERSION>' [.sh test 5]", () => {
    const tsVersion = versionAssignments()[0];
    const res = spawnSync(BUN, [UTILITY_TS, "version"], { encoding: "utf-8" });
    expect(res.status).toBe(0);
    expect((res.stdout ?? "").trim()).toBe(`amadeus ${tsVersion}`);
  }, 30000);

  // The repo has ONE version: packages/setup's package.json (which drives
  // the v* release tags) must equal AMADEUS_VERSION. The release-it
  // after:bump hook (scripts/release-version-sync.ts) keeps them aligned;
  // this guard catches a hand bump of either side alone.
  test("packages/setup version equals AMADEUS_VERSION (unified version axis)", () => {
    const tsVersion = versionAssignments()[0];
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, "packages", "setup", "package.json"), "utf-8"),
    ) as { version: string };
    expect(pkg.version).toBe(tsVersion);
  });

  // README shields.io badge matches version.ts. A release that bumps
  // version.ts but forgets the badge ships a wrong public number.
  test("README.md version badge matches amadeus-version.ts [.sh test 6]", () => {
    const tsVersion = versionAssignments()[0];
    const src = readFileSync(README, "utf-8");
    // Extraction between `badge/version-` and `-blue`. The captured version
    // allows an optional prerelease suffix (FR-702-3) so this guard keeps
    // verifying the badge ⇄ version.ts sync even when the release is a
    // prerelease (e.g. `version-0.2.0-beta.1-blue`), symmetric with the
    // acceptance regex in scripts/release-version-sync.ts.
    const m = src.match(/badge\/version-([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)-blue/);
    expect(m).not.toBeNull();
    expect((m as RegExpMatchArray)[1]).toBe(tsVersion);
  });
});
