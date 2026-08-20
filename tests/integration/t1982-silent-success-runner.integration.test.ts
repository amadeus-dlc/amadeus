// covers: #1982 -- the three silent-success gates driven END TO END through the
// REAL tests/run-tests.ts, not through the pure seams (those are pinned by
// tests/unit/t1982-silent-success-gates.test.ts). Each case plants a fixture
// test file that exhibits exactly one silent-success shape, runs the runner
// over it, and asserts on the runner's own observable surface: the per-file
// GATE lines inside the "=== START/DONE ===" block, the file's PASS/FAIL
// marker, the SUMMARY counts, and the process exit code -- which is the
// runner's load-bearing "exit == number of failed files" contract.
//
// WHY A SCRATCH REPO RATHER THAN PLANTING INTO tests/<level>/.
// The runner discovers test files under <its own dir>/<level>/, so t05 plants
// fixtures directly into this repository's tests/integration/ and removes them
// in a finally. That works, but a crashed run leaves live fixtures in the tree,
// and the fixtures here deliberately misbehave (one leaks a process, one never
// asserts) -- exactly the files that must never be discoverable by a real run.
// So each case builds a throwaway repo under the OS tempdir: a real COPY of
// run-tests.ts (so import.meta.url resolves the runner's SCRIPT_DIR/REPO_ROOT
// into the scratch tree instead of this one), a symlink to the real tests/lib
// so the runner's imports resolve to the code under test, a non-empty dist/ to
// satisfy the build-before-test precondition, and a tests/unit/ holding only
// the planted fixture. The runner binary that executes is byte-identical to the
// committed one, copied fresh on every case.
//
// Everything is driven at the --unit level on purpose: it is the only level
// with needsLlm=false, so no case here can touch the Claude substrate gate.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";
import {
  defaultProcessScanIo,
  leakMarker,
  loadBaseline,
  runPsWithEnvironment,
  scanForMarkedProcesses,
} from "../lib/silent-success.ts";
import { scaleTestTime } from "../lib/test-time-factor.ts";

// The leak gate is scan-less on win32 by design (no cheap process-environment
// read), and the leak fixtures need POSIX `sleep`/`true`, so the process-leak
// cases are skipped there. Each skipped name is registered in
// tests/.silent-success-baseline.json -- the gate's own ledger discipline.
const IS_WIN = process.platform === "win32";

const REAL_TESTS_DIR = join(REPO_ROOT, "tests");
const REAL_RUNNER_TS = join(REAL_TESTS_DIR, "run-tests.ts");
const REAL_LIB_DIR = join(REAL_TESTS_DIR, "lib");

// Cold `bun test` compilation of the runner plus its lib graph dominates every
// case; the leak case additionally pays the 2s detection grace window.
const PER_TEST_TIMEOUT = 120_000;

const scratchRoots: string[] = [];

afterAll(() => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true });
});

interface ScratchRepo {
  readonly root: string;
  readonly runnerPath: string;
}

/**
 * Build a throwaway repository the real runner can be pointed at.
 * `baseline` is written verbatim (so a malformed document can be planted);
 * `null` omits the file entirely, which the runner must read as "no exemptions".
 */
function makeScratchRepo(fixtures: Record<string, string>, baseline: string | null): ScratchRepo {
  const root = mkdtempSync(join(tmpdir(), "t1982-silent-success-"));
  scratchRoots.push(root);

  const testsDir = join(root, "tests");
  mkdirSync(join(testsDir, "unit"), { recursive: true });
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "dist", "built-marker"), "fixture distribution\n", "utf8");

  copyFileSync(REAL_RUNNER_TS, join(testsDir, "run-tests.ts"));
  // A symlink, not a copy: the runner's whole lib graph (including the gate
  // module under test) must be the real one, and a copy would silently pin a
  // stale snapshot of it.
  symlinkSync(REAL_LIB_DIR, join(testsDir, "lib"));
  if (baseline !== null) {
    writeFileSync(join(testsDir, ".silent-success-baseline.json"), baseline, "utf8");
  }
  for (const [name, source] of Object.entries(fixtures)) {
    writeFileSync(join(testsDir, "unit", name), source, "utf8");
  }
  return { root, runnerPath: join(testsDir, "run-tests.ts") };
}

interface RunResult {
  readonly status: number;
  readonly out: string;
}

/**
 * Run the scratch runner. The gate environment is scrubbed before the
 * overrides are applied: this file is itself executed by a runner that may have
 * a mode set, and an inherited AMADEUS_SILENT_SUCCESS_GATE would silently
 * rewrite what every case below is asserting.
 */
function runScratchRunner(repo: ScratchRepo, overrides: Record<string, string>): RunResult {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.AMADEUS_SILENT_SUCCESS_GATE;
  delete env.AMADEUS_SILENT_SUCCESS_LEAK;
  delete env.GITHUB_ACTIONS;
  Object.assign(env, overrides);

  const res = spawnSync(process.execPath, [repo.runnerPath, "--unit", "-P", "1"], {
    cwd: repo.root,
    encoding: "utf-8",
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function baselineDoc(sections: {
  zeroAssertion?: unknown[];
  skips?: unknown[];
  leaks?: unknown[];
}): string {
  return JSON.stringify({
    schemaVersion: 1,
    zeroAssertion: sections.zeroAssertion ?? [],
    skips: sections.skips ?? [],
    leaks: sections.leaks ?? [],
  });
}

const EMPTY_BASELINE_DOC = baselineDoc({});

// A file that runs a testcase and evaluates no assertion: bun reports it as a
// pass, and nothing about it could ever fail.
const ZERO_ASSERTION_FIXTURE = [
  'import { test } from "bun:test";',
  "",
  'test("computes something and checks nothing", () => {',
  "  const doubled = 21 * 2;",
  "  if (doubled < 0) throw new Error(\"unreachable\");",
  "});",
  "",
].join("\n");

const SKIP_FIXTURE = [
  'import { expect, test } from "bun:test";',
  "",
  'test.skip("the case that never runs", () => {',
  "  expect(1).toBe(2);",
  "});",
  "",
  'test("the case that does run", () => {',
  "  expect(1).toBe(1);",
  "});",
  "",
].join("\n");

// The #1811 reproduction shape: a detached, unref'd child that outlives the
// test file. `sleep` is long enough to still be running when the runner scans,
// and bounded so an interrupted run cannot strand it for long.
const LEAK_FIXTURE = [
  'import { expect, test } from "bun:test";',
  "",
  'test("spawns a child and walks away", () => {',
  '  const child = Bun.spawn(["sleep", "120"], {',
  "    env: { ...process.env },",
  '    stdio: ["ignore", "ignore", "ignore"],',
  "  });",
  "  child.unref();",
  '  console.log("PLANTED_PID=" + child.pid);',
  "  expect(child.pid).toBeGreaterThan(0);",
  "});",
  "",
].join("\n");

function fileVerdict(out: string, base: string): string | null {
  const line = out.split("\n").find((l) => l.startsWith(`=== DONE ${base} (`));
  return line === undefined ? null : (line.match(/\((PASS|FAIL|SKIP)\)/)?.[1] ?? null);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe("t1982 gate 1: zero-assertion, end to end", () => {
  test("a file that asserts nothing fails the run and is counted as one failed file", () => {
    const repo = makeScratchRepo({ "t1-zero.test.ts": ZERO_ASSERTION_FIXTURE }, EMPTY_BASELINE_DOC);
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("GATE zero-assertion: tests/unit/t1-zero.test.ts ran 1 testcase(s) and evaluated 0 assertions");
    expect(fileVerdict(r.out, "t1-zero.test.ts")).toBe("FAIL");
    expect(r.out).toContain("Failed files: 1");
    expect(r.out).toContain("RESULT: FAIL");
    // The exit code is the failed-FILE count, so the gate must add exactly one.
    expect(r.status).toBe(1);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("bun itself still reports the file as a pass -- the gate is the only thing that catches it", () => {
    const repo = makeScratchRepo({ "t1-zero.test.ts": ZERO_ASSERTION_FIXTURE }, EMPTY_BASELINE_DOC);
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "off" });

    expect(r.out).toContain("1 pass");
    expect(r.out).not.toContain("GATE zero-assertion");
    expect(fileVerdict(r.out, "t1-zero.test.ts")).toBe("PASS");
    expect(r.status).toBe(0);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("the // assertion-free marker exempts the same fixture", () => {
    const repo = makeScratchRepo(
      {
        "t1-zero.test.ts": `// assertion-free: structural guard, an import throw is the failure\n${ZERO_ASSERTION_FIXTURE}`,
      },
      EMPTY_BASELINE_DOC,
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("exempt via marker -- structural guard, an import throw is the failure");
    expect(fileVerdict(r.out, "t1-zero.test.ts")).toBe("PASS");
    expect(r.status).toBe(0);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("a baseline entry exempts the same fixture and prints its issue", () => {
    const repo = makeScratchRepo(
      { "t1-zero.test.ts": ZERO_ASSERTION_FIXTURE },
      baselineDoc({
        zeroAssertion: [
          { file: "tests/unit/t1-zero.test.ts", reason: "pre-existing debt", issue: "#1982" },
        ],
      }),
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("exempt via baseline -- pre-existing debt (#1982)");
    expect(fileVerdict(r.out, "t1-zero.test.ts")).toBe("PASS");
    expect(r.status).toBe(0);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("report mode prints the identical finding without flipping the file", () => {
    const repo = makeScratchRepo({ "t1-zero.test.ts": ZERO_ASSERTION_FIXTURE }, EMPTY_BASELINE_DOC);
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "report" });

    expect(r.out).toContain("GATE zero-assertion: tests/unit/t1-zero.test.ts");
    expect(fileVerdict(r.out, "t1-zero.test.ts")).toBe("PASS");
    expect(r.out).toContain("RESULT: PASS");
    expect(r.status).toBe(0);
  }, scaleTestTime(PER_TEST_TIMEOUT));
});

describe("t1982 gate 2: chronic self-SKIP, end to end", () => {
  test("an unregistered self-skip fails the run and names the testcase", () => {
    const repo = makeScratchRepo({ "t2-skip.test.ts": SKIP_FIXTURE }, EMPTY_BASELINE_DOC);
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("GATE skip: tests/unit/t2-skip.test.ts self-skipped 1 testcase(s)");
    expect(r.out).toContain('"the case that never runs" -- UNREGISTERED');
    expect(fileVerdict(r.out, "t2-skip.test.ts")).toBe("FAIL");
    expect(r.status).toBe(1);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("a live ledger entry passes, and the census carries the counter evidence", () => {
    const repo = makeScratchRepo(
      { "t2-skip.test.ts": SKIP_FIXTURE },
      baselineDoc({
        skips: [
          {
            file: "tests/unit/t2-skip.test.ts",
            test: "the case that never runs",
            reason: "substrate unavailable in this environment",
            issue: "#1982",
            firstObserved: "2026-08-20",
            // Far enough out that this test does not become a time bomb; the
            // expiry ARM is proven by the expired case below.
            expires: "2099-01-01",
          },
        ],
      }),
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(fileVerdict(r.out, "t2-skip.test.ts")).toBe("PASS");
    expect(r.status).toBe(0);
    expect(r.out).toContain("self-skipped tests: 1 distinct case(s) this run");
    const census = r.out
      .split("\n")
      .find((l) => l.includes("tests/unit/t2-skip.test.ts :: the case that never runs"));
    expect(census).toBeDefined();
    expect(census).toContain("(x1)");
    expect(census).toContain("registered");
    expect(census).toContain("expires=2099-01-01");
    expect(census).toMatch(/age=\d+d/);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("an expired ledger entry fails the run and says so", () => {
    const repo = makeScratchRepo(
      { "t2-skip.test.ts": SKIP_FIXTURE },
      baselineDoc({
        skips: [
          {
            file: "tests/unit/t2-skip.test.ts",
            test: "*",
            reason: "was time-boxed, and the box ran out",
            issue: "#1982",
            firstObserved: "2020-01-01",
            expires: "2020-04-01",
          },
        ],
      }),
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("ledger entry EXPIRED on 2020-04-01");
    expect(fileVerdict(r.out, "t2-skip.test.ts")).toBe("FAIL");
    expect(r.status).toBe(1);
    expect(r.out).toContain("EXPIRED age=");
  }, scaleTestTime(PER_TEST_TIMEOUT));
});

describe.skipIf(IS_WIN)("t1982 gate 3: process leak, end to end", () => {
  test("a leaked child fails the run, is named by pid, and is actually reaped", () => {
    const repo = makeScratchRepo({ "t3-leak.test.ts": LEAK_FIXTURE }, EMPTY_BASELINE_DOC);
    // Default mode, plus the explicit leak override: this proves the documented
    // escape from the "Linux CI only" default, which is the only way the gate's
    // failing arm is reachable on a macOS developer machine.
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_LEAK: "fail" });

    const planted = Number(r.out.match(/PLANTED_PID=(\d+)/)?.[1] ?? "0");
    try {
      expect(planted).toBeGreaterThan(0);
      expect(r.out).toContain(
        "GATE process-leak: tests/unit/t3-leak.test.ts left 1 process(es) running after the test file exited",
      );
      expect(r.out).toContain(`pid ${planted}:`);
      expect(r.out).toContain("reaped 1 of 1 (SIGKILL)");
      expect(fileVerdict(r.out, "t3-leak.test.ts")).toBe("FAIL");
      expect(r.status).toBe(1);
      // The reap is the half of the gate that stops #1811-style accumulation:
      // detecting a leak and leaving it running would fix nothing.
      expect(isAlive(planted)).toBe(false);
    } finally {
      if (planted > 0 && isAlive(planted)) process.kill(planted, "SIGKILL");
    }
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("a baselined leak still gets reaped and reported, but does not fail the run", () => {
    const repo = makeScratchRepo(
      { "t3-leak.test.ts": LEAK_FIXTURE },
      baselineDoc({
        leaks: [
          { file: "tests/unit/t3-leak.test.ts", reason: "known orphan, tracked", issue: "#1982" },
        ],
      }),
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_LEAK: "fail" });

    const planted = Number(r.out.match(/PLANTED_PID=(\d+)/)?.[1] ?? "0");
    try {
      expect(r.out).toContain("GATE process-leak: tests/unit/t3-leak.test.ts left 1 process(es)");
      expect(r.out).toContain("reaped 1 of 1 (SIGKILL)");
      expect(fileVerdict(r.out, "t3-leak.test.ts")).toBe("PASS");
      expect(r.status).toBe(0);
      expect(isAlive(planted)).toBe(false);
    } finally {
      if (planted > 0 && isAlive(planted)) process.kill(planted, "SIGKILL");
    }
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("a well-behaved file produces no leak output at all", () => {
    const repo = makeScratchRepo(
      {
        "t3-clean.test.ts": [
          'import { expect, test } from "bun:test";',
          "",
          'test("spawns and waits", async () => {',
          '  const child = Bun.spawn(["true"], { stdio: ["ignore", "ignore", "ignore"] });',
          "  await child.exited;",
          "  expect(child.exitCode).toBe(0);",
          "});",
          "",
        ].join("\n"),
      },
      EMPTY_BASELINE_DOC,
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_LEAK: "fail" });

    expect(r.out).not.toContain("GATE process-leak");
    expect(fileVerdict(r.out, "t3-clean.test.ts")).toBe("PASS");
    expect(r.status).toBe(0);
  }, scaleTestTime(PER_TEST_TIMEOUT));
});

describe("t1982 baseline handling, end to end", () => {
  test("a malformed baseline stops the run loudly instead of gating nothing", () => {
    const repo = makeScratchRepo({ "t4-ok.test.ts": SKIP_FIXTURE }, "{ this is not json");
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("ERROR: tests/.silent-success-baseline.json is unusable");
    expect(r.out).toContain("not valid JSON");
    // Exit 2 is the runner's existing "refused to start" code (bad --filter,
    // failed claude gate); no test file ran, so the failed-file contract is
    // untouched.
    expect(r.status).toBe(2);
    expect(r.out).not.toContain("RESULT:");
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("a baseline with an unknown schemaVersion also stops the run", () => {
    const repo = makeScratchRepo(
      { "t4-ok.test.ts": SKIP_FIXTURE },
      JSON.stringify({ schemaVersion: 99, zeroAssertion: [], skips: [], leaks: [] }),
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    expect(r.out).toContain("schemaVersion must be 1");
    expect(r.status).toBe(2);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("a MISSING baseline is an empty baseline, not a broken one", () => {
    const repo = makeScratchRepo({ "t4-skip.test.ts": SKIP_FIXTURE }, null);
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "strict" });

    // No exemptions exist, so the unregistered skip fires -- proving the run
    // proceeded with an empty ledger rather than refusing to start.
    expect(r.out).not.toContain("is unusable");
    expect(r.out).toContain('"the case that never runs" -- UNREGISTERED');
    expect(r.status).toBe(1);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("the escape hatch disables every gate and the mode banner reflects it", () => {
    const repo = makeScratchRepo(
      { "t5-zero.test.ts": ZERO_ASSERTION_FIXTURE, "t5-skip.test.ts": SKIP_FIXTURE },
      "{ this is not json",
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "off" });

    // Even the fail-closed baseline load is skipped: with every gate off there
    // is nothing for the baseline to feed.
    expect(r.out).not.toContain("is unusable");
    expect(r.out).not.toContain("Silent-success gates:");
    expect(r.out).not.toContain("GATE ");
    expect(r.out).toContain("RESULT: PASS");
    expect(r.status).toBe(0);
  }, scaleTestTime(PER_TEST_TIMEOUT));

  test("the mode banner reports the resolved per-gate modes", () => {
    const repo = makeScratchRepo(
      {
        "t6-plain.test.ts": [
          'import { expect, test } from "bun:test";',
          "",
          'test("a perfectly ordinary passing test", () => {',
          "  expect(1).toBe(1);",
          "});",
          "",
        ].join("\n"),
      },
      EMPTY_BASELINE_DOC,
    );
    const r = runScratchRunner(repo, { AMADEUS_SILENT_SUCCESS_GATE: "report" });

    expect(r.out).toContain("Silent-success gates: zero-assertion=report skip=report leak=report");
  }, scaleTestTime(PER_TEST_TIMEOUT));
});

// The lib's real I/O seams, driven IN PROCESS. The scratch-runner cases above
// execute them too, but only inside a spawned child, which the coverage run
// cannot attribute; these calls make the same arms measurable.
describe("t1982 lib I/O seams, in process", () => {
  test("loadBaseline reads and validates a real file", () => {
    const dir = mkdtempSync(join(tmpdir(), "t1982-baseline-"));
    scratchRoots.push(dir);
    const path = join(dir, "baseline.json");
    writeFileSync(
      path,
      baselineDoc({
        zeroAssertion: [{ file: "tests/unit/a.test.ts", reason: "debt", issue: "#1982" }],
      }),
      "utf8",
    );
    const loaded = loadBaseline(path);
    expect(loaded.kind).toBe("loaded");
    if (loaded.kind === "loaded") {
      expect(loaded.doc.zeroAssertion).toEqual([
        { file: "tests/unit/a.test.ts", reason: "debt", issue: "#1982" },
      ]);
    }
  });

  test("loadBaseline fails closed when the path exists but cannot be read as a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "t1982-baseline-dir-"));
    scratchRoots.push(dir);
    // A directory passes existsSync but readFileSync throws (EISDIR): the
    // "could not be read" arm, distinct from both "missing" and "malformed".
    const loaded = loadBaseline(dir);
    expect(loaded.kind).toBe("failed");
    if (loaded.kind === "failed") expect(loaded.detail).toContain("could not be read");
  });

  test.skipIf(IS_WIN)("runPsWithEnvironment returns this user's process table", () => {
    const out = runPsWithEnvironment();
    expect(out).not.toBeNull();
    // Our own bun process is one of this user's processes.
    expect(out).toContain(String(process.pid));
  });

  test("defaultProcessScanIo exposes the real platform reads", () => {
    const io = defaultProcessScanIo();
    expect(io.selfPid).toBe(process.pid);
    if (process.platform === "linux") {
      expect(io.listProc()).toContain(String(process.pid));
      expect(io.readEnviron(process.pid) ?? "").toContain("PATH=");
      expect(io.readCmdline(process.pid)).not.toBeNull();
    } else {
      // No /proc: every read degrades to "nothing", never to a throw.
      expect(io.listProc()).toEqual([]);
      expect(io.readEnviron(process.pid)).toBeNull();
      expect(io.readCmdline(process.pid)).toBeNull();
    }
  });

  test.skipIf(IS_WIN)(
    "the real platform scan finds a marked child and stops finding it once it exits",
    async () => {
      // A probe basename no real test file carries, so a concurrently running
      // suite can never collide with this scan.
      const probeBase = `zz-t1982-probe-${process.pid}.test.ts`;
      const marker = leakMarker(probeBase);
      const io = defaultProcessScanIo();
      const child = Bun.spawn(["sleep", "30"], {
        env: { ...process.env, AMADEUS_TEST_NAME: probeBase },
        stdio: ["ignore", "ignore", "ignore"],
      });
      try {
        const found = scanForMarkedProcesses(marker, io);
        expect(found.map((p) => p.pid)).toContain(child.pid);
      } finally {
        child.kill("SIGKILL");
      }
      await child.exited;
      // The table read can lag the exit by a beat; poll briefly.
      const deadline = Date.now() + scaleTestTime(5000);
      let still = scanForMarkedProcesses(marker, io);
      while (still.some((p) => p.pid === child.pid) && Date.now() < deadline) {
        await Bun.sleep(100);
        still = scanForMarkedProcesses(marker, io);
      }
      expect(still.map((p) => p.pid)).not.toContain(child.pid);
    },
    scaleTestTime(30_000),
  );
});
