// In-process coverage seam for the #842 jump phase-event direction guard (FR-2).
// The defect: amadeus-jump's phase-boundary block emitted PHASE_COMPLETED/
// PHASE_VERIFIED/PHASE_STARTED without consulting `direction`, so (1) a backward
// jump crossing a phase boundary polluted the append-only ledger with a false
// PHASE_VERIFIED, (2) a multi-phase forward jump collapsed to one emission, and
// (3) a no-work phase emitted no PHASE_SKIPPED. The fix re-grounds the #481
// (2c2c48a39) contract: forward-only, per-phase VERIFIED/SKIPPED enumeration in
// canonical order, plus a same-transaction Phase Progress roll-up flip.
//
// The handler is spawn-driven end-to-end elsewhere; bun's coverage cannot see a
// spawned CLI (the spawn blindspot). So this test imports handleExecute directly
// from the shipped dist tree (matching the t-jump-direction-seam / #761 seam
// precedent — a stale dist reds here rather than passing against un-regenerated
// bytes) and drives forward + backward crossings in-process against seeded state.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { handleExecute } from "../../dist/claude/.claude/tools/amadeus-jump.ts";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
  parseAuditRecords,
  resetOtelProcessState,
} from "../harness/fixtures.ts";

// Concatenate every audit shard under the seeded record's audit/ dir — readers
// glob audit/*.jsonl and merge, so a single read reflects the tool's own appends.
function readAudit(proj: string): string {
  const dir = seededAuditDir(proj);
  let out = "";
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".jsonl")) out += readFileSync(`${dir}/${f}`, "utf-8");
    }
  } catch {
    /* no shard yet */
  }
  return out;
}

// A forward jump that closes a phase WITH executed work runs the #886
// phase-check artifact gate (amadeus-jump.ts:500) before it writes any state.
// That gate is orthogonal to the phase-event contract under test, so seed the
// artifact it demands rather than let an unrelated refusal abort the case.
function seedPhaseCheck(proj: string, phase: string): void {
  const dir = join(seededRecordDir(proj), "verification");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `phase-check-${phase}.md`), "# Phase Check\n", "utf-8");
}

function readState(proj: string): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

function countEvent(audit: string, event: string): number {
  return parseAuditRecords(audit).filter((r) => r.event === event).length;
}

describe("t-jump-phase-events-seam: forward multi-phase jump (#842 FR-2)", () => {
  let proj: string;
  let prev: string | undefined;

  beforeEach(() => {
    proj = createTestProject();
    resetOtelProcessState();
    // scope=feature, Current Stage=feasibility (ideation). Ideation has [x]
    // stages (intent-capture, market-research); inception has none.
    seedStateFile(proj, "state-mid-ideation.md");
    seedPhaseCheck(proj, "ideation");
    prev = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prev;
    cleanupTestProject(proj);
  });

  test("emits one PHASE_VERIFIED (ideation, had work) + one PHASE_SKIPPED (inception, no work) + a single PHASE_STARTED", () => {
    // ideation (feasibility) → construction (functional-design) closes ideation
    // and inception. ideation has executed stages → VERIFIED; inception has
    // none → SKIPPED. One PHASE_STARTED for the target phase.
    handleExecute([
      "--target",
      "functional-design",
      "--direction",
      "forward",
    ]);
    const audit = readAudit(proj);
    expect(countEvent(audit, "PHASE_VERIFIED")).toBe(1);
    expect(countEvent(audit, "PHASE_SKIPPED")).toBe(1);
    expect(countEvent(audit, "PHASE_COMPLETED")).toBe(2);
    expect(countEvent(audit, "PHASE_STARTED")).toBe(1);
    // The VERIFIED row is for ideation; the SKIPPED row is for inception —
    // record-scoped, so neither value can be read off a neighbouring event.
    const rows = parseAuditRecords(audit);
    expect(
      rows.find((r) => r.event === "PHASE_VERIFIED")?.fields?.["Phase boundary"],
    ).toBe("ideation → construction");
    expect(rows.find((r) => r.event === "PHASE_SKIPPED")?.fields?.Phase).toBe("inception");
  });

  test("flips Phase Progress in the same transaction: Ideation→Verified, Inception→Skipped", () => {
    handleExecute([
      "--target",
      "functional-design",
      "--direction",
      "forward",
    ]);
    const state = readState(proj);
    expect(state).toContain("- **Ideation**: Verified");
    expect(state).toContain("- **Inception**: Skipped");
  });
});

describe("t-jump-phase-events-seam: backward jump emits no phase events (#842 FR-2)", () => {
  let proj: string;
  let prev: string | undefined;

  beforeEach(() => {
    proj = createTestProject();
    resetOtelProcessState();
    // scope=feature, Current Stage=functional-design (construction); ideation
    // and inception are already Verified.
    seedStateFile(proj, "state-construction-bolt1.md");
    prev = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prev;
    cleanupTestProject(proj);
  });

  test("construction → inception backward jump emits zero PHASE_* boundary events", () => {
    handleExecute([
      "--target",
      "requirements-analysis",
      "--direction",
      "backward",
    ]);
    const audit = readAudit(proj);
    expect(countEvent(audit, "PHASE_COMPLETED")).toBe(0);
    expect(countEvent(audit, "PHASE_VERIFIED")).toBe(0);
    expect(countEvent(audit, "PHASE_SKIPPED")).toBe(0);
    expect(countEvent(audit, "PHASE_STARTED")).toBe(0);
    // The stage-level jump itself is still recorded.
    expect(countEvent(audit, "STAGE_JUMPED")).toBe(1);
  });

  test("Phase Progress is not rolled back: Ideation and Inception stay Verified", () => {
    handleExecute([
      "--target",
      "requirements-analysis",
      "--direction",
      "backward",
    ]);
    const state = readState(proj);
    expect(state).toContain("- **Ideation**: Verified");
    expect(state).toContain("- **Inception**: Verified");
  });
});
