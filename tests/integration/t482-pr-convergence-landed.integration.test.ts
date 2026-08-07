// covers: file:plugins/pr-convergence/tools/pr-convergence-cli.ts,
//         file:plugins/pr-convergence/tools/pr-convergence-gh-runner.ts
// size: medium
//
// Bolt landed-report (#2401): a merged pull request (state MERGED) is a fact
// to record, not a state to converge. These tests drive the CLI through the
// scripted GhSpawn seam (t448's style) and pin:
//
//   (a) the state query carries the lifecycle fields and the fetch returns
//       them raw (AC-1a) — and, by ruling E-MPC-CGBLK, leaves them absent
//       when a pre-extension response omits them;
//   (b) a merged pull request short-circuits to a landed verdict: exit 0,
//       no retry sleep, no review-thread fetch (AC-2a/2b);
//   (c) the report verb writes a landed report whose fields are all
//       machine-derived (AC-3a);
//   (d) the landed path needs no HUMAN_TURN — it is a record of a merge,
//       not an approval (AC-3b);
//   (e) an unmerged pull request never takes the landed path (AC-2c).

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGhRunner,
  fetchRawPrState,
  type GhSpawn,
  type GhSpawnResult,
  parsePrRef,
  PR_STATE_QUERY,
} from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  reportPathFor,
  runCli,
} from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";

const ok = (stdout = ""): GhSpawnResult => ({ code: 0, stdout, stderr: "" });

const REF = parsePrRef("amadeus-dlc/amadeus", "2401");
if (REF === null) throw new Error("fixture ref must parse");

/** A spawn seam that records every argv it is handed and replays a script. */
function scriptedSpawn(script: readonly GhSpawnResult[]) {
  const argvs: (readonly string[])[] = [];
  const spawn: GhSpawn = async (argv) => {
    argvs.push(argv);
    return script[Math.min(argvs.length - 1, script.length - 1)] as GhSpawnResult;
  };
  return { argvs, spawn };
}

const MERGED_PR = {
  mergeable: "UNKNOWN",
  mergeStateStatus: "UNKNOWN",
  state: "MERGED",
  mergedAt: "2026-08-07T01:00:00Z",
  mergeCommit: {
    oid: "0123456789abcdef0123456789abcdef01234567",
    statusCheckRollup: { state: "SUCCESS" },
  },
} as const;

const stateEnvelope = (pullRequest: unknown): string =>
  JSON.stringify({ data: { repository: { pullRequest } } });

describe("fetchRawPrState — the lifecycle fields travel raw (AC-1a)", () => {
  test("the state query asks for state, mergedAt and the merge commit rollup", () => {
    expect(PR_STATE_QUERY).toContain("state");
    expect(PR_STATE_QUERY).toContain("mergedAt");
    expect(PR_STATE_QUERY).toContain("mergeCommit");
    expect(PR_STATE_QUERY).toContain("statusCheckRollup");
  });

  test("returns the lifecycle fields raw when the response carries them", async () => {
    const s = scriptedSpawn([ok("v"), ok("auth"), ok(stateEnvelope(MERGED_PR))]);
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("unreachable");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw.ok).toBe(true);
    if (!raw.ok) return;
    expect(raw.value).toEqual({
      mergeable: "UNKNOWN",
      mergeStateStatus: "UNKNOWN",
      state: "MERGED",
      mergedAt: "2026-08-07T01:00:00Z",
      mergeCommitOid: "0123456789abcdef0123456789abcdef01234567",
      checkRollupState: "SUCCESS",
    });
  });

  test("an unmerged response carries null mergedAt/mergeCommit as nulls", async () => {
    const open = {
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      state: "OPEN",
      mergedAt: null,
      mergeCommit: null,
    };
    const s = scriptedSpawn([ok("v"), ok("auth"), ok(stateEnvelope(open))]);
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("unreachable");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw.ok).toBe(true);
    if (!raw.ok) return;
    expect(raw.value).toEqual({
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      state: "OPEN",
      mergedAt: null,
      mergeCommitOid: null,
      checkRollupState: null,
    });
  });

  test("a pre-extension response leaves the lifecycle fields absent (ruling E-MPC-CGBLK)", async () => {
    // No defaults, no fabricated nulls: a payload that never mentioned the
    // lifecycle fields yields a value without them.
    const s = scriptedSpawn([
      ok("v"),
      ok("auth"),
      ok(stateEnvelope({ mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" })),
    ]);
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("unreachable");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw.ok).toBe(true);
    if (!raw.ok) return;
    expect(raw.value).toEqual({ mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" });
    expect("state" in raw.value).toBe(false);
    expect("mergedAt" in raw.value).toBe(false);
  });
});
