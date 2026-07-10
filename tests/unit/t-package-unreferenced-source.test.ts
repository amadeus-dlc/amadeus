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
// exports its functions here.
//
// The second describe block drives checkHarness IN-PROCESS against the real
// harness trees. This is deliberate for coverage: `bun --coverage` does not
// instrument spawned subprocesses, so the CLI-spawn integration sibling
// (t-package-check-source-unreferenced) cannot cover buildTree's record logic,
// the require.cache harvest, checkHarness's source scan, or emit.ts's
// readHarnessSource consumption. An in-process call exercises all of them.

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkHarness, runCli, unreferencedSources } from "../../scripts/package.ts";

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

// A real build spawns in-tree generators (graph compile + runner-gen), so an
// in-process checkHarness is ~2-4s per harness; give a generous budget.
const CHECK_TIMEOUT_MS = 60_000;

const HARNESS_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "packages",
  "framework",
  "harness",
);
// A probe name that collides with nothing real and is easy to spot + purge.
const CODEX_PROBE = join(HARNESS_ROOT, "codex", ".coverage-probe-735.md");

function purgeProbe(): void {
  rmSync(CODEX_PROBE, { force: true });
}

describe("checkHarness in-process — #735 source scan against the real trees", () => {
  afterEach(purgeProbe);

  test("codex (emit harness) clean → no UNREFERENCED problems", () => {
    // Exercises buildTree's read-set recording, emit's readHarnessSource
    // consumption (codex composes its orchestrator SKILL.md through it), the
    // require.cache harvest of the codex module graph, and the clean source scan.
    const problems = checkHarness("codex");
    const unref = problems.filter((p) => p.startsWith("UNREFERENCED in source:"));
    if (unref.length > 0) console.error("unexpected UNREFERENCED:\n" + unref.join("\n"));
    expect(unref).toEqual([]);
  }, CHECK_TIMEOUT_MS);

  test("kiro (non-emit harness) clean → no UNREFERENCED problems", () => {
    // Covers the harnessSrcRoot+sep require.cache boundary for a second harness
    // dir (the trailing separator is what keeps "kiro" from matching "kiro-ide").
    const problems = checkHarness("kiro");
    const unref = problems.filter((p) => p.startsWith("UNREFERENCED in source:"));
    if (unref.length > 0) console.error("unexpected UNREFERENCED:\n" + unref.join("\n"));
    expect(unref).toEqual([]);
  }, CHECK_TIMEOUT_MS);

  test("planted stale source under harness/codex/ → checkHarness reports it (red path)", () => {
    purgeProbe();
    writeFileSync(CODEX_PROBE, "coverage probe — never referenced\n");
    try {
      const problems = checkHarness("codex");
      expect(problems).toContain("UNREFERENCED in source: codex/.coverage-probe-735.md");
    } finally {
      purgeProbe();
    }
    expect(existsSync(CODEX_PROBE)).toBe(false);
  }, CHECK_TIMEOUT_MS);
});

// A harness name that no manifest.ts backs — lets the CLI dispatch reach its
// skip/empty-target branches WITHOUT running a real build (present stays empty).
const NO_SUCH_HARNESS = "__amadeus_no_such_harness__";

describe("runCli in-process — CLI dispatch branches (bun --coverage skips spawned subprocesses)", () => {
  afterEach(purgeProbe);

  test("`codex trust` without --project → usage error, exit code 1", () => {
    expect(runCli(["codex", "trust"])).toBe(1);
  });

  test("`codex trust --project <dir>` → prints entries, exit code 0", () => {
    expect(runCli(["codex", "trust", "--project", "/tmp/amadeus-cli-probe"])).toBe(0);
  });

  test("--check over an unbacked harness name → skip + empty check, exit code 0", () => {
    // Covers the absent-skip branch and the check success path with zero
    // problems, without spawning a real build (no manifest ⇒ present is empty).
    expect(runCli([NO_SUCH_HARNESS, "--check"])).toBe(0);
  });

  test("write mode over an unbacked harness name → empty write loop, exit code 0", () => {
    // Covers the non-check (write) branch line with an empty target set, so no
    // harness is actually regenerated (present is empty) — the dist tree is never
    // touched.
    expect(runCli([NO_SUCH_HARNESS])).toBe(0);
  });

  test("--check with a planted stale source → FAILED branch, exit code 1", () => {
    purgeProbe();
    writeFileSync(CODEX_PROBE, "coverage probe — never referenced\n");
    try {
      expect(runCli(["codex", "--check"])).toBe(1);
    } finally {
      purgeProbe();
    }
    expect(existsSync(CODEX_PROBE)).toBe(false);
  }, CHECK_TIMEOUT_MS);
});
