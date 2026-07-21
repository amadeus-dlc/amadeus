// covers: function:ensureStageDiaryForDirective, function:memoryPathNamesIntentRecord
// size: medium
//
// Directive-time stage-diary creation, anchored on the memory_path (#1279). The
// old chokepoint guard `recordPrefix !== null && codekbCtx` could disagree with
// the memory_path (which masks a null recordPrefix with the bare space prefix)
// and SILENTLY skip diary creation — the reproduced regression. The fix anchors
// the decision on ONE value (memory_path):
//   - a real per-intent record path  -> ensureStageDiary (create / exists)
//   - the bare-space fallback WHILE record dirs exist -> loud stderr advisory,
//     no diary file, stdout untouched (the #1279 bug, now non-silent)
//   - the bare-space fallback with NO record dirs -> silent (pre-birth shell)
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureStageDiaryForDirective,
  memoryPathNamesIntentRecord,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const REPO_TEMPLATE = join(
  import.meta.dir, "..", "..", "dist", "claude", ".claude",
  "knowledge", "amadeus-shared", "memory-template.md",
);
// A memory_path whose recordPrefix RESOLVED — the segment after `intents/` is a
// record-dir name (date-prefixed), not a phase.
const REL_DIARY_RESOLVED =
  "amadeus/spaces/default/intents/260720-demo/inception/requirements-analysis/memory.md";
// The bare-space FALLBACK memoryPathFor emits when recordPrefix is null — the
// segment after `intents/` is a phase name.
const REL_DIARY_FALLBACK =
  "amadeus/spaces/default/intents/inception/requirements-analysis/memory.md";

let projectDir: string;
let savedHarness: string | undefined;

function seedTemplate(): void {
  const dir = join(projectDir, ".claude", "knowledge", "amadeus-shared");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "memory-template.md"), readFileSync(REPO_TEMPLATE));
}

// Create N real intent record dirs (each holding amadeus-state.md, the marker
// listIntentDirs requires) so the resolution-bug branch has records on disk.
function seedRecordDirs(names: string[]): void {
  for (const name of names) {
    const rec = join(projectDir, "amadeus", "spaces", "default", "intents", name);
    mkdirSync(rec, { recursive: true });
    writeFileSync(join(rec, "amadeus-state.md"), "# state\n");
  }
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "diary-guard-"));
  savedHarness = process.env.AMADEUS_HARNESS_DIR;
  process.env.AMADEUS_HARNESS_DIR = ".claude";
});

afterEach(() => {
  if (savedHarness === undefined) delete process.env.AMADEUS_HARNESS_DIR;
  else process.env.AMADEUS_HARNESS_DIR = savedHarness;
  rmSync(projectDir, { recursive: true, force: true });
});

describe("memoryPathNamesIntentRecord (the single anchor value)", () => {
  test("a resolved record path (record-dir after intents/) names an intent record", () => {
    expect(memoryPathNamesIntentRecord(REL_DIARY_RESOLVED)).toBe(true);
  });

  test("the bare-space fallback (phase after intents/) does NOT name a record", () => {
    expect(memoryPathNamesIntentRecord(REL_DIARY_FALLBACK)).toBe(false);
    // every phase word is the fallback shape
    for (const phase of ["initialization", "ideation", "construction", "operation"]) {
      expect(
        memoryPathNamesIntentRecord(`amadeus/spaces/default/intents/${phase}/x/memory.md`),
      ).toBe(false);
    }
  });
});

describe("ensureStageDiaryForDirective", () => {
  test("resolved memory_path creates the diary from the shipped template", () => {
    seedTemplate();
    const result = ensureStageDiaryForDirective(projectDir, REL_DIARY_RESOLVED, "default");
    expect(result).toBe("created");
    const created = readFileSync(join(projectDir, REL_DIARY_RESOLVED));
    expect(created.equals(readFileSync(REPO_TEMPLATE))).toBe(true);
  });

  test("resolved memory_path is idempotent: created once, then exists", () => {
    seedTemplate();
    expect(ensureStageDiaryForDirective(projectDir, REL_DIARY_RESOLVED, "default")).toBe("created");
    expect(ensureStageDiaryForDirective(projectDir, REL_DIARY_RESOLVED, "default")).toBe("exists");
  });

  // The #1279 regression, now made LOUD instead of silent. BEFORE the fix, a
  // null recordPrefix (multi-record workspace with no active-intent cursor)
  // silently skipped diary creation; here the fallback path + records-on-disk
  // must emit a stderr advisory and write no file.
  test("edge: fallback memory_path WITH record dirs -> loud advisory, no file", () => {
    seedTemplate();
    seedRecordDirs(["260719-alpha", "260720-beta"]);
    const errs: string[] = [];
    const original = console.error;
    console.error = ((msg?: unknown) => { errs.push(String(msg)); }) as typeof console.error;
    try {
      const result = ensureStageDiaryForDirective(projectDir, REL_DIARY_FALLBACK, "default");
      expect(result).toBe("skipped-unresolved");
    } finally {
      console.error = original;
    }
    expect(existsSync(join(projectDir, REL_DIARY_FALLBACK))).toBe(false);
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("record prefix unresolved");
    expect(errs[0]).toContain("2 intent record(s)");
    expect(errs[0]).toContain("#1279");
  });

  // A genuine pre-birth shell (no record dirs) is silent by design — there is
  // no intent to write into and nothing has gone wrong.
  test("edge: fallback memory_path with NO record dirs -> silent pre-birth skip", () => {
    seedTemplate();
    const errs: string[] = [];
    const original = console.error;
    console.error = ((msg?: unknown) => { errs.push(String(msg)); }) as typeof console.error;
    try {
      const result = ensureStageDiaryForDirective(projectDir, REL_DIARY_FALLBACK, "default");
      expect(result).toBe("skipped-prebirth");
    } finally {
      console.error = original;
    }
    expect(errs.length).toBe(0);
    expect(existsSync(join(projectDir, REL_DIARY_FALLBACK))).toBe(false);
  });
});
