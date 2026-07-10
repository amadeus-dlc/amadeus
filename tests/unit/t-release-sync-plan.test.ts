// covers: subcommand:release-version-sync:plan
//
// FR-702-1 (symmetric badge regex, 4 transitions) + FR-702-2 (all-or-nothing:
// one pattern miss -> plan fails, NO partial plan) for the pure validate/plan
// seam of scripts/release-version-sync.ts.
//
// In-process: imports planVersionSync from the sibling seam module and calls it
// with synthesised file contents — NO filesystem, NO subprocess. The seam does
// not exist until the fix lands, so these tests can only run post-fix; the
// RED-first proof for the underlying bug is the CLI-level t-release-sync-atomicity
// integration test (see its header).

import { describe, expect, test } from "bun:test";
import {
  planVersionSync,
  VERSION_SURFACES,
} from "../../scripts/release-version-sync-plan.ts";

const VERSION_REL = "packages/framework/core/tools/amadeus-version.ts";
const README_REL = "README.md";

const versionTs = (v: string): string => `export const AMADEUS_VERSION = "${v}";\n`;
const readme = (badge: string): string =>
  `# X\n\n![version](https://img.shields.io/badge/version-${badge}-blue)\n`;

/** Build the contents map both surfaces need for a given from-state. */
function contents(fromVersion: string, fromBadge: string): Record<string, string> {
  return {
    [VERSION_REL]: versionTs(fromVersion),
    [README_REL]: readme(fromBadge),
  };
}

/** shields.io escapes a literal dash as `--` inside a path segment (#740). */
const escapeBadge = (v: string): string => v.replaceAll("-", "--");

describe("release-version-sync plan seam — FR-702-1 badge transitions", () => {
  // The four badge transitions FR-702-1 requires the symmetric regex to cover.
  // Prerelease from-badges use the shields-escaped form the replacement writes
  // (`0.2.0--beta.1`); the legacy unescaped form is covered separately below.
  const cases: Array<{ name: string; fromBadge: string; to: string }> = [
    { name: "stable -> stable", fromBadge: "0.1.1", to: "0.2.0" },
    { name: "stable -> prerelease", fromBadge: "0.1.1", to: "0.2.0-beta.1" },
    { name: "prerelease -> prerelease", fromBadge: "0.2.0--beta.1", to: "0.2.0-beta.2" },
    { name: "prerelease -> stable", fromBadge: "0.2.0--beta.1", to: "0.2.0" },
  ];

  for (const c of cases) {
    test(`${c.name}: plan patches both surfaces to the target`, () => {
      // version.ts holds the raw semver of the from-state (unescape the badge).
      const result = planVersionSync(c.to, contents(c.fromBadge.replaceAll("--", "-"), c.fromBadge));
      expect(result.ok).toBe(true);
      if (!result.ok) return; // narrow for TS; the assert above already failed
      const byPath = Object.fromEntries(result.entries.map((e) => [e.relPath, e]));
      expect(byPath[README_REL].next).toContain(`badge/version-${escapeBadge(c.to)}-blue`);
      expect(byPath[VERSION_REL].next).toContain(`AMADEUS_VERSION = "${c.to}"`);
    });
  }

  test("idempotent: planning the current version yields changed=false for both", () => {
    const result = planVersionSync("0.1.1", contents("0.1.1", "0.1.1"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const e of result.entries) expect(e.changed).toBe(false);
  });
});

describe("release-version-sync plan seam — #740 shields badge dash escaping", () => {
  test("prerelease version writes a shields-escaped badge (`-` -> `--`)", () => {
    const result = planVersionSync("0.2.0-rc.1", contents("0.1.1", "0.1.1"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byPath = Object.fromEntries(result.entries.map((e) => [e.relPath, e]));
    expect(byPath[README_REL].next).toContain("badge/version-0.2.0--rc.1-blue");
    // The raw (404-prone) form must NOT survive in the badge URL.
    expect(byPath[README_REL].next).not.toContain("badge/version-0.2.0-rc.1-blue");
    // version.ts keeps the raw semver — escaping is badge-only.
    expect(byPath[VERSION_REL].next).toContain(`AMADEUS_VERSION = "0.2.0-rc.1"`);
  });

  test("re-running over an escaped prerelease badge is idempotent (no double escape)", () => {
    const first = planVersionSync("0.2.0-rc.1", contents("0.1.1", "0.1.1"));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const afterFirst = Object.fromEntries(first.entries.map((e) => [e.relPath, e.next]));
    const second = planVersionSync("0.2.0-rc.1", afterFirst);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    for (const e of second.entries) expect(e.changed).toBe(false);
    const readme = second.entries.find((e) => e.relPath === README_REL);
    expect(readme?.next).toContain("badge/version-0.2.0--rc.1-blue");
    expect(readme?.next).not.toContain("0.2.0----rc.1");
  });

  test("a legacy unescaped prerelease badge is still accepted and gets escaped", () => {
    const result = planVersionSync("0.2.0-rc.1", contents("0.2.0-rc.1", "0.2.0-rc.1"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const readme = result.entries.find((e) => e.relPath === README_REL);
    expect(readme?.changed).toBe(true);
    expect(readme?.next).toContain("badge/version-0.2.0--rc.1-blue");
  });

  test("stable versions are untouched by escaping (non-regression)", () => {
    const result = planVersionSync("0.2.0", contents("0.1.1", "0.1.1"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const readme = result.entries.find((e) => e.relPath === README_REL);
    expect(readme?.next).toContain("badge/version-0.2.0-blue");
  });
});

describe("release-version-sync plan seam — FR-702-2 all-or-nothing", () => {
  test("a README badge miss fails the whole plan (no partial plan)", () => {
    const bad = {
      [VERSION_REL]: versionTs("0.1.1"), // matches
      [README_REL]: readme("CORRUPT"), // no X.Y.Z -> misses
    };
    const result = planVersionSync("0.2.0", bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The failure names the surface that missed; there is NO entries array to
    // partially apply.
    expect(result.relPath).toBe(README_REL);
    expect("entries" in result).toBe(false);
  });

  test("a version.ts miss fails the whole plan (no partial plan)", () => {
    const bad = {
      [VERSION_REL]: "export const NOT_THE_CONSTANT = 1;\n", // misses
      [README_REL]: readme("0.1.1"), // matches
    };
    const result = planVersionSync("0.2.0", bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.relPath).toBe(VERSION_REL);
    expect("entries" in result).toBe(false);
  });

  test("a missing (unread) surface fails the plan", () => {
    const result = planVersionSync("0.2.0", { [VERSION_REL]: versionTs("0.1.1") });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.relPath).toBe(README_REL);
  });
});

describe("release-version-sync plan seam — canonical surfaces", () => {
  test("the two version surfaces are declared once and are the ones patched", () => {
    const paths = VERSION_SURFACES.map((s) => s.relPath).sort();
    expect(paths).toEqual([README_REL, VERSION_REL].sort());
  });
});
