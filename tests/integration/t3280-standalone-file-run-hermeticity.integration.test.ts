// covers: function:verifyBatchApprovalPresence
// size: medium
//
// t3280 — a directly-invoked `bun test <file>` must report its own results,
// and must not take other files down with it.
//
// THE DEFECT (#3280). tests/run-tests.ts injects the suite-wide presence
// off-switch (AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=1, run-tests.ts:649) into every
// per-file spawn. Running a file directly — a workflow
// docs/reference/09-testing.md explicitly documents — does not get that
// injection, so approve-batch reaches the real presence guard. For an
// in-process driver that is fatal rather than red: the refusal goes through
// amadeus-bolt's error() -> emitError() -> process.exit(1), which tears the Bun
// test runner down mid-file. t507 printed the refusal line and nothing else: no
// pass/fail counts, no `Ran N tests` — and in a multi-file invocation the OTHER
// files' results vanished with it.
//
// #698 ("standalone-green for non-substrate tests") already established the
// contract this violates, and its remediation idiom — a file-level
// `process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1"` — was already carried
// by 30 files. t33 and t507 are the two that escaped that batch; both now carry
// it too, so the idiom's census reads 32.
//
// This pins BOTH halves, because they fail independently:
//   R-1 self-report:  a directly-run file emits its own pass/fail summary
//                     (the in-process driver must convert the CLI's
//                     process.exit into a value, like the presence-guard and
//                     t414 drivers already do).
//   R-2 no spillover: a co-run file's results survive.
//   R-3 standalone-green: the two files #3280 names pass with no runner env.
//
// Mechanism: cli — spawns child `bun test` runs with the suite's guard
// variables REMOVED, which is the whole point: inheriting them would make every
// assertion here vacuously true.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

const T507 = "tests/integration/t507-approve-batch-idempotent.integration.test.ts";
const T33 = "tests/unit/t33.test.ts";
const PRESENCE_GUARD = "tests/integration/t-approve-batch-presence-guard.integration.test.ts";

// A bare developer shell: neither guard the runner injects is present. Deleting
// them is load-bearing — with them inherited the child cannot reproduce #3280.
function bareEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  delete env.AMADEUS_SKIP_ARTIFACT_GUARD;
  return env;
}

interface DirectRun {
  readonly status: number | null;
  readonly output: string;
}

function runDirect(
  files: readonly string[],
  overrides: Readonly<Record<string, string>> = {},
): DirectRun {
  const res = spawnSync(process.execPath, ["test", ...files], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...bareEnv(), ...overrides },
  });
  return { status: res.status, output: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

// Bun's own end-of-run summary. Its ABSENCE is the #3280 symptom: the runner
// was killed before it could print one.
const SUMMARY = /Ran \d+ tests? across \d+ files?/;

/**
 * How many tests the run actually reported on. Deliberately parsed from the
 * summary rather than counted from per-file headers: Bun prints a header only
 * for a file that has something to show, so an all-green run has none, and an
 * assertion on file names would pass vacuously.
 */
function reportedTests(run: DirectRun): number {
  const m = /Ran (\d+) tests? across (\d+) files?/.exec(run.output);
  if (m === null) {
    throw new Error(`no run summary — the runner was torn down: ${run.output}`);
  }
  return Number(m[1]);
}

// No per-test budget is declared here on purpose. Each case spawns child
// `bun test` runs that measure ~0.2-2.5s, and the suite runner already hands
// every file a 30s per-test timeout (run-tests.ts) — the band chosen for
// exactly this spawn-heavy shape. Declaring another one would add a timing
// sink the test-time-factor guard would then have to carry as a waiver, for a
// budget the runner already provides.

describe("#3280 a directly-run test file reports its own result", () => {
  test("t507 alone: the run ends with a summary instead of a silent teardown", () => {
    const run = runDirect([T507]);
    // Pre-fix this output is exactly 4 lines — the banner, the file header, the
    // refusal JSON — and then the process is gone.
    expect(run.output, run.output).toMatch(SUMMARY);
  });

  test("t507 alone is standalone-green (the #698 contract)", () => {
    const run = runDirect([T507]);
    expect(run.output, run.output).toContain("0 fail");
    expect(run.status, run.output).toBe(0);
  });

  test("t33 alone is standalone-green (the second file #3280 names)", () => {
    const run = runDirect([T33]);
    expect(run.output, run.output).toContain("0 fail");
    expect(run.status, run.output).toBe(0);
  });

  // Without this the exit trap would be unexercised: the guard default above
  // means no refusal fires in normal operation, so nothing would prove the trap
  // is live rather than dead code. Forcing the guard ON re-arms the exact path
  // #3280 reported. `??=` cannot overwrite a value that is already defined, so
  // "0" reaches humanPresenceGuardDisabled() and enables real enforcement.
  test("a real refusal becomes a legible failure, not a silent teardown", () => {
    const run = runDirect([T507], { AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "0" });
    // It must still FAIL — the refusal is genuine and must not be swallowed.
    expect(run.status, run.output).not.toBe(0);
    // ...but as a reported test failure, with the summary the runner owes us.
    expect(run.output, run.output).toMatch(SUMMARY);
    expect(run.output, run.output).toContain("exited 1 instead of returning");
  });
});

describe("#3280 a co-run file's results are not lost", () => {
  test("a combined run reports every test both files report alone", () => {
    // Pre-fix the presence-guard file — 6 passing tests on its own — contributed
    // NOTHING here: t507's process.exit killed the shared runner before any
    // summary was printed, so this run's total was not merely wrong, it was
    // absent. Comparing against the solo totals states the invariant without
    // freezing either file's test count.
    const guardAlone = reportedTests(runDirect([PRESENCE_GUARD]));
    const t507Alone = reportedTests(runDirect([T507]));

    const combined = runDirect([PRESENCE_GUARD, T507]);
    expect(reportedTests(combined), combined.output).toBe(guardAlone + t507Alone);
    expect(combined.output, combined.output).toMatch(/across 2 files/);
    expect(combined.output, combined.output).toContain("0 fail");
    expect(combined.status, combined.output).toBe(0);
  });
});
