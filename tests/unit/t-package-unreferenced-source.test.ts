// t-package-unreferenced-source: unit coverage for the #735 source-unreferenced
// diff (scripts/package.ts unreferencedSources).
//
// covers: file:scripts/package.ts (unreferencedSources — #735 source scan)
//
// This is the pure set-difference checkHarness runs after every build: given
// every authored source file under a harness dir and the set the build actually
// read (declared harnessFiles + emit's readHarnessSource inputs + the
// require/import module graph), return the ones never read. Driving it directly
// (no build spawn) pins its contract; the process-boundary sibling test proves
// the read-set is assembled correctly against the real trees.
//
// Importing scripts/package.ts is side-effect-free because its CLI dispatch is
// guarded by `import.meta.main` (false under the test runner) — the module only
// exports unreferencedSources here.

import { describe, expect, test } from "bun:test";
import { unreferencedSources } from "../../scripts/package.ts";

describe("unreferencedSources — #735 source-side diff", () => {
  test("reports the sources the build never read, sorted", () => {
    const all = ["/h/z.md", "/h/a.md", "/h/manifest.ts"];
    const read = new Set(["/h/manifest.ts"]);
    expect(unreferencedSources(all, read)).toEqual(["/h/a.md", "/h/z.md"]);
  });

  test("empty when every source was read", () => {
    const all = ["/h/a.md", "/h/b.md"];
    const read = new Set(all);
    expect(unreferencedSources(all, read)).toEqual([]);
  });

  test("build-mechanism paths in the read-set count as referenced (no hardcoded list)", () => {
    // manifest.ts / emit.ts / onboarding.fills.ts enter the read-set via the
    // require.cache snapshot, not a static exemption — modeled here as plain
    // membership: once present, the diff must not report them.
    const all = ["/h/manifest.ts", "/h/emit.ts", "/h/onboarding.fills.ts", "/h/stale.md"];
    const read = new Set(["/h/manifest.ts", "/h/emit.ts", "/h/onboarding.fills.ts"]);
    expect(unreferencedSources(all, read)).toEqual(["/h/stale.md"]);
  });
});
