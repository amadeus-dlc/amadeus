// In-process coverage seam for the crash-window state-merged postcondition.
// t232 proves the contract end-to-end by spawning the real amadeus-bolt CLI,
// which bun's coverage instrumentation cannot see (the spawn blindspot) — so
// this test imports stateMergedPostcondition directly and drives every
// branch in-process: no audit row, audit row with the slug still in main's
// Bolt Refs (the crash window — must NOT skip the merge), and audit row with
// the slug removed (the merge really finished — evidence accepted).
// Behavioural depth stays in t232; this file exists so the added lines
// register in lcov (local-lcov-pre-push norm).

import { afterAll, describe, expect, test } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { stateMergedPostcondition } from "../../packages/framework/core/tools/amadeus-swarm-operation-journal.ts";
import { createTestProject, seededStateFile } from "../harness/fixtures.ts";

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function projectWithBoltRefs(refs: string): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(
    seededStateFile(proj),
    `# AI-DLC State Tracking

## Project Information
- **Project**: seam-fixture
- **Project Type**: Greenfield
- **Scope**: feature
- **Start Date**: 2026-07-16T00:00:00Z
- **State Version**: 7
- **Active Agent**: amadeus-developer-agent
- **Worktree Path**:
- **Bolt Refs**: ${refs}
- **Practices Affirmed Timestamp**:
`,
    "utf-8",
  );
  return proj;
}

describe("stateMergedPostcondition crash-window seam", () => {
  const auditRow = Object.freeze({ event: "STATE_MERGED", unit: "alpha" });
  const flags = { slug: "alpha" };

  test("returns null when no STATE_MERGED audit row exists", () => {
    const proj = projectWithBoltRefs("[alpha]");
    expect(stateMergedPostcondition(proj, flags, () => null)).toBeNull();
  });

  test("rejects the audit row while the slug still sits in Bolt Refs", () => {
    const proj = projectWithBoltRefs("[alpha]");
    expect(stateMergedPostcondition(proj, flags, () => auditRow)).toBeNull();
  });

  test("accepts the audit row once the slug left Bolt Refs", () => {
    const proj = projectWithBoltRefs("[]");
    expect(stateMergedPostcondition(proj, flags, () => auditRow)).toBe(auditRow);
  });
});
