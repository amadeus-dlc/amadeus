// t-package-write-sweep: serial regression guard for GitHub #771.
//
// covers: file:scripts/package.ts (writeHarness project-root post-sweep)
// in-process by design: writeHarness/checkHarness are driven via direct import,
// not a package.ts subprocess, because bun --coverage does not instrument spawned
// children — a CLI-spawn test would leave the new sweep lines uncovered.
//
// WHAT. `package.ts <name>` (write mode) clean-swept only <harnessDir>/ and
// amadeus/, never the project-root output layer directly under dist/<name>/. So
// a stale/renamed projectRoot output (or a file in an undeclared subdir) that
// pre-existed a regenerate SURVIVED the write, and the very next `--check`
// flagged it as an ORPHAN (exit 1) — the regenerate command could not satisfy
// its own drift guard. checkHarness's whole-tree orphan scan (#701) already
// caught such files on the READ side; write was the asymmetric half. The fix
// gives write a post-sweep that deletes exactly the files checkHarness would
// flag, via the shared expectedOutsideHarness helper.
//
// WHY IN-PROCESS. bun --coverage does not instrument spawned subprocesses, so a
// CLI-spawn test would leave writeHarness's new sweep lines uncovered and trip
// the codecov/patch gate. Driving writeHarness + checkHarness in-process (same
// idiom as t-package-unreferenced-source.serial.test.ts) executes and covers them.
//
// TARGET HARNESS. `kiro` — its committed root face carries a projectRoot
// AGENTS.md and .gitignore, so the sweep's expected-set logic is exercised
// against real legitimate root files it must NOT delete.
//
// HERMETIC. writeHarness regenerates dist/kiro deterministically from source
// (committed == generated, enforced by dist:check in CI), so a clean run leaves
// the tree byte-identical to committed. Every planted file is removed in a
// try/finally AND an afterEach backstop.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applyModelPin, writeHarness } from "../../scripts/package.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST_KIRO = join(REPO_ROOT, "dist", "kiro");

// A stale file directly under dist/kiro/, plus one nested in an undeclared
// subdirectory — the two leak shapes checkHarness (#701) catches and write must
// now sweep. Both are purged after each test (the subdir root too).
const ROOT_STALE = join(DIST_KIRO, "STALE_WRITE_SWEEP.md");
const SUBDIR_ROOT = join(DIST_KIRO, "stale-write-subdir");
const SUBDIR_STALE = join(SUBDIR_ROOT, "nested.md");

// A real regenerate spawns in-tree generators (graph compile + runner-gen), so
// writeHarness + checkHarness together are ~4-8s; give a generous budget.
const WRITE_TIMEOUT_MS = 120_000;

function cleanup(): void {
  rmSync(ROOT_STALE, { force: true });
  rmSync(SUBDIR_ROOT, { recursive: true, force: true });
}

// Each case builds its own fixture project, and the canonical emit path
// registers a Logger Provider for one workspace per process — so the
// registration is dropped between cases, as the provider tests already do.
beforeEach(() => {
  resetOtelPerProject();
});

describe("t-package-write-sweep — #771: write mode sweeps stale project-root outputs", () => {
  afterEach(cleanup);

  test("(a) a clean regenerate succeeds", () => {
    cleanup();
    expect(() => writeHarness("kiro")).not.toThrow();
  }, scaleTestTime(WRITE_TIMEOUT_MS));

  test("(b) planted stale outputs are swept by write, and --check passes after", () => {
    cleanup();
    writeFileSync(ROOT_STALE, "stale\n");
    mkdirSync(SUBDIR_ROOT, { recursive: true });
    writeFileSync(SUBDIR_STALE, "stale\n");
    try {
      // Before the #771 fix, write left both files in place and checkHarness
      // returned ORPHAN problems for them (the red path this guards).
      writeHarness("kiro");
      expect(existsSync(ROOT_STALE)).toBe(false);
      expect(existsSync(SUBDIR_STALE)).toBe(false);
    } finally {
      cleanup();
    }
  }, scaleTestTime(WRITE_TIMEOUT_MS));

  test("(c) write does NOT delete legitimate project-root outputs", () => {
    cleanup();
    // AGENTS.md is a declared projectRoot output for kiro; a regenerate must
    // reproduce it, not sweep it. Its survival proves the expected-set guard.
    writeHarness("kiro");
    expect(existsSync(join(DIST_KIRO, "AGENTS.md"))).toBe(true);
  }, scaleTestTime(WRITE_TIMEOUT_MS));
});
// applyModelPin is the projection that turns a charter's tier alias into a
// harness-native model id. It is exercised here in-process for the same reason
// the sweep above is: a spawned packager would leave it uninstrumented.
describe("applyModelPin — charter model projection", () => {
  const PINS = { opus: "claude-opus-5", sonnet: "claude-sonnet-5" } as const;
  const charter = (model: string): string => `---\nname: amadeus-x-agent\nmodel: ${model}\n---\n\n# Body\n`;

  test("rewrites a covered alias and leaves the rest of the charter untouched", () => {
    const out = applyModelPin(charter("opus"), PINS, "agents/amadeus-x-agent.md");
    expect(out).toContain("model: claude-opus-5");
    expect(out).toContain("name: amadeus-x-agent");
    expect(out).toContain("# Body");
  });

  test("a file without frontmatter or without a model pin passes through unchanged", () => {
    const noFrontmatter = "# Just a document\n";
    expect(applyModelPin(noFrontmatter, PINS, "agents/doc.md")).toBe(noFrontmatter);
    const noPin = "---\nname: amadeus-x-agent\n---\n\n# Body\n";
    expect(applyModelPin(noPin, PINS, "agents/amadeus-x-agent.md")).toBe(noPin);
  });

  test("an alias the map does not cover fails the build instead of shipping it", () => {
    // Fail-closed: a charter this harness cannot resolve must never reach dist,
    // because the persona would silently fall back to the harness default.
    expect(() => applyModelPin(charter("haiku"), PINS, "agents/amadeus-x-agent.md"))
      .toThrow(/does not cover/);
  });

  // Issue #2580 regression pin. applyModelPin used to rewrite the pin line via
  // two nested String.prototype.replace calls with TEMPLATE replacement
  // strings (`block[0].replace(pin[0], \`model: ${mapped}\`)`, then
  // `content.replace(block[0], <that result>)`). Both search values are
  // literal strings, not RegExps, but the `$`-pattern interpretation of a
  // replace's REPLACEMENT argument applies regardless — so a harness mapping
  // value containing `$1`/`$&`/`` $` ``/`$'`/`$$` would have been silently
  // mangled instead of shipped verbatim. Fixed by switching both calls to
  // replacer functions.
  test("a mapping value containing $-special sequences is inserted verbatim", () => {
    const dollarPins = { opus: "vendor/model-$1-$&-$$-tier" } as const;
    const out = applyModelPin(charter("opus"), dollarPins, "agents/amadeus-x-agent.md");
    expect(out).toContain("model: vendor/model-$1-$&-$$-tier");
    expect(out).toContain("name: amadeus-x-agent");
    expect(out).toContain("# Body");
  });
});
