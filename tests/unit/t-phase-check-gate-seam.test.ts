// covers: function:verifyPhaseCheckArtifact, function:handleAdvance, function:handleFinalize, function:handleCompleteWorkflow, function:handleApprove
//
// In-process coverage seam for the #886 phase-check artifact gate. The gate was
// implemented in the pre-restart lineage (8cf816138: PHASE_CHECK_REQUIRED_PHASES
// + verifyPhaseCheckArtifact, wired into advance / complete-workflow / approve /
// jump) and lost across the restart that rebuilt state.ts — only the
// PHASE_VERIFIED / markPhaseVerified flip (#880/#836) was restored, leaving the
// boundary completion ungated. This restores it on every path that flips a
// required phase Verified.
//
// The handlers are spawn-driven end-to-end elsewhere (t17), which bun's coverage
// cannot see (the spawn blindspot). So this test imports the handlers directly
// from the shipped dist tree (the #761 seam precedent — a stale dist reds here)
// and drives every gate + wiring branch in-process (local-lcov-pre-push):
//   - verifyPhaseCheckArtifact: guard-disabled return, non-required-phase return,
//     no-record refusal, missing-artifact refusal, present-artifact pass.
//   - advance / finalize / complete-workflow / approve: the boundary-closing
//     transition refuses when the phase-check artifact is missing (state left
//     untouched) and proceeds when it is present.
// error() ends the CLI via process.exit; captureExit converts that into a
// throwable so a refusal branch can be driven and its lines registered.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  handleAdvance,
  handleApprove,
  handleCompleteWorkflow,
  handleFinalize,
  verifyPhaseCheckArtifact,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";
import { handleExecute } from "../../dist/claude/.claude/tools/amadeus-jump.ts";
import {
  cleanupTestProject,
  createTestProject,
  removeWorkspaceRecord,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}
function captureExit(fn: () => void): { threw: boolean; stderr: string } {
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) threw = true;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
  }
  return { threw, stderr };
}

// Seed the inception stage's declared produces so verifyStageArtifacts (which
// runs before the phase-check gate on advance/finalize/complete-workflow/approve
// once the artifact guard is active) passes and ONLY a phase-check gate can
// refuse.
function seedReqProduces(proj: string): void {
  const dir = join(seededRecordDir(proj), "inception", "requirements-analysis");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "requirements.md"), "# reqs\n");
}

// Write verification/phase-check-<phase>.md under the seeded record.
function seedPhaseCheck(proj: string, phase: string): void {
  const dir = join(seededRecordDir(proj), "verification");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `phase-check-${phase}.md`), `# phase-check ${phase}\n`);
}

let proj: string;
let prevPd: string | undefined;
let prevGuard: string | undefined;

function setEnv(guardActive: boolean): void {
  process.env.CLAUDE_PROJECT_DIR = proj;
  process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
  if (guardActive) delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
  else process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
}

function saveEnv(): void {
  prevPd = process.env.CLAUDE_PROJECT_DIR;
  prevGuard = process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
}
function restoreEnv(): void {
  if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = prevPd;
  if (prevGuard === undefined) delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
  else process.env.AMADEUS_SKIP_ARTIFACT_GUARD = prevGuard;
}

describe("t-phase-check-gate-seam: verifyPhaseCheckArtifact unit (#886)", () => {
  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-mid-inception.md");
    saveEnv();
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("no-op when the artifact guard is disabled (shared bypass seam)", () => {
    setEnv(false); // AMADEUS_SKIP_ARTIFACT_GUARD=1
    // Missing artifact, but guard disabled → returns without throwing.
    const r = captureExit(() => verifyPhaseCheckArtifact(proj, "inception"));
    expect(r.threw).toBe(false);
  });

  test("no-op for a phase outside the required set (operation)", () => {
    setEnv(true);
    const r = captureExit(() => verifyPhaseCheckArtifact(proj, "operation"));
    expect(r.threw).toBe(false);
  });

  test("passes when the phase-check artifact exists", () => {
    setEnv(true);
    seedPhaseCheck(proj, "inception");
    const r = captureExit(() => verifyPhaseCheckArtifact(proj, "inception"));
    expect(r.threw).toBe(false);
  });

  test("refuses a required phase whose phase-check artifact is missing", () => {
    setEnv(true);
    const r = captureExit(() => verifyPhaseCheckArtifact(proj, "inception"));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("phase-check-inception.md");
  });

  test("refuses when no active intent record resolves", () => {
    setEnv(true);
    removeWorkspaceRecord(proj);
    const r = captureExit(() => verifyPhaseCheckArtifact(proj, "ideation"));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no active intent record");
  });
});

describe("t-phase-check-gate-seam: advance boundary gate (#886)", () => {
  beforeEach(() => {
    proj = createTestProject();
    // scope=bugfix, Current=requirements-analysis (inception); advance derives
    // code-generation (construction) → an inception→construction boundary.
    seedStateFile(proj, "state-mid-inception.md");
    saveEnv();
    seedReqProduces(proj);
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("refuses the boundary advance when phase-check-inception.md is absent, leaving state untouched", () => {
    setEnv(true);
    const before = readFileSync(seededStateFile(proj), "utf-8");
    const r = captureExit(() => handleAdvance(["requirements-analysis"]));
    const after = readFileSync(seededStateFile(proj), "utf-8");
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("phase-check-inception.md");
    expect(after).toBe(before); // state file untouched on refusal
  });

  test("proceeds when phase-check-inception.md is present (non-regression)", () => {
    setEnv(true);
    seedPhaseCheck(proj, "inception");
    const r = captureExit(() => handleAdvance(["requirements-analysis"]));
    expect(r.threw).toBe(false);
    const state = readFileSync(seededStateFile(proj), "utf-8");
    expect(state).toContain("- **Inception**: Verified");
    expect(state).toContain("- **Construction**: Active");
  });

  test("wiring is inert under the suite-wide artifact-guard bypass", () => {
    setEnv(false); // AMADEUS_SKIP_ARTIFACT_GUARD=1: gate no-ops, advance completes
    const r = captureExit(() => handleAdvance(["requirements-analysis"]));
    expect(r.threw).toBe(false);
  });
});

describe("t-phase-check-gate-seam: finalize boundary gate (#886)", () => {
  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-mid-inception.md");
    saveEnv();
    seedReqProduces(proj);
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("refuses the boundary-crossing finalize when the artifact is absent", () => {
    setEnv(true);
    const before = readFileSync(seededStateFile(proj), "utf-8");
    const r = captureExit(() => handleFinalize(["requirements-analysis"]));
    const after = readFileSync(seededStateFile(proj), "utf-8");
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("phase-check-inception.md");
    expect(after).toBe(before);
  });

  test("proceeds when the artifact is present", () => {
    setEnv(true);
    seedPhaseCheck(proj, "inception");
    const r = captureExit(() => handleFinalize(["requirements-analysis"]));
    expect(r.threw).toBe(false);
    expect(readFileSync(seededStateFile(proj), "utf-8")).toContain("- **Inception**: Verified");
  });
});

describe("t-phase-check-gate-seam: complete-workflow gate (#886)", () => {
  beforeEach(() => {
    proj = createTestProject();
    // complete-workflow treats the given slug as final and closes its phase;
    // requirements-analysis (inception, non-workspace_requires) keeps the test
    // off the workspace_requires source-work path.
    seedStateFile(proj, "state-mid-inception.md");
    saveEnv();
    seedReqProduces(proj);
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("refuses closing the final phase when the artifact is absent", () => {
    setEnv(true);
    const before = readFileSync(seededStateFile(proj), "utf-8");
    const r = captureExit(() => handleCompleteWorkflow(["requirements-analysis"]));
    const after = readFileSync(seededStateFile(proj), "utf-8");
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("phase-check-inception.md");
    expect(after).toBe(before);
  });

  test("proceeds when the artifact is present", () => {
    setEnv(true);
    seedPhaseCheck(proj, "inception");
    const r = captureExit(() => handleCompleteWorkflow(["requirements-analysis"]));
    expect(r.threw).toBe(false);
    const state = readFileSync(seededStateFile(proj), "utf-8");
    expect(state).toContain("- **Inception**: Verified");
    expect(state).toContain("- **Status**: Completed");
  });
});

describe("t-phase-check-gate-seam: approve gate (#886)", () => {
  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-mid-inception.md");
    // Move requirements-analysis to awaiting-approval [?] so approve is valid.
    // approve marks it [x] and delegates to advance (next = code-generation,
    // construction) → an inception→construction boundary the approve-local gate
    // must catch (the nested advance sees alreadyMarkedCompleted and skips its own).
    const sf = seededStateFile(proj);
    writeFileSync(
      sf,
      readFileSync(sf, "utf-8").replace("- [-] requirements-analysis", "- [?] requirements-analysis"),
    );
    saveEnv();
    seedReqProduces(proj);
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("refuses the approve that would cross a boundary when the artifact is absent", () => {
    setEnv(true); // human-presence bypass stays on; artifact guard active
    const before = readFileSync(seededStateFile(proj), "utf-8");
    const r = captureExit(() => handleApprove(["requirements-analysis"]));
    const after = readFileSync(seededStateFile(proj), "utf-8");
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("phase-check-inception.md");
    expect(after).toBe(before);
  });

  test("proceeds when the artifact is present", () => {
    setEnv(true);
    seedPhaseCheck(proj, "inception");
    const r = captureExit(() => handleApprove(["requirements-analysis"]));
    expect(r.threw).toBe(false);
    const state = readFileSync(seededStateFile(proj), "utf-8");
    expect(state).toContain("- **Inception**: Verified");
  });
});

describe("t-phase-check-gate-seam: jump forward gate (#886)", () => {
  beforeEach(() => {
    proj = createTestProject();
    // scope=feature, Current=feasibility (ideation, has [x] work). A forward jump
    // to functional-design (construction) closes ideation (with work → Verified,
    // gated) and inception (no work → Skipped, not gated).
    seedStateFile(proj, "state-mid-ideation.md");
    saveEnv();
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("refuses the forward jump that verifies ideation when phase-check-ideation.md is absent", () => {
    setEnv(true);
    const before = readFileSync(seededStateFile(proj), "utf-8");
    const r = captureExit(() =>
      handleExecute(["--target", "functional-design", "--direction", "forward"]),
    );
    const after = readFileSync(seededStateFile(proj), "utf-8");
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("phase-check-ideation.md");
    expect(after).toBe(before);
  });

  test("proceeds when phase-check-ideation.md is present", () => {
    setEnv(true);
    seedPhaseCheck(proj, "ideation");
    const r = captureExit(() =>
      handleExecute(["--target", "functional-design", "--direction", "forward"]),
    );
    expect(r.threw).toBe(false);
    expect(existsSync(seededStateFile(proj))).toBe(true);
    expect(readFileSync(seededStateFile(proj), "utf-8")).toContain("- **Ideation**: Verified");
  });
});
