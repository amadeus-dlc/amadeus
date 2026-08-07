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
    expect(PR_STATE_QUERY).toContain("state mergedAt");
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

// ---------------------------------------------------------------------------
// The CLI on a merged pull request
// ---------------------------------------------------------------------------

const FIXTURES = join(import.meta.dir, "..", "fixtures", "pr-convergence");
const fixture = (name: string) => readFileSync(join(FIXTURES, `${name}.graphql.json`), "utf-8");

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

/** A record root with NO audit shard at all: the landed path must not need one. */
function makeBareRecord(): string {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-landed-"));
  roots.push(root);
  return root;
}

/** Drives the CLI: readiness, then the state query, then review-thread pages. */
function cliSpawn(pullRequest: unknown, pages: readonly string[]) {
  const argvs: (readonly string[])[] = [];
  let pageCalls = 0;
  const spawn: GhSpawn = async (argv) => {
    argvs.push(argv);
    const joined = argv.join(" ");
    if (joined.includes("--version")) return ok("gh version 2.97.0");
    if (joined.includes("auth status")) return ok("Logged in");
    if (joined.includes("reviewThreads")) {
      const page = pages[Math.min(pageCalls++, pages.length - 1)] as string;
      return ok(fixture(page));
    }
    return ok(stateEnvelope(pullRequest));
  };
  return { argvs, spawn };
}

function countingSleep() {
  const calls: number[] = [];
  const sleep = async (ms: number) => {
    calls.push(ms);
  };
  return { calls, sleep };
}

function seams(spawn: GhSpawn, sleep: (ms: number) => Promise<void>) {
  return {
    ghSpawn: spawn,
    sleep,
    now: () => "2026-08-07T02:00:00Z",
    emitDecision: async () => ({ code: 0, stderr: "" }),
  };
}

const statusArgs = (record: string) => [
  "status",
  "--repo",
  "amadeus-dlc/amadeus",
  "--pr",
  "2401",
  "--unit",
  "landed-report",
  "--record",
  record,
];

describe("CLI status verb on a merged pull request (AC-2a/2b)", () => {
  test("exits 0 with a landed verdict, without retrying or reading threads", async () => {
    const record = makeBareRecord();
    const s = cliSpawn(MERGED_PR, []);
    const timer = countingSleep();
    const out = await runCli(statusArgs(record), seams(s.spawn, timer.sleep));
    expect(out.exitCode).toBe(0);
    const payload = JSON.parse(out.stdout);
    expect(payload.verdict).toBe("landed");
    expect(payload.converged).toBe(false);
    expect(payload.mergeState).toBe("MERGED");
    // The mergeable UNKNOWN retry never runs: no sleep, and exactly one state
    // query after the two readiness probes.
    expect(timer.calls).toEqual([]);
    expect(s.argvs).toHaveLength(3);
    expect(s.argvs.some((argv) => argv.join(" ").includes("reviewThreads"))).toBe(false);
  });

  test("an unmerged pull request never takes the landed path (AC-2c)", async () => {
    const record = makeBareRecord();
    const open = {
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      state: "OPEN",
      mergedAt: null,
      mergeCommit: null,
    };
    const s = cliSpawn(open, ["measured-pr-2268"]);
    const timer = countingSleep();
    const out = await runCli(statusArgs(record), seams(s.spawn, timer.sleep));
    expect(out.exitCode).toBe(0);
    const payload = JSON.parse(out.stdout);
    expect(payload.verdict).toBe("converged");
    expect(payload.converged).toBe(true);
    // The active path still reads threads, and still issues exactly one state
    // query (the lifecycle read primes the mergeable loop's first attempt).
    expect(s.argvs.some((argv) => argv.join(" ").includes("reviewThreads"))).toBe(true);
    expect(
      s.argvs.filter((argv) => argv.join(" ").includes("mergeStateStatus")).length,
    ).toBe(1);
  });

  test("an active mergeable=UNKNOWN start re-fetches through the primed dependency", async () => {
    const record = makeBareRecord();
    const first = {
      mergeable: "UNKNOWN",
      mergeStateStatus: "UNKNOWN",
      state: "OPEN",
      mergedAt: null,
      mergeCommit: null,
    };
    const second = {
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      state: "OPEN",
      mergedAt: null,
      mergeCommit: null,
    };
    const states = [first, second];
    const argvs: (readonly string[])[] = [];
    let stateCalls = 0;
    const spawn: GhSpawn = async (argv) => {
      argvs.push(argv);
      const joined = argv.join(" ");
      if (joined.includes("--version")) return ok("gh version 2.97.0");
      if (joined.includes("auth status")) return ok("Logged in");
      if (joined.includes("reviewThreads")) return ok(fixture("measured-pr-2268"));
      return ok(stateEnvelope(states[Math.min(stateCalls++, states.length - 1)]));
    };
    const timer = countingSleep();
    const out = await runCli(statusArgs(record), seams(spawn, timer.sleep));
    expect(out.exitCode).toBe(0);
    const payload = JSON.parse(out.stdout);
    expect(payload.verdict).toBe("converged");
    // primed hands the pre-observed UNKNOWN to the loop's first attempt, so the
    // retry issues a SECOND real state query (two in total) after one sleep.
    expect(argvs.filter((a) => a.join(" ").includes("mergeStateStatus")).length).toBe(2);
    expect(timer.calls.length).toBe(1);
  });

  test("an unknown lifecycle state is a boundary fault (exit 2), never a verdict (AC-1b)", async () => {
    const record = makeBareRecord();
    const weird = { mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", state: "REOPENED" };
    const s = cliSpawn(weird, ["measured-pr-2268"]);
    const out = await runCli(statusArgs(record), seams(s.spawn, countingSleep().sleep));
    expect(out.exitCode).toBe(2);
    expect(out.stdout).toBe("");
    expect(out.stderr).toContain("unknown pull-request state");
  });
});

describe("CLI report verb on a merged pull request (AC-3a/3b)", () => {
  const reportArgs = (record: string) => ["report", ...statusArgs(record).slice(1)];

  test("writes a landed report whose fields are all machine-derived", async () => {
    // The record carries NO audit shard: the landed path must neither read a
    // HUMAN_TURN nor emit a decision (AC-3b) — landing records a merge that
    // already happened, it approves nothing.
    const record = makeBareRecord();
    const emitted: (readonly string[])[] = [];
    const out = await runCli(reportArgs(record), {
      ...seams(cliSpawn(MERGED_PR, []).spawn, countingSleep().sleep),
      emitDecision: async (argv) => {
        emitted.push(argv);
        return { code: 0, stderr: "" };
      },
    });
    expect(out.exitCode).toBe(0);
    expect(emitted).toEqual([]);
    const body = readFileSync(reportPathFor(record, "landed-report"), "utf-8");
    expect(body).toContain("- kind: landed");
    expect(body).toContain("- pull request: amadeus-dlc/amadeus#2401");
    expect(body).toContain("- converged: false");
    expect(body).toContain("- merged at: 2026-08-07T01:00:00Z");
    expect(body).toContain("- merge commit: 0123456789abcdef0123456789abcdef01234567");
    expect(body).toContain("- check rollup: SUCCESS");
    expect(body).toContain("- generated at: 2026-08-07T02:00:00Z");
  });

  test("a null check rollup omits the line rather than rendering null", async () => {
    const record = makeBareRecord();
    const noRollup = {
      ...MERGED_PR,
      mergeCommit: { oid: MERGED_PR.mergeCommit.oid, statusCheckRollup: null },
    };
    const out = await runCli(
      reportArgs(record),
      seams(cliSpawn(noRollup, []).spawn, countingSleep().sleep),
    );
    expect(out.exitCode).toBe(0);
    const body = readFileSync(reportPathFor(record, "landed-report"), "utf-8");
    expect(body).toContain("- kind: landed");
    expect(body).not.toContain("check rollup");
    expect(body).not.toContain("null");
  });
});
