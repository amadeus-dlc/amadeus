// In-process coverage seam for the #761 per-unit learnings window. t98 proves
// the contract end-to-end by spawning the shipped dist CLI, which bun's
// coverage instrumentation cannot see (the spawn blindspot) — so this unit test
// imports compile directly and drives the new path in-process: the stashed
// parent-completion terminus and the approved instance-bearing recount.
// Behavioural depth stays in t98; this file exists so the added lines register
// in lcov (local-lcov-pre-push norm).

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { auditFilePath } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { compile } from "../../dist/claude/.claude/tools/amadeus-runtime.ts";
import { toPortablePath } from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STATE_FIXTURE = join(REPO_ROOT, "tests", "fixtures", "state-construction.md");
const AUDIT_FIXTURE = join(
  REPO_ROOT,
  "tests",
  "fixtures",
  "v05-mr12-learnings",
  "audit-instance-learnings-approved.md",
);

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

// Mirror of t98's makeProjectWithAudit: bare space record root carrying the
// shared construction state + the approved 2-instance learnings fixture.
function makeProject(): string {
  const proj = toPortablePath(mkdtempSync(join(tmpdir(), "amadeus-t761s-")));
  tempDirs.push(proj);
  const rec = join(proj, "amadeus", "spaces", "default", "intents");
  mkdirSync(rec, { recursive: true });
  writeFileSync(join(rec, "amadeus-state.md"), readFileSync(STATE_FIXTURE), "utf-8");
  const shard = auditFilePath(proj);
  mkdirSync(dirname(shard), { recursive: true });
  writeFileSync(shard, readFileSync(AUDIT_FIXTURE), "utf-8");
  return proj;
}

describe("t-runtime-learnings-seam (#761 in-process)", () => {
  test("approved instance-bearing parent recounts learnings against the stashed parent completion", () => {
    const proj = makeProject();
    const result = compile({ projectDir: proj });
    expect(result.written).toBeDefined();

    const graph = JSON.parse(
      readFileSync(
        join(proj, "amadeus", "spaces", "default", "intents", "runtime-graph.json"),
        "utf-8",
      ),
    );
    // biome-ignore lint/suspicious/noExplicitAny: test reads arbitrary graph shape
    const cg = graph.stages.find((s: any) => s.stage_slug === "code-generation");
    expect(cg).toBeDefined();
    expect(cg.outcome).toBe("approved");
    expect(cg.instances?.length).toBe(2);
    // Fixture real numbers land at t3, strictly between the last STATE_MERGED
    // (t2) and the parent STAGE_COMPLETED (t4): a parentEnd terminus would
    // leave this {0,0}.
    expect(cg.learnings_captured).toEqual({ from_orchestrator: 3, from_user_addition: 1 });
    // The stash never leaks into the public row.
    expect(cg.parent_completed_at).toBeUndefined();
  });
});
