// covers: function:fieldExists
//
// t224 — `amadeus-state set` fail-closed contract (Issue #1027, S2-CRITICAL).
//
// The bug: setField silently no-ops when the target `- **Field**:` row is
// absent, so `set NonexistentField=x` wrote an UNCHANGED file and still printed
// `{"updated":true,"fields":1}` — a success report not derived from any write
// (org.md 検証劇場 Forbidden). handleSet now pre-validates every field's row
// existence and rejects atomically (no partial write) with the full list of the
// missing fields, using setFieldStrict's established wording.
//
// MECHANISM. This file drives TWO surfaces, each at its correct level:
//   - The CLI contract (FR-1/FR-2/FR-3) is the argv/process boundary of
//     amadeus-state.ts — exit code + stdout JSON + stderr text + the on-disk
//     state file's before/after sha256. Those cases SPAWN the shipped dist tool
//     (never an in-process handleSet() call — handleSet is spawn-only for
//     coverage per the spawn-blindspot norm; its lines stay lcov-invisible by
//     design). Mechanism `cli`.
//   - The field-existence predicate (FR-1's seam) lives in amadeus-lib.ts as the
//     exported `fieldExists`, driven IN-PROCESS here (measured-module seam) so
//     its new lines are lcov-visible. It shares setFieldStrict's exact regex, so
//     the two cannot drift on what "the field exists" means.
//
// FIXTURE DISCIPLINE mirrors t17: each case builds a fresh temp project via
// createTestProject() + seedStateFile(), so mutations never bleed between cases;
// cleanup runs in afterEach. Nothing is written under tests/fixtures/**.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fieldExists, setFieldStrict } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const TOOL = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "amadeus-state.ts",
);
const INIT_DONE = join(FIXTURES_DIR, "state-initialization-done.md");

interface RunResult {
  rc: number;
  stdout: string;
  stderr: string;
  combined: string;
}

function runState(proj: string, args: string[]): RunResult {
  const res = spawnSync(BUN, [TOOL, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env: { ...process.env },
  });
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  return { rc: res.status ?? -1, stdout, stderr, combined: `${stdout}${stderr}` };
}

function recordDirOf(proj: string): string {
  const spaceCursor = join(proj, "amadeus", "active-space");
  const space = existsSync(spaceCursor)
    ? readFileSync(spaceCursor, "utf-8").trim() || "default"
    : "default";
  const intentsDir = join(proj, "amadeus", "spaces", space, "intents");
  const intentCursor = join(intentsDir, "active-intent");
  const intent = readFileSync(intentCursor, "utf-8").trim();
  return join(intentsDir, intent);
}

const stateMd = (proj: string) => join(recordDirOf(proj), "amadeus-state.md");
const stateSha = (proj: string) =>
  createHash("sha256").update(readFileSync(stateMd(proj))).digest("hex");
const getField = (proj: string, field: string) =>
  runState(proj, ["get", field]).combined.trim();

let proj = "";

afterEach(() => {
  resetAidlcEnv();
  cleanupTestProject(proj);
  proj = "";
});

// ===========================================================================
// FR-1 / FR-2 / FR-3 — CLI contract (spawn the shipped tool)
// ===========================================================================

describe("t224 state set fail-closed CLI", () => {
  // AC-4a: one absent field → non-zero exit, state byte-identical, name in stderr.
  test("absent field rejects: exit != 0, state unchanged, name in stderr", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const before = stateSha(proj);
    const r = runState(proj, ["set", "Nonexistent Field=x"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("Field not found in state file:");
    expect(r.combined).toContain("Nonexistent Field");
    expect(stateSha(proj)).toBe(before);
  });

  // AC-4b: one absent among several → nothing written (atomic) + full list.
  test("one absent among many: atomic reject, no write, all missing listed", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const before = stateSha(proj);
    const r = runState(proj, [
      "set",
      "Current Stage=market-research",
      "Ghost One=a",
      "Ghost Two=b",
    ]);
    expect(r.rc).not.toBe(0);
    // Every missing field is enumerated (fail-at-first would hide Ghost Two).
    expect(r.combined).toContain("Field not found in state file:");
    expect(r.combined).toContain("Ghost One");
    expect(r.combined).toContain("Ghost Two");
    // The one real field must NOT have been applied — full atomicity.
    expect(stateSha(proj)).toBe(before);
    expect(getField(proj, "Current Stage")).toBe("intent-capture");
  });

  // AC-4c: idempotent same-value set stays a success (no before/after compare).
  test("idempotent same-value set: exit 0, updated:true", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    // Current Stage is already intent-capture in the fixture; set it to itself.
    const r = runState(proj, ["set", "Current Stage=intent-capture"]);
    expect(r.rc).toBe(0);
    expect(JSON.parse(r.stdout.trim())).toEqual({ updated: true, fields: 1 });
    expect(getField(proj, "Current Stage")).toBe("intent-capture");
  });

  // AC-4c (positive write): an existing field with a NEW value still succeeds.
  test("existing field set: exit 0, updated:true, value applied", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const r = runState(proj, ["set", "Current Stage=market-research"]);
    expect(r.rc).toBe(0);
    expect(JSON.parse(r.stdout.trim())).toEqual({ updated: true, fields: 1 });
    expect(getField(proj, "Current Stage")).toBe("market-research");
  });

  // AC-4d: NOW / +1 / -1 special values keep working on existing fields.
  test("special values NOW/+1/-1 preserved on existing fields", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const now = runState(proj, ["set", "Last Updated=NOW"]);
    expect(now.rc).toBe(0);
    expect(getField(proj, "Last Updated")).toMatch(
      /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z/,
    );
    // Completed starts at 3 in the fixture.
    expect(runState(proj, ["set", "Completed=+1"]).rc).toBe(0);
    expect(getField(proj, "Completed")).toBe("4");
    expect(runState(proj, ["set", "Completed=-1"]).rc).toBe(0);
    expect(getField(proj, "Completed")).toBe("3");
  });

  // AC-3a corollary: `+1` on an ABSENT field no longer succeeds from a 0 start —
  // field-existence validation runs first, so the old silent-create path is gone.
  test("+1 on absent field rejects (no 0-start create)", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const before = stateSha(proj);
    const r = runState(proj, ["set", "Ghost Counter=+1"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("Field not found in state file:");
    expect(r.combined).toContain("Ghost Counter");
    expect(stateSha(proj)).toBe(before);
  });
});

// ===========================================================================
// FR-1 seam — fieldExists in-process (measured module, lcov-visible)
// ===========================================================================

describe("t224 fieldExists predicate", () => {
  const content = [
    "## Runtime State",
    "",
    "- **Current Stage**: intent-capture",
    "- **Completed**: 3",
    "- **Empty Value**:",
    "",
  ].join("\n");

  test("true for a present field row", () => {
    expect(fieldExists(content, "Current Stage")).toBe(true);
    expect(fieldExists(content, "Completed")).toBe(true);
  });

  test("true even when the field's value is empty", () => {
    expect(fieldExists(content, "Empty Value")).toBe(true);
  });

  test("false for an absent field", () => {
    expect(fieldExists(content, "Nonexistent Field")).toBe(false);
  });

  // setFieldStrict shares fieldLineRegex with fieldExists (patched to the
  // common matcher) — drive both branches in-process so the refactored line
  // is lcov-visible.
  test("setFieldStrict replaces a present field via the shared matcher", () => {
    const content = "- **Scope**: feature\n";
    expect(setFieldStrict(content, "Scope", "bugfix")).toContain("- **Scope**: bugfix");
  });

  test("setFieldStrict throws on an absent field", () => {
    expect(() => setFieldStrict("- **Scope**: feature\n", "Ghost", "x")).toThrow(
      'Field not found in state file: "Ghost"',
    );
  });

  test("false for a substring / non-anchored match", () => {
    // `Stage` is a substring of `Current Stage` but not its own bullet row.
    expect(fieldExists(content, "Stage")).toBe(false);
  });
});
