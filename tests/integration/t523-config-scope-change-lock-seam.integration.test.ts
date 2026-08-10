// size: medium
// covers: subcommand:amadeus-utility:config-change
//
// t523 — the #2729 audit-lock wrap put handleConfigChange's and
// handleScopeChange's bodies inside a withAuditLock callback. Everything a
// spawned CLI run drives is then invisible to bun --coverage (the spawn
// blindspot), so the wrapped sections need an IN-PROCESS driver or the patch
// gate reads them as dead rows.
//
// This drives both handlers in-process from the shipped dist tool (the
// t-scope-change-checkbox-preserve idiom, so DATA_DIR resolves the compiled
// stage-graph.json next to the tool) and exercises every arm the wrap
// re-indented:
//   - config-change: depth only, test-strategy only, both at once, and the
//     no-change ("already X") arm that writes nothing;
//   - scope-change: the early return when the requested scope is the current
//     one, which returns from INSIDE the callback (the path that proves
//     withAuditLock's finally releases on a non-terminal exit).
//
// Each case asserts the state file, so the write inside the lock is measured
// by its effect rather than by the handler merely not throwing.

import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import {
  cleanupTestProject,
  createTestProject,
  seedAuditFile,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  handleConfigChange,
  handleScopeChange,
} from "../../dist/claude/.claude/tools/amadeus-utility.ts";
import { auditLockDir, getField } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

/** A seeded feature-scope workflow with an audit file the handlers can append to. */
function seededProject(): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, "state-mid-ideation.md");
  seedAuditFile(p);
  return p;
}

function state(p: string): string {
  return readFileSync(seededStateFile(p), "utf-8");
}

// The canonical emit path registers a Logger Provider for one workspace per
// process, so drop the registration between fixtures.
beforeEach(() => {
  resetOtelPerProject();
});

describe("t523 config-change under the audit lock (#2729)", () => {
  test("--depth writes the new Depth and releases the lock", () => {
    const p = seededProject();
    expect(getField(state(p), "Depth")).not.toBe("Comprehensive");

    handleConfigChange(p, { depth: "comprehensive" });

    expect(getField(state(p), "Depth")).toBe("Comprehensive");
    // withAuditLock's finally ran — a retained lock dir poisons the next
    // operation for the whole retry budget.
    expect(existsSync(auditLockDir(p))).toBe(false);
  });

  test("--test-strategy writes the new Test Strategy", () => {
    const p = seededProject();
    handleConfigChange(p, { "test-strategy": "comprehensive" });
    expect(getField(state(p), "Test Strategy")).toBe("Comprehensive");
  });

  test("both flags at once land in ONE locked transaction", () => {
    const p = seededProject();
    handleConfigChange(p, { depth: "minimal", "test-strategy": "minimal" });
    const after = state(p);
    expect(getField(after, "Depth")).toBe("Minimal");
    expect(getField(after, "Test Strategy")).toBe("Minimal");
    expect(existsSync(auditLockDir(p))).toBe(false);
  });

  test("a no-change request leaves the state file byte-identical", () => {
    const p = seededProject();
    handleConfigChange(p, { depth: "comprehensive", "test-strategy": "comprehensive" });
    const settled = state(p);

    // Same values again: depthChanging and strategyChanging are both false, so
    // the guarded write and both audit emits are skipped, Last Updated does not
    // move, and each stdout arm takes its "is already" branch.
    handleConfigChange(p, { depth: "comprehensive", "test-strategy": "comprehensive" });

    expect(state(p)).toBe(settled);
    expect(existsSync(auditLockDir(p))).toBe(false);
  });
});

describe("t523 scope-change early return inside the lock (#2729)", () => {
  test("re-requesting the current scope returns without rewriting the plan", () => {
    const p = seededProject();
    const current = getField(state(p), "Scope");
    expect(current).toBeTruthy();
    const before = state(p);

    // Returns from INSIDE the withAuditLock callback.
    handleScopeChange(p, { scope: current as string });

    expect(state(p)).toBe(before);
    // The early return still unwinds through withAuditLock's finally.
    expect(existsSync(auditLockDir(p))).toBe(false);
  });

  test("a real scope change still rewrites the plan after the no-op path", () => {
    const p = seededProject();
    const current = getField(state(p), "Scope") as string;
    handleScopeChange(p, { scope: current });
    handleScopeChange(p, { scope: "mvp" });
    expect(getField(state(p), "Scope")).toBe("mvp");
  });
});
