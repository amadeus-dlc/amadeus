// covers: function:recordEngineError, subcommand:amadeus-orchestrate:report,
//         function:auditShardName
//
// Regression for Issue #1389 (bug/P2/S3-MAJOR): a full in-process test run wrote
// a fixture-clone-id audit shard into the REAL workspace's active-intent record.
//
// Two compounding defects, both fixed and pinned here:
//
//   ROOT — recordEngineError re-derived its projectDir from process.argv (empty
//   under an in-process driver) and fell through to the ambient CLAUDE_PROJECT_DIR
//   (the real worktree). handleReport now records emit()'s ERROR_LOGGED against
//   the project it was CALLED with, via a module-scoped current-dir read at the
//   single emit() aggregation point. The "ambient not polluted" case below drives
//   an in-process report error against a temp `target` while CLAUDE_PROJECT_DIR
//   points at a distinct `ambient` fake workspace, and asserts the ambient audit
//   dir stays empty while `target` gets the row.
//
//   AMPLIFICATION — cloneId()/auditShardName() memoised a SINGLE value per
//   process, so a fixture project's clone token leaked into a later, different
//   project's shard name. They are now keyed by projectDir. The "clone id is not
//   mixed across projects" case primes the cache with one project's clone id and
//   asserts a second project with a DISTINCT clone id resolves its own shard.
//
// In-process (integration layer, real FS) so the fixed lines register in lcov
// (fs-tests-integration-first). The falling proof (pre-fix red) is taken by
// checking out the pre-fix source for these two files and re-running.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  _resetCloneIdForTests,
  auditShardName,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seedStateFile,
} from "../harness/fixtures.ts";

const projects: string[] = [];

let savedProjectDir: string | undefined;
let savedArgv: string[];

beforeEach(() => {
  savedProjectDir = process.env.CLAUDE_PROJECT_DIR;
  savedArgv = process.argv;
  // Neutralise argv so the pre-fix argv-extraction path (the fallback in
  // recordEngineError) can never accidentally pick up a --project-dir the test
  // runner passed — the bug's whole point is that an in-process driver has none.
  process.argv = ["bun", "amadeus-orchestrate.ts", "report"];
  _resetCloneIdForTests();
});

afterEach(() => {
  if (savedProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = savedProjectDir;
  process.argv = savedArgv;
  _resetCloneIdForTests();
  while (projects.length > 0) cleanupTestProject(projects.pop());
});

function newSeededProject(): string {
  const proj = createTestProject();
  projects.push(proj);
  seedStateFile(proj, "state-init-active.md");
  return proj;
}

/** Names of the *.md audit shards physically present in a project's record. */
function auditShardsOf(proj: string): string[] {
  const dir = seededAuditDir(proj);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".md"));
}

/** Drive an in-process report error (an unrecognised --result verdict) against
 *  `target`. handleReport emits an error directive, whose emit() aggregation
 *  point records ERROR_LOGGED — the exact in-process error-driving shape #1389
 *  is about. console.log is silenced so the directive JSON doesn't spam output. */
function driveReportError(target: string): void {
  const originalLog = console.log;
  console.log = () => {};
  try {
    handleReport(["--result", "__not_a_verdict__"], target);
  } finally {
    console.log = originalLog;
  }
}

describe("t258 in-process engine error does not pollute the ambient record (#1389)", () => {
  test("records against the handler's project, leaving CLAUDE_PROJECT_DIR untouched", () => {
    const ambient = newSeededProject(); // stands in for the real worktree
    const target = newSeededProject(); // the project the handler is called with
    process.env.CLAUDE_PROJECT_DIR = ambient;

    driveReportError(target);

    // The error IS recorded — against the project the handler operated on.
    expect(auditShardsOf(target)).toHaveLength(1);
    // The ambient workspace is NOT touched (this is the bug; empty before the fix
    // would fail here). No audit dir / no shard either way is acceptable.
    expect(auditShardsOf(ambient)).toEqual([]);
  });

  test("still records when the handler's project IS the ambient one (single-project path unchanged)", () => {
    // e1/e6 reservation: the projectDir-keyed memo must not regress the ordinary
    // single-project flow. Here CLAUDE_PROJECT_DIR and the handler project are
    // the same, so the row lands exactly once, in that one project.
    const target = newSeededProject();
    process.env.CLAUDE_PROJECT_DIR = target;

    driveReportError(target);

    expect(auditShardsOf(target)).toHaveLength(1);
  });
});

describe("t258 clone id / audit shard name are not mixed across projects (#1389)", () => {
  test("a second project with a distinct clone id resolves its own shard name", () => {
    const first = createTestProject(); // clone id = fixturecloneid01 (fixture)
    projects.push(first);
    const second = createTestProject();
    projects.push(second);
    // Give `second` a DISTINCT on-disk clone id so a leaked memo is observable.
    writeFileSync(
      join(second, "amadeus", ".amadeus-clone-id"),
      "distinctcloneid2\n",
      "utf-8",
    );

    // Prime the per-process memo with the first project's clone id.
    const firstShard = auditShardName(first);
    expect(firstShard).toContain("fixturecloneid01");

    // The second project must resolve ITS OWN clone id, not the primed one. A
    // single-value memo (the pre-fix defect) would return firstShard here.
    const secondShard = auditShardName(second);
    expect(secondShard).toContain("distinctcloneid2");
    expect(secondShard).not.toContain("fixturecloneid01");
  });

  test("_resetCloneIdForTests clears BOTH the clone-id and shard-name memos", () => {
    const proj = createTestProject();
    projects.push(proj);
    expect(auditShardName(proj)).toContain("fixturecloneid01");

    // Re-point the clone id and reset: a stale shard-name memo would keep the old
    // token (write/reset symmetry — both caches must clear together).
    writeFileSync(
      join(proj, "amadeus", ".amadeus-clone-id"),
      "rekeyedcloneid3\n",
      "utf-8",
    );
    _resetCloneIdForTests();
    expect(auditShardName(proj)).toContain("rekeyedcloneid3");
  });
});
