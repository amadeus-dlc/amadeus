// covers: function:setIntentDocsOnly, function:docsOnlyDeclaration, function:handleDeclareDocsOnly, function:verifyStageArtifacts, audit:GUARD_EXEMPTED
//
// In-process coverage seam for the #499/#848 docs-only workspace_requires
// exemption. The spawn-driven integration test (t214) drives the same contract
// end-to-end through the shipped dist CLI, which bun's coverage cannot see (the
// spawn blindspot). So this unit test imports the seams directly from the
// shipped dist tree (the #761 seam precedent — a stale dist reds here) and
// drives every added branch in-process so the new lines register in lcov
// (local-lcov-pre-push):
//   - setIntentDocsOnly: write (matched/changed), idempotent (changed=false),
//     no-match (matched=false), empty-evidence throw.
//   - docsOnlyDeclaration: valid read-back, absent → null, blank-evidence → null.
//   - handleDeclareDocsOnly: happy path + every error() branch (empty / malformed
//     / absent-event evidence), the exits captured via a process.exit stub.
//   - verifyStageArtifacts workspace_requires branch: exempted (GUARD_EXEMPTED
//     emitted, finalize proceeds) and refused (no declaration → loud error).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  handleDeclareDocsOnly,
  handleFinalize,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  docsOnlyDeclaration,
  setIntentDocsOnly,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  DEFAULT_RECORD_DIR,
  cleanupTestProject,
  createTestProject,
  intentsDirOf,
  removeWorkspaceRecord,
  seededAuditShard,
  seededRecordDir,
  seedStateFile,
} from "../harness/fixtures.ts";

process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

// error() ends the CLI via process.exit; in-process we convert that into a
// throwable so an error branch can be driven and its lines registered.
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

function seedApprovalEvent(proj: string, eventType: string, stage: string): void {
  const shard = seededAuditShard(proj);
  mkdirSync(dirname(shard), { recursive: true });
  const block =
    `\n## Approval\n**Timestamp**: 2026-07-11T10:00:00Z\n**Event**: ${eventType}\n**Stage**: ${stage}\n\n---\n`;
  writeFileSync(shard, block);
}

function writeCodeGenDocs(proj: string): void {
  for (const name of ["code-generation-plan.md", "code-summary.md"]) {
    const full = join(seededRecordDir(proj), "construction", "seam-unit", "code-generation", name);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, "# stub\n\n## A\n\n## B\n");
  }
}

let proj: string;
let prevPd: string | undefined;
let prevGuard: string | undefined;

describe("t-docs-only-exemption-seam: lib write/read (#499/#848)", () => {
  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-construction-bolt1.md");
    prevPd = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
  });
  afterEach(() => {
    if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevPd;
    cleanupTestProject(proj);
  });

  test("setIntentDocsOnly writes, is idempotent, and reports no-match", () => {
    const first = setIntentDocsOnly(proj, DEFAULT_RECORD_DIR, "DECISION_RECORDED requirements-analysis");
    expect(first).toEqual({ matched: true, changed: true });
    // Same evidence again → matched but unchanged.
    const again = setIntentDocsOnly(proj, DEFAULT_RECORD_DIR, "DECISION_RECORDED requirements-analysis");
    expect(again).toEqual({ matched: true, changed: false });
    // A dir that no registry row matches → matched=false (exempts nothing).
    const nomatch = setIntentDocsOnly(proj, "no-such-record-abcdef01", "DECISION_RECORDED x");
    expect(nomatch.matched).toBe(false);
    // Read-back sees the declaration.
    expect(docsOnlyDeclaration(proj, DEFAULT_RECORD_DIR)).toEqual({
      evidence: "DECISION_RECORDED requirements-analysis",
    });
  });

  test("setIntentDocsOnly throws on empty evidence", () => {
    expect(() => setIntentDocsOnly(proj, DEFAULT_RECORD_DIR, "   ")).toThrow();
  });

  test("docsOnlyDeclaration returns null when absent or blank", () => {
    // Absent (fresh registry, no declaration).
    expect(docsOnlyDeclaration(proj, DEFAULT_RECORD_DIR)).toBeNull();
    // Blank-evidence row (e.g. a hand-edited registry) is treated as NOT declared.
    const registryPath = join(intentsDirOf(proj), "intents.json");
    const list = JSON.parse(readFileSync(registryPath, "utf-8")) as Array<Record<string, unknown>>;
    list[0].dirName = DEFAULT_RECORD_DIR;
    list[0].docsOnly = { evidence: "   " };
    writeFileSync(registryPath, `${JSON.stringify(list, null, 2)}\n`);
    expect(docsOnlyDeclaration(proj, DEFAULT_RECORD_DIR)).toBeNull();
  });

  test("docsOnlyDeclaration returns null when no registry row matches (loop exhausts)", () => {
    expect(docsOnlyDeclaration(proj, "no-such-record-abcdef01")).toBeNull();
  });
});

describe("t-docs-only-exemption-seam: handleDeclareDocsOnly guard edges (#499/#848)", () => {
  beforeEach(() => {
    proj = createTestProject();
    prevPd = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
  });
  afterEach(() => {
    if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevPd;
    cleanupTestProject(proj);
  });

  test("refuses when no active intent record resolves", () => {
    removeWorkspaceRecord(proj); // drop the cursor + registry → activeIntent === null
    const r = captureExit(() =>
      handleDeclareDocsOnly(["--evidence", "DECISION_RECORDED requirements-analysis"]),
    );
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no active intent record resolves");
  });

  test("refuses when the declaration lands on no registry row", () => {
    // Cursor + state resolve (activeIntent non-null) and the evidence references
    // a real audit event, but the registry row is gone → setIntentDocsOnly
    // reports matched=false, which the handler surfaces as an error.
    seedStateFile(proj, "state-construction-bolt1.md");
    seedApprovalEvent(proj, "DECISION_RECORDED", "requirements-analysis");
    writeFileSync(join(intentsDirOf(proj), "intents.json"), "[]\n");
    const r = captureExit(() =>
      handleDeclareDocsOnly(["--evidence", "DECISION_RECORDED requirements-analysis"]),
    );
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no registry row in intents.json matches");
  });
});

describe("t-docs-only-exemption-seam: handleDeclareDocsOnly (#499/#848)", () => {
  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-construction-bolt1.md");
    prevPd = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
  });
  afterEach(() => {
    if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevPd;
    cleanupTestProject(proj);
  });

  test("declares when evidence references a real approval event", () => {
    seedApprovalEvent(proj, "DECISION_RECORDED", "requirements-analysis");
    handleDeclareDocsOnly(["--evidence", "DECISION_RECORDED requirements-analysis 2026-07-11T10:00:00Z"]);
    expect(docsOnlyDeclaration(proj, DEFAULT_RECORD_DIR)?.evidence).toContain("DECISION_RECORDED requirements-analysis");
  });

  test("refuses empty evidence", () => {
    const r = captureExit(() => handleDeclareDocsOnly(["--evidence", ""]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("must be non-empty");
  });

  test("refuses malformed evidence (not an approval event)", () => {
    const r = captureExit(() => handleDeclareDocsOnly(["--evidence", "just some prose"]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("human-approval audit event");
  });

  test("refuses when the referenced approval event is absent from the trail", () => {
    const r = captureExit(() => handleDeclareDocsOnly(["--evidence", "GATE_APPROVED requirements-analysis"]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no GATE_APPROVED event for stage");
  });
});

describe("t-docs-only-exemption-seam: verifyStageArtifacts workspace_requires branch (#499/#848)", () => {
  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-construction-bolt1.md");
    prevPd = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
    // Enforce the artifact guard in-process so the branch is REACHED (the suite
    // default bypass would return early from verifyStageArtifacts).
    prevGuard = process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    writeCodeGenDocs(proj); // satisfy the produces-existence layer, no source code
  });
  afterEach(() => {
    if (prevGuard === undefined) delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    else process.env.AMADEUS_SKIP_ARTIFACT_GUARD = prevGuard;
    if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevPd;
    cleanupTestProject(proj);
  });

  test("declared docs-only → exemption emits GUARD_EXEMPTED and finalize proceeds", () => {
    setIntentDocsOnly(proj, DEFAULT_RECORD_DIR, "DECISION_RECORDED requirements-analysis");
    // The guard exemption runs (and emits) BEFORE any later finalize step; wrap
    // in captureExit so an unrelated downstream exit cannot abort the test
    // process. The exemption itself must have been recorded regardless.
    captureExit(() => handleFinalize(["code-generation"]));
    const shard = readFileSync(seededAuditShard(proj), "utf-8");
    expect(shard).toContain("**Event**: GUARD_EXEMPTED");
    expect(shard).toMatch(/\*\*Event\*\*: GUARD_EXEMPTED[\s\S]*?\*\*Stage\*\*: code-generation/);
  });

  test("no declaration → workspace_requires refusal (loud)", () => {
    const r = captureExit(() => handleFinalize(["code-generation"]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("workspace_requires");
  });
});
